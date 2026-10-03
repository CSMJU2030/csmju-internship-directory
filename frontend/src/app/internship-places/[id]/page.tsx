import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowBackIcon, EditIcon, LocationIcon } from "@/csmju";
import DeleteButton from "../../../components/features/DeleteButton";
import { ReviewFields } from "../../../components/features/ReviewForm";
import Stars from "../../../components/features/Stars";
import { OpenInNewIcon } from "../../../components/icons";
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
import { deletePlace, deleteReview, saveReview } from "../../actions";
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
        <h1 className={`${pageTitle} mb-2 break-words`}>{p.name}</h1>
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
          <dt className="text-on-surface-variant">เพิ่มเมื่อ</dt>
          <dd className="col-span-2 text-on-surface">{formatDate(p.createdAt)}</dd>
        </dl>
      </section>

      <section className={`${card} space-y-4`}>
        <h2 className={sectionTitle}>ข้อควรระวัง / สวัสดิการ</h2>
        <p className="max-w-prose whitespace-pre-line break-words text-body-md text-on-surface">{p.notes}</p>
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
                className={`flex flex-col gap-2 rounded-xl border p-4 ${review.isMine ? "border-primary-container" : "border-outline-variant/40"}`}
              >
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
                {(review.isMine || can.moderateReviews(me.data)) && (
                  <div className="flex justify-end">
                    <DeleteButton
                      action={deleteReview}
                      fields={{ placeId: p.id, reviewId: review.id }}
                      label="ลบรีวิว"
                      title="ลบรีวิวนี้?"
                      message="รีวิวนี้จะถูกลบ และกู้คืนไม่ได้"
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
