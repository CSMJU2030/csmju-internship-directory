import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowBackIcon, EditIcon, EyeIcon, LocationIcon, MailIcon, StatusBadge } from "@/csmju";
import DeleteButton from "../../../components/features/DeleteButton";
import HideReviewButton from "../../../components/features/HideReviewButton";
import ReportButton from "../../../components/features/ReportButton";
import { ReviewFields } from "../../../components/features/ReviewForm";
import Stars from "../../../components/features/Stars";
import VerifiedBadge from "../../../components/features/VerifiedBadge";
import { LanguageIcon, OpenInNewIcon, PhoneIcon, PublicPageIcon, VerifiedIcon, WorkIcon } from "../../../components/icons";
import { card, link, muted, pageTitle, primaryButton, secondaryButton, sectionTitle, small } from "../../../components/ui";
import { can, getMe, getPlace, hasSession, isUnauthorized, listTags } from "../../../lib/api";
import {
  describeError,
  directionsUrl,
  formatAllowance,
  formatDate,
  formatKm,
  googleMapsUrl,
  provinceLabel,
} from "../../../lib/format";
import { deletePlace, deleteReview, reportReview, saveReview, setReviewVisibility, setVerification } from "../../actions";
import Flash from "../../_components/Flash";
import ReSignIn from "../../_components/ReSignIn";
import SignedOut from "../../_components/SignedOut";

export const dynamic = "force-dynamic";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const place = await getPlace((await params).id);
  return { title: place.ok ? place.data.name : "รายละเอียดสถานที่" };
}

export default async function PlacePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const path = `/internship-places/${encodeURIComponent(id)}`;

  const me = await getMe();
  if (!me.ok) {
    if (me.status === 401 && (await hasSession())) return <ReSignIn />;
    return <SignedOut next={path} reason={me.status === 401 ? null : describeError(me.code, me.message)} />;
  }

  const [place, tags] = await Promise.all([getPlace(id), listTags()]);
  if (isUnauthorized(place, tags)) return <ReSignIn />;
  if (!place.ok && (place.status === 404 || place.status === 400)) notFound();
  if (!place.ok) throw new Error(place.code);

  const p = place.data;
  const tagLabel = new Map(tags.ok ? tags.data.map((tag) => [tag.key, tag.label]) : []);
  const mine = p.reviews.find((review) => review.isMine);
  const scores = [5, 4, 3, 2, 1] as const;

  return (
    <>
      <Link href="/" className={link}>
        <ArrowBackIcon className="h-4 w-4" />
        กลับไปที่รายการ
      </Link>

      <div className="fade-slide-up">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h1 className={`${pageTitle} break-words`}>{p.name}</h1>
          {p.isVerified && <VerifiedBadge />}
        </div>
        <p className={muted}>
          {provinceLabel(p.province)} · ห่าง ม.แม่โจ้ {formatKm(p.distanceKm)} · อันดับ <span className="tabular-nums">#{p.rank}</span>
        </p>
      </div>

      <Flash ok={ok} error={error} />

      <section className={`${card} grid gap-8 md:grid-cols-2`}>
        <div>
          <h2 className={sectionTitle}>คะแนน</h2>
          {p.reviewCount > 0 ? (
            <p className="mb-4 flex items-center gap-2">
              <Stars score={p.averageScore} />
              <span className="text-body-md tabular-nums text-on-surface">
                {p.averageScore.toLocaleString("th-TH", { maximumFractionDigits: 1 })}/5 · {p.reviewCount} รีวิว
              </span>
            </p>
          ) : (
            <p className={muted}>ยังไม่มีรีวิว</p>
          )}
          {p.reviewCount > 0 && (
            <ul className="space-y-1.5" aria-label="จำนวนรีวิวแต่ละระดับคะแนน">
              {scores.map((score) => {
                const count = p.scoreDistribution[score];
                return (
                  <li key={score} className={`${small} grid grid-cols-6 items-center gap-2`}>
                    <span className="tabular-nums">{score} ดาว</span>
                    <span className="col-span-4 h-2 overflow-hidden rounded-full bg-surface-variant" aria-hidden="true">
                      {/* Width is computed at runtime - the only inline style allowed (ui-design-system 16.2). */}
                      <span className="block h-full bg-amber-500" style={{ width: `${Math.round((count / p.reviewCount) * 100)}%` }} />
                    </span>
                    <span className="text-right tabular-nums">{count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-body-md">
          <dt className="text-on-surface-variant">เบี้ยเลี้ยง</dt>
          <dd className="col-span-2 text-on-surface">{formatAllowance(p.dailyAllowanceSatang)}</dd>
          <dt className="text-on-surface-variant">เวลาทำงาน</dt>
          <dd className="col-span-2 break-words text-on-surface">{p.workHours || "ไม่ระบุ"}</dd>
          <dt className="text-on-surface-variant">สายงาน</dt>
          <dd className="col-span-2 text-on-surface">{p.tags.length ? p.tags.map((tag) => tagLabel.get(tag) ?? tag).join(" · ") : "ไม่ระบุ"}</dd>
          <dt className="text-on-surface-variant">รอบรับ</dt>
          <dd className="col-span-2 break-words text-on-surface">{p.intakePeriod || "ไม่ระบุ"}</dd>
          <dt className="text-on-surface-variant">เพิ่มเมื่อ</dt>
          <dd className="col-span-2 text-on-surface">{formatDate(p.createdAt)}</dd>
        </dl>
      </section>

      <section className={`${card} space-y-4`}>
        <h2 className={sectionTitle}>ข้อควรระวัง / สวัสดิการ</h2>
        <p className="max-w-prose whitespace-pre-line break-words text-body-md text-on-surface">{p.notes}</p>
        {(p.websiteUrl || p.contactPhone || p.contactEmail || p.applyEmail || p.facebookUrl || p.linkedinUrl) && (
          <ul className="flex flex-col gap-1" aria-label="ช่องทางติดต่อบริษัท">
            {p.websiteUrl && (
              <li>
                <a className={link} href={p.websiteUrl} target="_blank" rel="noopener noreferrer nofollow">
                  <LanguageIcon className="h-4 w-4" />
                  <span className="break-all">{p.websiteUrl.replace(/^https?:\/\//, "")}</span>
                </a>
              </li>
            )}
            {p.contactPhone && (
              <li>
                <a className={link} href={`tel:${p.contactPhone}`}>
                  <PhoneIcon className="h-4 w-4" />
                  <span className="tabular-nums">{p.contactPhone}</span>
                </a>
              </li>
            )}
            {p.contactEmail && (
              <li>
                <a className={link} href={`mailto:${p.contactEmail}`}>
                  <MailIcon className="h-4 w-4" />
                  <span className="break-all">{p.contactEmail}</span>
                  <span className={small}>(อีเมลติดต่อ)</span>
                </a>
              </li>
            )}
            {p.applyEmail && (
              <li>
                <a className={link} href={`mailto:${p.applyEmail}`}>
                  <MailIcon className="h-4 w-4" />
                  <span className="break-all">{p.applyEmail}</span>
                  <span className={small}>(อีเมลรับสมัคร)</span>
                </a>
              </li>
            )}
            {p.facebookUrl && (
              <li>
                <a className={link} href={p.facebookUrl} target="_blank" rel="noopener noreferrer nofollow">
                  <PublicPageIcon className="h-4 w-4" />
                  Facebook Page
                </a>
              </li>
            )}
            {p.linkedinUrl && (
              <li>
                <a className={link} href={p.linkedinUrl} target="_blank" rel="noopener noreferrer nofollow">
                  <WorkIcon className="h-4 w-4" />
                  LinkedIn
                </a>
              </li>
            )}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <a className={secondaryButton} href={directionsUrl(p.latitude, p.longitude)} target="_blank" rel="noopener noreferrer">
            <LocationIcon className="h-4 w-4" />
            นำทาง
          </a>
          <a className={secondaryButton} href={googleMapsUrl(p.latitude, p.longitude)} target="_blank" rel="noopener noreferrer">
            <OpenInNewIcon className="h-4 w-4" />
            เปิดใน Google Maps
          </a>
          {can.managePlaces(me.data) && (
            <Link className={secondaryButton} href={`${path}/edit`}>
              <EditIcon className="h-4 w-4" />
              แก้ไขข้อมูลสถานที่
            </Link>
          )}
          {can.verifyPlaces(me.data) && (
            <form action={setVerification}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="isVerified" value={p.isVerified ? "false" : "true"} />
              <button className={secondaryButton} type="submit">
                <VerifiedIcon className="h-4 w-4" />
                {p.isVerified ? "ยกเลิกการยืนยัน" : "ยืนยันสถานที่"}
              </button>
            </form>
          )}
          {can.managePlaces(me.data) && (
            <DeleteButton
              action={deletePlace}
              fields={{ id: p.id }}
              label="ลบสถานที่"
              title={`ลบ "${p.name}"?`}
              message={`สถานที่และรีวิวทั้งหมด ${p.reviewCount} รายการจะถูกลบ และกู้คืนไม่ได้`}
            />
          )}
        </div>
      </section>

      {can.review(me.data) && (
        <section className={`${card} scroll-mt-24`} id="my-review">
          <h2 className={sectionTitle}>{mine ? "แก้ไขรีวิวของฉัน" : "เขียนรีวิว"}</h2>
          <form action={saveReview} className="flex flex-col gap-4">
            <input type="hidden" name="placeId" value={p.id} />
            {mine && <input type="hidden" name="reviewId" value={mine.id} />}
            <ReviewFields values={mine} />
            <div className="flex justify-end">
              <button className={primaryButton} type="submit">
                บันทึก
              </button>
            </div>
          </form>
        </section>
      )}

      <section className={card}>
        <h2 className={sectionTitle}>รีวิวจากรุ่นพี่ ({p.reviewCount})</h2>
        {p.reviews.length === 0 ? (
          <p className={muted}>ยังไม่มีรีวิวสำหรับสถานที่นี้</p>
        ) : (
          <ul className="space-y-3">
            {p.reviews.map((review) => (
              <li
                key={review.id}
                className={`flex flex-col gap-2 rounded-xl border p-4 ${review.isMine ? "border-primary-container" : "border-outline-variant/40"} ${review.isHidden ? "bg-surface-variant/40" : ""}`}
              >
                {review.isHidden && (
                  <p className="flex flex-wrap items-center gap-2 text-label-md text-on-surface-variant">
                    <StatusBadge tone="neutral" label="ซ่อนโดยผู้ดูแล" />
                    {review.isMine ? "คนอื่นไม่เห็นรีวิวนี้และไม่นับคะแนน" : "แสดงให้ผู้ดูแลเห็นเท่านั้น"}
                    {review.hiddenReason ? ` · เหตุผล: ${review.hiddenReason}` : ""}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Stars score={review.score} />
                  <span className={small}>
                    {review.isMine ? "รีวิวของคุณ" : "รุ่นพี่ CSMJU"}
                    {review.personCode ? ` · ${review.personCode}` : ""}
                    {review.position ? ` · ${review.position}` : ""}
                    {review.internshipYear ? ` · ฝึกปี ${review.internshipYear}` : ""}
                    {` · ${formatDate(review.createdAt)}`}
                  </span>
                </div>
                {review.comment ? (
                  <p className="max-w-prose whitespace-pre-line break-words text-body-md text-on-surface">{review.comment}</p>
                ) : (
                  <p className={small}>ให้คะแนนอย่างเดียว</p>
                )}
                <div className="flex flex-wrap items-center justify-end gap-1">
                  {(review.openReportCount ?? 0) > 0 && (
                    <span className="mr-auto">
                      <StatusBadge tone="warning" label={`ถูกรายงาน ${review.openReportCount} ครั้ง`} />
                    </span>
                  )}
                  {!review.isMine && !review.isHidden && can.reportReviews(me.data) && (
                    <ReportButton action={reportReview} placeId={p.id} reviewId={review.id} reported={review.isReportedByMe} />
                  )}
                  {can.moderateReviews(me.data) &&
                    (review.isHidden || (review.openReportCount ?? 0) > 0 ? (
                      <form action={setReviewVisibility}>
                        <input type="hidden" name="placeId" value={p.id} />
                        <input type="hidden" name="reviewId" value={review.id} />
                        <input type="hidden" name="isHidden" value="false" />
                        <button
                          type="submit"
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-label-md text-primary-container transition-colors hover:bg-primary-container/10"
                        >
                          <EyeIcon className="h-4 w-4" />
                          {review.isHidden ? "แสดงรีวิว" : "คงรีวิวไว้"}
                        </button>
                      </form>
                    ) : null)}
                  {can.moderateReviews(me.data) && !review.isHidden && (
                    <HideReviewButton action={setReviewVisibility} placeId={p.id} reviewId={review.id} />
                  )}
                  {(review.isMine || can.moderateReviews(me.data)) && (
                    <DeleteButton
                      action={deleteReview}
                      fields={{ placeId: p.id, reviewId: review.id }}
                      label="ลบรีวิว"
                      title="ลบรีวิวนี้?"
                      message="รีวิวนี้จะถูกลบ และกู้คืนไม่ได้"
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
