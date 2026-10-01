import { Injectable } from '@nestjs/common';
import { InternshipPlace, PlaceReview, Prisma } from '../../generated/prisma/client';
import { CoreHubIdentity } from '../auth/core-hub-identity';
import { Permission, can } from '../auth/permissions';
import { AppException } from '../common/errors';
import { PeopleService } from '../core-hub/people.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryPlacesDto } from './dto/query-places.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
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

/** A place as the list returns it: the stored row plus figures computed from its reviews. */
export interface PlaceSummary {
  id: string;
  name: string;
  province: string;
  latitude: number;
  longitude: number;
  dailyAllowanceSatang: number;
  workHours: string | null;
  notes: string;
  tags: string[];
  averageScore: number;
  reviewCount: number;
  /** Position in the overall ranking of the whole directory (1 = best). */
  rank: number;
  /** From the university, or from `nearLat`/`nearLng` when the list was asked with them. */
  distanceKm: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A review as the API returns it. The author is never named: `isMine` tells the
 * caller which one is theirs, and staff who moderate also see `personCode`.
 */
export interface ReviewView {
  id: string;
  score: number;
  comment: string;
  position: string | null;
  internshipYear: number | null;
  isMine: boolean;
  personCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaceDetail extends PlaceSummary {
  /** Number of reviews per score, 1 to 5. */
  scoreDistribution: Record<'1' | '2' | '3' | '4' | '5', number>;
  reviews: ReviewView[];
  myReviewId: string | null;
}

type ReviewScore = Pick<PlaceReview, 'placeId' | 'score'>;

interface Ranking {
  statsOf(placeId: string): ScoreStats;
  /** Place id -> position in the whole directory (1 = best). */
  ranks: Map<string, number>;
}

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
      this.prisma.placeReview.findMany({ select: { placeId: true, score: true } }),
    ]);

    // Ranked over the whole directory, before any filter, so a place keeps its rank.
    const ranking = this.ranking(places, scores);
    const near =
      query.nearLat !== undefined && query.nearLng !== undefined
        ? { latitude: query.nearLat, longitude: query.nearLng }
        : MJU_LOCATION;

    let items = places
      .filter((place) => !query.province || place.province === query.province)
      .filter((place) => query.allowance !== 'paid' || place.dailyAllowanceSatang > 0)
      .filter((place) => query.allowance !== 'free' || place.dailyAllowanceSatang === 0)
      .filter((place) => !query.tag || place.tags.includes(query.tag))
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

  async findOne(user: CoreHubIdentity, id: string): Promise<PlaceDetail> {
    const place = await this.load(id);
    const [places, scores, reviews] = await Promise.all([
      this.prisma.internshipPlace.findMany({ select: { id: true, name: true } }),
      this.prisma.placeReview.findMany({ select: { placeId: true, score: true } }),
      this.prisma.placeReview.findMany({ where: { placeId: id }, orderBy: { createdAt: 'desc' } }),
    ]);

    const summary = this.summarize(place, this.ranking(places, scores), MJU_LOCATION);
    const scoreDistribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const review of reviews) {
      scoreDistribution[String(review.score) as keyof typeof scoreDistribution] += 1;
    }
    const mine = reviews.find((review) => review.coreUserId === user.id);

    return {
      ...summary,
      scoreDistribution,
      reviews: reviews.map((review) => this.reviewView(user, review)),
      myReviewId: mine?.id ?? null,
    };
  }

  async create(user: CoreHubIdentity, dto: CreatePlaceDto): Promise<PlaceDetail> {
    const name = dto.name.trim();
    const nameKey = placeNameKey(name);
    await this.assertNameFree(nameKey);

    const place = await this.prisma.internshipPlace.create({
      data: {
        name,
        nameKey,
        province: this.cleanProvince(dto.province),
        latitude: dto.latitude,
        longitude: dto.longitude,
        dailyAllowanceSatang: dto.dailyAllowanceSatang ?? 0,
        workHours: dto.workHours?.trim() || null,
        notes: dto.notes.trim(),
        tags: dto.tags ?? [],
        createdByCoreUserId: user.id,
      },
    });
    return this.findOne(user, place.id);
  }

  async update(user: CoreHubIdentity, id: string, dto: UpdatePlaceDto): Promise<PlaceDetail> {
    await this.load(id);

    const data: Prisma.InternshipPlaceUpdateInput = {};
    if (dto.name !== undefined) {
      const nameKey = placeNameKey(dto.name);
      await this.assertNameFree(nameKey, id);
      data.name = dto.name.trim();
      data.nameKey = nameKey;
    }
    if (dto.province !== undefined) data.province = this.cleanProvince(dto.province);
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;
    if (dto.dailyAllowanceSatang !== undefined) data.dailyAllowanceSatang = dto.dailyAllowanceSatang;
    if (dto.workHours !== undefined) data.workHours = dto.workHours.trim() || null;
    if (dto.notes !== undefined) data.notes = dto.notes.trim();
    if (dto.tags !== undefined) data.tags = dto.tags;

    await this.prisma.internshipPlace.update({ where: { id }, data });
    return this.findOne(user, id);
  }

  /** Removes the place and every review of it. */
  async remove(id: string): Promise<{ id: string; deleted: true }> {
    await this.load(id);
    await this.prisma.$transaction([
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

    const existing = await this.prisma.placeReview.findFirst({
      where: { placeId, coreUserId: user.id },
    });
    if (existing) {
      throw AppException.conflict('คุณรีวิวสถานที่นี้แล้ว แก้ไขรีวิวเดิมแทนได้', {
        reviewId: existing.id,
      });
    }

    // Personal data is never cached: asked now, with the reviewer's own token.
    const personCode = await this.people.myPersonCode(token);

    const review = await this.prisma.placeReview.create({
      data: {
        placeId,
        coreUserId: user.id,
        personCode,
        score: dto.score,
        comment: dto.comment.trim(),
        position: dto.position?.trim() || null,
        internshipYear: dto.internshipYear ?? null,
      },
    });
    return this.reviewView(user, review);
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
    if (dto.comment !== undefined) data.comment = dto.comment.trim();
    if (dto.position !== undefined) data.position = dto.position.trim() || null;
    if (dto.internshipYear !== undefined) data.internshipYear = dto.internshipYear;

    const updated = await this.prisma.placeReview.update({ where: { id: reviewId }, data });
    return this.reviewView(user, updated);
  }

  /** The author removes their own review; staff may remove anyone's. */
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
    await this.prisma.placeReview.delete({ where: { id: reviewId } });
    return { id: reviewId, deleted: true };
  }

  // ------------------------------------------------------------------ helpers

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

  private assertYear(year: number | undefined): void {
    if (year !== undefined && year > currentBuddhistYear() + 1) {
      throw AppException.badRequest('internshipYear ต้องไม่เกินปีหน้า');
    }
  }

  private cleanProvince(province: string): string {
    return province.trim().replace(/^จังหวัด\s*/u, '');
  }

  private async placeIdsWithCommentMatching(needle: string): Promise<Set<string>> {
    const reviews = await this.prisma.placeReview.findMany({
      where: {
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
      averageScore: averageScore(own),
      reviewCount: own.count,
      rank: ranking.ranks.get(place.id) ?? ranking.ranks.size + 1,
      distanceKm: Math.round(distanceKm(near, place) * 10) / 10,
      createdAt: place.createdAt,
      updatedAt: place.updatedAt,
    };
  }

  private reviewView(user: CoreHubIdentity, review: PlaceReview): ReviewView {
    return {
      id: review.id,
      score: review.score,
      comment: review.comment,
      position: review.position,
      internshipYear: review.internshipYear,
      isMine: review.coreUserId === user.id,
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
