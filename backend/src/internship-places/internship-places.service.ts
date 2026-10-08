import { Injectable } from '@nestjs/common';
import { InternshipPlace, PlaceReview, Prisma } from '../../generated/prisma/client';
import { CoreHubIdentity } from '../auth/core-hub-identity';
import { Permission, can } from '../auth/permissions';
import { AppException } from '../common/errors';
import { PeopleService } from '../core-hub/people.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateReportDto, QueryReportsDto, SetReviewVisibilityDto, SetVerificationDto } from './dto/moderation.dto';
import { PlaceContactDto } from './dto/place-contact.dto';
import { QueryPlacesDto } from './dto/query-places.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import {
  MyReviewDto,
  PlaceDetailDto,
  PlaceSummaryDto,
  PlaceTagDto,
  ProvinceDto,
  ReviewReportViewDto,
  ReviewViewDto,
} from './dto/place-responses';
import { PLACE_TAGS, isPresetTag, normalizeTags, tagMatchKey } from './tags';
import {
  MJU_LOCATION,
  ScoreStats,
  averageScore,
  currentBuddhistYear,
  distanceKm,
  overallMean,
  placeNameKey,
  rankScore,
} from './place-scoring';

export type PlaceSummary = PlaceSummaryDto;
export type ReviewView = ReviewViewDto;
export type PlaceDetail = PlaceDetailDto;

type ReviewScore = Pick<PlaceReview, 'placeId' | 'score'>;

interface Ranking {
  statsOf(placeId: string): ScoreStats;
  /** Place id -> position in the whole directory (1 = best). */
  ranks: Map<string, number>;
}

/** What the caller knows about reports on the reviews being shown. */
interface ReportContext {
  /** Reviews the caller has an open report on. */
  reportedByMe: Set<string>;
  /** Review id -> open reports; filled for moderators only. */
  openCounts?: Map<string, number>;
}

/** Only reviews nobody hid count in scores, rankings and search. */
const VISIBLE = { isHidden: false } as const;

/**
 * Internship places and their reviews.
 *
 * A review records who wrote it as Core Hub ids only (reference-data.md 8):
 * `coreUserId` from the token and `personCode` from Core Hub when it is
 * written. Names and emails are never stored or returned.
 *
 * Average, rank and filters on them are computed here rather than in SQL: the
 * directory holds hundreds of places, and the ranking needs every review's
 * score anyway (its prior is the mean of the whole directory).
 *
 * A review a moderator hid stays in the database for the record but counts in
 * no score; only its author and moderators still see it.
 */
@Injectable()
export class InternshipPlacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly people: PeopleService,
  ) {}

  async findAll(query: QueryPlacesDto): Promise<{ items: PlaceSummary[]; total: number }> {
    const [places, scores] = await Promise.all([
      this.prisma.internshipPlace.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.placeReview.findMany({ where: VISIBLE, select: { placeId: true, score: true } }),
    ]);

    // Ranked over the whole directory, before any filter, so a place keeps its rank.
    const tagKey = query.tag ? tagMatchKey(query.tag) : '';
    const ranking = this.ranking(places, scores);
    const near =
      query.nearLat !== undefined && query.nearLng !== undefined
        ? { latitude: query.nearLat, longitude: query.nearLng }
        : MJU_LOCATION;

    let items = places
      .filter((place) => !query.province || place.province === query.province)
      .filter((place) => query.allowance !== 'paid' || place.dailyAllowanceSatang > 0)
      .filter((place) => query.allowance !== 'free' || place.dailyAllowanceSatang === 0)
      .filter((place) => !tagKey || place.tags.some((tag) => tagMatchKey(tag) === tagKey))
      .filter((place) => !query.verified || place.isVerified)
      .map((place) => this.summarize(place, ranking, near));

    if (query.q) {
      const needle = query.q.trim().toLowerCase();
      const matchingByComment = await this.placeIdsWithCommentMatching(needle);
      items = items.filter(
        (item) =>
          [item.name, item.province, item.notes, item.workHours ?? '']
            .join(' ')
            .toLowerCase()
            .includes(needle) || matchingByComment.has(item.id),
      );
    }
    if (query.minRating) {
      const min = query.minRating;
      items = items.filter((item) => item.averageScore >= min);
    }

    items.sort(this.comparator(query.sort ?? 'rank'));

    const total = items.length;
    return { items: items.slice(query.skip, query.skip + query.take), total };
  }

  /**
   * Preset fields of work, then the ones users added, each with how many
   * places list it - the add-place form offers them, the list filters by them.
   */
  async listTags(): Promise<PlaceTagDto[]> {
    const places = await this.prisma.internshipPlace.findMany({ select: { tags: true } });
    const counts = new Map<string, { label: string; count: number }>();
    for (const { tags } of places) {
      for (const tag of tags) {
        const key = tagMatchKey(tag);
        const entry = counts.get(key) ?? { label: tag, count: 0 };
        entry.count += 1;
        counts.set(key, entry);
      }
    }

    const preset = PLACE_TAGS.map((tag) => ({
      key: tag.key,
      label: tag.label,
      preset: true,
      placeCount: counts.get(tag.key)?.count ?? 0,
    }));
    const custom = [...counts.values()]
      .filter((entry) => !isPresetTag(entry.label))
      .map((entry) => ({ key: entry.label, label: entry.label, preset: false, placeCount: entry.count }))
      .sort((a, b) => b.placeCount - a.placeCount || a.label.localeCompare(b.label, 'th'));
    return [...preset, ...custom];
  }

  /** Provinces that already have places, most used first - quick picks on the add-place form. */
  async listProvinces(): Promise<ProvinceDto[]> {
    const places = await this.prisma.internshipPlace.findMany({ select: { province: true } });
    const counts = new Map<string, number>();
    for (const { province } of places) counts.set(province, (counts.get(province) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, placeCount]) => ({ name, placeCount }))
      .sort((a, b) => b.placeCount - a.placeCount || a.name.localeCompare(b.name, 'th'));
  }

  /** The caller's own reviews, newest first, hidden ones included - empty for a role that cannot review. */
  async listMyReviews(user: CoreHubIdentity): Promise<MyReviewDto[]> {
    const [reviews, places] = await Promise.all([
      this.prisma.placeReview.findMany({ where: { coreUserId: user.id }, orderBy: { createdAt: 'desc' } }),
      this.prisma.internshipPlace.findMany({ select: { id: true, name: true, province: true } }),
    ]);
    const byId = new Map(places.map((place) => [place.id, place]));
    // Nobody reports their own review, so there is nothing to look up.
    const context: ReportContext = { reportedByMe: new Set() };
    return reviews.flatMap((review) => {
      const place = byId.get(review.placeId);
      if (!place) return [];
      return [{ ...this.reviewView(user, review, context), placeId: place.id, placeName: place.name, placeProvince: place.province }];
    });
  }

  async findOne(user: CoreHubIdentity, id: string): Promise<PlaceDetail> {
    const place = await this.load(id);
    const [places, scores, reviews] = await Promise.all([
      this.prisma.internshipPlace.findMany({ select: { id: true, name: true } }),
      this.prisma.placeReview.findMany({ where: VISIBLE, select: { placeId: true, score: true } }),
      this.prisma.placeReview.findMany({ where: { placeId: id }, orderBy: { createdAt: 'desc' } }),
    ]);

    const summary = this.summarize(place, this.ranking(places, scores), MJU_LOCATION);
    const scoreDistribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const review of reviews.filter((review) => !review.isHidden)) {
      scoreDistribution[String(review.score) as keyof typeof scoreDistribution] += 1;
    }
    const mine = reviews.find((review) => review.coreUserId === user.id);

    const moderator = can(user.subsystemRole, Permission.REVIEW_MODERATE);
    const shown = reviews.filter((review) => !review.isHidden || moderator || review.coreUserId === user.id);
    const context = await this.reportContext(user, shown.map((review) => review.id));

    return {
      ...summary,
      scoreDistribution,
      reviews: shown.map((review) => this.reviewView(user, review, context)),
      myReviewId: mine?.id ?? null,
    };
  }

  async create(user: CoreHubIdentity, dto: CreatePlaceDto): Promise<PlaceDetail> {
    const name = this.requireText(dto.name, 2, 'ชื่อสถานที่');
    const notes = this.requireText(dto.notes, 5, 'ข้อควรระวัง/สวัสดิการ');
    const nameKey = this.nameKeyOf(name);
    await this.assertNameFree(nameKey);
    const contact = this.cleanContact(dto);

    const place = await this.prisma.internshipPlace.create({
      data: {
        name,
        nameKey,
        province: this.cleanProvince(dto.province),
        latitude: dto.latitude,
        longitude: dto.longitude,
        dailyAllowanceSatang: dto.dailyAllowanceSatang ?? 0,
        workHours: dto.workHours?.trim() || null,
        notes,
        tags: normalizeTags(dto.tags ?? []),
        websiteUrl: contact.websiteUrl ?? null,
        contactPhone: contact.contactPhone ?? null,
        applyEmail: contact.applyEmail ?? null,
        intakePeriod: contact.intakePeriod ?? null,
        createdByCoreUserId: user.id,
      },
    });
    return this.findOne(user, place.id);
  }

  async update(user: CoreHubIdentity, id: string, dto: UpdatePlaceDto): Promise<PlaceDetail> {
    await this.load(id);

    const data: Prisma.InternshipPlaceUpdateInput = {};
    if (dto.name !== undefined) {
      const name = this.requireText(dto.name, 2, 'ชื่อสถานที่');
      const nameKey = this.nameKeyOf(name);
      await this.assertNameFree(nameKey, id);
      data.name = name;
      data.nameKey = nameKey;
    }
    if (dto.province !== undefined) data.province = this.cleanProvince(dto.province);
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;
    if (dto.dailyAllowanceSatang !== undefined) data.dailyAllowanceSatang = dto.dailyAllowanceSatang;
    if (dto.workHours !== undefined) data.workHours = dto.workHours.trim() || null;
    if (dto.notes !== undefined) data.notes = this.requireText(dto.notes, 5, 'ข้อควรระวัง/สวัสดิการ');
    if (dto.tags !== undefined) data.tags = normalizeTags(dto.tags);
    Object.assign(data, this.cleanContact(dto));

    await this.prisma.internshipPlace.update({ where: { id }, data });
    return this.findOne(user, id);
  }

  /** Staff give the "verified" badge, or take it back. */
  async setVerification(user: CoreHubIdentity, id: string, dto: SetVerificationDto): Promise<PlaceDetail> {
    await this.load(id);
    await this.prisma.internshipPlace.update({
      where: { id },
      data: dto.isVerified
        ? { isVerified: true, verifiedAt: new Date(), verifiedByCoreUserId: user.id }
        : { isVerified: false, verifiedAt: null, verifiedByCoreUserId: null },
    });
    return this.findOne(user, id);
  }

  /** Removes the place, every review of it and their reports. */
  async remove(id: string): Promise<{ id: string; deleted: true }> {
    await this.load(id);
    const reviews = await this.prisma.placeReview.findMany({ where: { placeId: id }, select: { id: true } });
    await this.prisma.$transaction([
      this.prisma.reviewReport.deleteMany({ where: { reviewId: { in: reviews.map((review) => review.id) } } }),
      this.prisma.placeReview.deleteMany({ where: { placeId: id } }),
      this.prisma.internshipPlace.delete({ where: { id } }),
    ]);
    return { id, deleted: true };
  }

  async addReview(
    user: CoreHubIdentity,
    placeId: string,
    dto: CreateReviewDto,
    token: string,
  ): Promise<ReviewView> {
    await this.load(placeId);
    this.assertYear(dto.internshipYear);

    // Personal data is never cached: asked now, with the reviewer's own token -
    // before the transaction, so no lock is held during the call to Core Hub.
    const personCode = await this.people.myPersonCode(token);

    // One review per person per place without a unique key (core_user_id stays
    // non-unique, reference-data.md 8): a transaction-scoped advisory lock on
    // place + person makes a double submit wait, then find the first review.
    const lockKey = `${placeId}:${user.id}`;
    const review = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      const existing = await tx.placeReview.findFirst({
        where: { placeId, coreUserId: user.id },
      });
      if (existing) {
        throw AppException.conflict('คุณรีวิวสถานที่นี้แล้ว แก้ไขรีวิวเดิมแทนได้', {
          reviewId: existing.id,
        });
      }
      return tx.placeReview.create({
        data: {
          placeId,
          coreUserId: user.id,
          personCode,
          score: dto.score,
          comment: dto.comment?.trim() || null,
          position: dto.position?.trim() || null,
          internshipYear: dto.internshipYear ?? null,
        },
      });
    });
    return this.reviewView(user, review, await this.reportContext(user, [review.id]));
  }

  /** Only the author edits a review - moderators remove, they do not rewrite. */
  async updateReview(
    user: CoreHubIdentity,
    placeId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<ReviewView> {
    const review = await this.loadReview(placeId, reviewId);
    if (review.coreUserId !== user.id) {
      throw AppException.forbidden('แก้ไขได้เฉพาะรีวิวของตัวเอง');
    }
    this.assertYear(dto.internshipYear);

    const data: Prisma.PlaceReviewUpdateInput = {};
    if (dto.score !== undefined) data.score = dto.score;
    if (dto.comment !== undefined) data.comment = dto.comment.trim() || null;
    if (dto.position !== undefined) data.position = dto.position.trim() || null;
    if (dto.internshipYear !== undefined) data.internshipYear = dto.internshipYear;

    const updated = await this.prisma.placeReview.update({ where: { id: reviewId }, data });
    return this.reviewView(user, updated, await this.reportContext(user, [reviewId]));
  }

  /** The author removes their own review; staff may remove anyone's. Its reports go with it. */
  async removeReview(
    user: CoreHubIdentity,
    placeId: string,
    reviewId: string,
  ): Promise<{ id: string; deleted: true }> {
    const review = await this.loadReview(placeId, reviewId);
    const isAuthor = review.coreUserId === user.id;
    if (!isAuthor && !can(user.subsystemRole, Permission.REVIEW_DELETE_ANY)) {
      throw AppException.forbidden('ลบได้เฉพาะรีวิวของตัวเอง');
    }
    await this.prisma.$transaction([
      this.prisma.reviewReport.deleteMany({ where: { reviewId } }),
      this.prisma.placeReview.delete({ where: { id: reviewId } }),
    ]);
    return { id: reviewId, deleted: true };
  }

  /**
   * Flag someone else's review. A person has at most one open report per
   * review - the same advisory lock as one review per person per place.
   */
  async reportReview(
    user: CoreHubIdentity,
    placeId: string,
    reviewId: string,
    dto: CreateReportDto,
  ): Promise<ReviewView> {
    const review = await this.loadReview(placeId, reviewId);
    if (review.coreUserId === user.id) {
      throw AppException.badRequest('รายงานรีวิวของตัวเองไม่ได้ ลบหรือแก้ไขแทนได้');
    }
    if (review.isHidden) {
      throw AppException.conflict('รีวิวนี้ถูกซ่อนแล้ว');
    }

    const lockKey = `report:${reviewId}:${user.id}`;
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      const existing = await tx.reviewReport.findFirst({
        where: { reviewId, coreUserId: user.id, status: 'OPEN' },
      });
      if (existing) {
        throw AppException.conflict('คุณรายงานรีวิวนี้แล้ว รอผู้ดูแลตรวจสอบ', { reportId: existing.id });
      }
      await tx.reviewReport.create({
        data: { reviewId, coreUserId: user.id, reason: dto.reason, detail: dto.detail?.trim() || null },
      });
    });
    return this.reviewView(user, review, await this.reportContext(user, [reviewId]));
  }

  /**
   * Hide a review, or show it again. Either way its open reports are settled:
   * ACTION_TAKEN when it is hidden, DISMISSED when it stays.
   */
  async setReviewVisibility(
    user: CoreHubIdentity,
    placeId: string,
    reviewId: string,
    dto: SetReviewVisibilityDto,
  ): Promise<ReviewView> {
    await this.loadReview(placeId, reviewId);
    const now = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.placeReview.update({
        where: { id: reviewId },
        data: dto.isHidden
          ? { isHidden: true, hiddenAt: now, hiddenByCoreUserId: user.id, hiddenReason: dto.reason?.trim() || null }
          : { isHidden: false, hiddenAt: null, hiddenByCoreUserId: null, hiddenReason: null },
      }),
      this.prisma.reviewReport.updateMany({
        where: { reviewId, status: 'OPEN' },
        data: { status: dto.isHidden ? 'ACTION_TAKEN' : 'DISMISSED', resolvedAt: now, resolvedByCoreUserId: user.id },
      }),
    ]);
    return this.reviewView(user, updated, await this.reportContext(user, [reviewId]));
  }

  /** The moderators' queue: reports with one status (OPEN by default), newest first. */
  async listReports(
    user: CoreHubIdentity,
    query: QueryReportsDto,
  ): Promise<{ items: ReviewReportViewDto[]; total: number }> {
    const status = query.status ?? 'OPEN';
    const reports = await this.prisma.reviewReport.findMany({ where: { status }, orderBy: { createdAt: 'desc' } });
    const reviewIds = [...new Set(reports.map((report) => report.reviewId))];
    const reviews = await this.prisma.placeReview.findMany({ where: { id: { in: reviewIds } } });
    const places = await this.prisma.internshipPlace.findMany({
      where: { id: { in: [...new Set(reviews.map((review) => review.placeId))] } },
      select: { id: true, name: true },
    });
    const reviewById = new Map(reviews.map((review) => [review.id, review]));
    const placeName = new Map(places.map((place) => [place.id, place.name]));
    const perReview = new Map<string, number>();
    for (const report of reports) perReview.set(report.reviewId, (perReview.get(report.reviewId) ?? 0) + 1);
    const context = await this.reportContext(user, reviewIds);

    const page = reports.slice(query.skip, query.skip + query.take).flatMap((report) => {
      const review = reviewById.get(report.reviewId);
      if (!review) return [];
      return [
        {
          id: report.id,
          reason: report.reason,
          detail: report.detail,
          status: report.status,
          reviewReportCount: perReview.get(report.reviewId) ?? 1,
          placeId: review.placeId,
          placeName: placeName.get(review.placeId) ?? '',
          review: this.reviewView(user, review, context),
          resolvedAt: report.resolvedAt,
          createdAt: report.createdAt,
        },
      ];
    });
    return { items: page, total: reports.length };
  }

  // ------------------------------------------------------------------ helpers

  /** The DTO checks length before trimming; this checks what is actually stored. */
  private requireText(value: string, min: number, label: string): string {
    const text = value.trim();
    if (text.length < min) {
      throw AppException.badRequest(`${label}ต้องยาวอย่างน้อย ${min} ตัวอักษร (ไม่นับช่องว่าง)`);
    }
    return text;
  }

  /** A name that is only "บริษัท ... จำกัด" words has no key to tell it from others. */
  private nameKeyOf(name: string): string {
    const nameKey = placeNameKey(name);
    if (!nameKey) {
      throw AppException.badRequest('ชื่อสถานที่ต้องมีชื่อบริษัท/หน่วยงาน ไม่ใช่แค่คำว่า บริษัท หรือ จำกัด');
    }
    return nameKey;
  }

  private async load(id: string): Promise<InternshipPlace> {
    const place = await this.prisma.internshipPlace.findUnique({ where: { id } });
    if (!place) {
      throw AppException.notFound('ไม่พบสถานที่ฝึกงานนี้');
    }
    return place;
  }

  private async loadReview(placeId: string, reviewId: string): Promise<PlaceReview> {
    await this.load(placeId);
    const review = await this.prisma.placeReview.findUnique({ where: { id: reviewId } });
    if (!review || review.placeId !== placeId) {
      throw AppException.notFound('ไม่พบรีวิวนี้');
    }
    return review;
  }

  private async assertNameFree(nameKey: string, exceptId?: string): Promise<void> {
    const same = await this.prisma.internshipPlace.findUnique({ where: { nameKey } });
    if (same && same.id !== exceptId) {
      throw AppException.conflict('มีสถานที่นี้ในระบบแล้ว', { placeId: same.id, name: same.name });
    }
  }

  private assertYear(year: number | null | undefined): void {
    if (year != null && year > currentBuddhistYear() + 1) {
      throw AppException.badRequest('internshipYear ต้องไม่เกินปีหน้า');
    }
  }

  private cleanProvince(province: string): string {
    return province.trim().replace(/^จังหวัด\s*/u, '');
  }

  /**
   * The company's contact details in stored form. A field left out stays as it
   * is (absent from the result); an empty text clears it (null).
   */
  private cleanContact(dto: PlaceContactDto): Partial<Record<keyof PlaceContactDto, string | null>> {
    const out: Partial<Record<keyof PlaceContactDto, string | null>> = {};
    const given = (value: string | undefined) => (value === undefined ? undefined : value.trim());

    const website = given(dto.websiteUrl);
    if (website !== undefined) out.websiteUrl = website ? this.cleanWebsite(website) : null;

    const phone = given(dto.contactPhone);
    if (phone !== undefined) {
      // data-dictionary.md 5: phone numbers are stored without hyphens.
      const digits = phone.replace(/[\s\-().]/g, '');
      if (digits && !/^\+?\d{9,15}$/.test(digits)) {
        throw AppException.badRequest('เบอร์ติดต่อต้องเป็นตัวเลข 9-15 หลัก (ขึ้นต้นด้วย + ได้)');
      }
      out.contactPhone = digits || null;
    }

    const email = given(dto.applyEmail);
    if (email !== undefined) {
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw AppException.badRequest('อีเมลรับสมัครไม่ถูกต้อง');
      }
      out.applyEmail = email.toLowerCase() || null;
    }

    const intake = given(dto.intakePeriod);
    if (intake !== undefined) out.intakePeriod = intake || null;
    return out;
  }

  /** http(s) only; "www.example.com" becomes "https://www.example.com". */
  private cleanWebsite(value: string): string {
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
    let url: URL;
    try {
      url = new URL(withScheme);
    } catch {
      throw AppException.badRequest('เว็บไซต์ไม่ถูกต้อง');
    }
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !url.hostname.includes('.')) {
      throw AppException.badRequest('เว็บไซต์ต้องขึ้นต้นด้วย http:// หรือ https://');
    }
    return withScheme;
  }

  /** Which of these reviews the caller reported, and - for moderators - how many open reports each has. */
  private async reportContext(user: CoreHubIdentity, reviewIds: string[]): Promise<ReportContext> {
    if (reviewIds.length === 0) return { reportedByMe: new Set() };
    const open = await this.prisma.reviewReport.findMany({
      where: { reviewId: { in: reviewIds }, status: 'OPEN' },
      select: { reviewId: true, coreUserId: true },
    });
    const context: ReportContext = {
      reportedByMe: new Set(open.filter((report) => report.coreUserId === user.id).map((report) => report.reviewId)),
    };
    if (can(user.subsystemRole, Permission.REVIEW_MODERATE)) {
      context.openCounts = new Map();
      for (const { reviewId } of open) context.openCounts.set(reviewId, (context.openCounts.get(reviewId) ?? 0) + 1);
    }
    return context;
  }

  private async placeIdsWithCommentMatching(needle: string): Promise<Set<string>> {
    const reviews = await this.prisma.placeReview.findMany({
      where: {
        ...VISIBLE,
        OR: [
          { comment: { contains: needle, mode: 'insensitive' } },
          { position: { contains: needle, mode: 'insensitive' } },
        ],
      },
      select: { placeId: true },
    });
    return new Set(reviews.map((review) => review.placeId));
  }

  /** Review count and score sum of every place, and its rank in the whole directory. */
  private ranking(places: Pick<InternshipPlace, 'id' | 'name'>[], scores: ReviewScore[]): Ranking {
    const stats = new Map<string, ScoreStats>();
    for (const { placeId, score } of scores) {
      const entry = stats.get(placeId) ?? { count: 0, sum: 0 };
      entry.count += 1;
      entry.sum += score;
      stats.set(placeId, entry);
    }
    const mean = overallMean([...stats.values()]);
    const statsOf = (id: string) => stats.get(id) ?? { count: 0, sum: 0 };

    // A place without reviews sits at the mean (rankScore with no reviews).
    const ordered = [...places].sort(
      (a, b) =>
        rankScore(statsOf(b.id), mean) - rankScore(statsOf(a.id), mean) ||
        statsOf(b.id).count - statsOf(a.id).count ||
        a.name.localeCompare(b.name, 'th') ||
        a.id.localeCompare(b.id),
    );
    const ranks = new Map(ordered.map((place, index) => [place.id, index + 1]));
    return { statsOf, ranks };
  }

  private summarize(
    place: InternshipPlace,
    ranking: Ranking,
    near: { latitude: number; longitude: number },
  ): PlaceSummary {
    const own = ranking.statsOf(place.id);
    return {
      id: place.id,
      name: place.name,
      province: place.province,
      latitude: place.latitude,
      longitude: place.longitude,
      dailyAllowanceSatang: place.dailyAllowanceSatang,
      workHours: place.workHours,
      notes: place.notes,
      tags: place.tags,
      websiteUrl: place.websiteUrl,
      contactPhone: place.contactPhone,
      applyEmail: place.applyEmail,
      intakePeriod: place.intakePeriod,
      isVerified: place.isVerified,
      verifiedAt: place.verifiedAt,
      averageScore: averageScore(own),
      reviewCount: own.count,
      rank: ranking.ranks.get(place.id) ?? ranking.ranks.size + 1,
      distanceKm: Math.round(distanceKm(near, place) * 10) / 10,
      createdAt: place.createdAt,
      updatedAt: place.updatedAt,
    };
  }

  private reviewView(user: CoreHubIdentity, review: PlaceReview, context: ReportContext): ReviewView {
    return {
      id: review.id,
      score: review.score,
      comment: review.comment,
      position: review.position,
      internshipYear: review.internshipYear,
      isMine: review.coreUserId === user.id,
      isHidden: review.isHidden,
      hiddenReason: review.hiddenReason,
      isReportedByMe: context.reportedByMe.has(review.id),
      ...(context.openCounts ? { openReportCount: context.openCounts.get(review.id) ?? 0 } : {}),
      ...(can(user.subsystemRole, Permission.REVIEW_DELETE_ANY)
        ? { personCode: review.personCode }
        : {}),
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private comparator(sort: NonNullable<QueryPlacesDto['sort']>) {
    const byName = (a: PlaceSummary, b: PlaceSummary) => a.name.localeCompare(b.name, 'th');
    const byNewest = (a: PlaceSummary, b: PlaceSummary) => b.createdAt.getTime() - a.createdAt.getTime();
    // Every order ends with the name and then the id, so pages never shuffle.
    const tail = (a: PlaceSummary, b: PlaceSummary) => byName(a, b) || a.id.localeCompare(b.id);
    const orders: Record<typeof sort, (a: PlaceSummary, b: PlaceSummary) => number> = {
      rank: (a, b) => a.rank - b.rank || b.reviewCount - a.reviewCount,
      rating: (a, b) => b.averageScore - a.averageScore || b.reviewCount - a.reviewCount,
      allowance: (a, b) => b.dailyAllowanceSatang - a.dailyAllowanceSatang || a.rank - b.rank,
      reviews: (a, b) => b.reviewCount - a.reviewCount || a.rank - b.rank,
      distance: (a, b) => a.distanceKm - b.distanceKm,
      newest: byNewest,
      name: () => 0,
    };
    return (a: PlaceSummary, b: PlaceSummary) => orders[sort](a, b) || tail(a, b);
  }
}
