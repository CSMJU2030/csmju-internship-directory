import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewFields } from "../../../components/features/ReviewForm";
import Stars from "../../../components/features/Stars";
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
import ReSignIn from "../../_components/ReSignIn";
import Shell, { Flash } from "../../_components/Shell";
import SignedOut from "../../_components/SignedOut";

export const dynamic = "force-dynamic";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const place = await getPlace((await params).id);
  return { title: `${place.ok ? place.data.name : "รายละเอียดสถานที่"} · ระบบสถานที่ฝึกงาน · CSMJU` };
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
    <Shell me={me.data}>
      <Link href="/" className="back-link">
        กลับไปที่รายการ
      </Link>

      <div className="page-head">
        <h1>{p.name}</h1>
        <p className="muted">
          {provinceLabel(p.province)} · ห่าง ม.แม่โจ้ {formatKm(p.distanceKm)} · อันดับ{" "}
          <span className="tabular">#{p.rank}</span>
        </p>
      </div>

      <Flash ok={ok} error={error} />

      <section className="card detail-grid">
        <div>
          <h2>คะแนน</h2>
          {p.reviewCount > 0 ? (
            <p>
              <Stars score={p.averageScore} />{" "}
              <span className="tabular">
                {p.averageScore.toLocaleString("th-TH", { maximumFractionDigits: 1 })}/5 · {p.reviewCount} รีวิว
              </span>
            </p>
          ) : (
            <p className="muted">ยังไม่มีรีวิว</p>
          )}
          {p.reviewCount > 0 && (
            <ul className="distribution" aria-label="จำนวนรีวิวแต่ละระดับคะแนน">
              {scores.map((score) => {
                const count = p.scoreDistribution[score];
                return (
                  <li key={score}>
                    <span className="tabular">{score} ดาว</span>
                    <span className="bar" aria-hidden="true">
                      {/* Width is computed at runtime - the only inline style allowed (ui-design-system 16.2). */}
                      <span className="bar-fill" style={{ width: `${Math.round((count / p.reviewCount) * 100)}%` }} />
                    </span>
                    <span className="tabular">{count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <dl className="facts">
          <dt>เบี้ยเลี้ยง</dt>
          <dd>{formatAllowance(p.dailyAllowanceSatang)}</dd>
          <dt>เวลาทำงาน</dt>
          <dd>{p.workHours || "ไม่ระบุ"}</dd>
          <dt>สายงาน</dt>
          <dd>{p.tags.length ? p.tags.map((tag) => tagLabel.get(tag) ?? tag).join(" · ") : "ไม่ระบุ"}</dd>
          <dt>เพิ่มเมื่อ</dt>
          <dd>{formatDate(p.createdAt)}</dd>
        </dl>
      </section>

      <section className="card">
        <h2>ข้อควรระวัง / สวัสดิการ</h2>
        <p className="prose">{p.notes}</p>
        <p className="place-links">
          <a className="btn btn-secondary btn-sm" href={directionsUrl(p.latitude, p.longitude)} target="_blank" rel="noopener noreferrer">
            นำทาง
          </a>
          <a className="btn btn-secondary btn-sm" href={googleMapsUrl(p.latitude, p.longitude)} target="_blank" rel="noopener noreferrer">
            เปิดใน Google Maps
          </a>
          {can.managePlaces(me.data) && (
            <Link className="btn btn-secondary btn-sm" href={`${path}/edit`}>
              แก้ไขข้อมูลสถานที่
            </Link>
          )}
        </p>
        {can.managePlaces(me.data) && (
          <details className="danger-zone">
            <summary>ลบสถานที่นี้</summary>
            <p>สถานที่และรีวิวทั้งหมด {p.reviewCount} รายการจะถูกลบ และกู้คืนไม่ได้</p>
            <form action={deletePlace}>
              <input type="hidden" name="id" value={p.id} />
              <button className="btn btn-danger btn-sm" type="submit">
                ลบ
              </button>
            </form>
          </details>
        )}
      </section>

      {can.review(me.data) && (
        <section className="card">
          <h2>{mine ? "แก้ไขรีวิวของฉัน" : "เขียนรีวิว"}</h2>
          <form action={saveReview} className="form">
            <input type="hidden" name="placeId" value={p.id} />
            {mine && <input type="hidden" name="reviewId" value={mine.id} />}
            <ReviewFields values={mine} />
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">
                บันทึก
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <h2>รีวิวจากรุ่นพี่ ({p.reviewCount})</h2>
        {p.reviews.length === 0 ? (
          <p className="muted">ยังไม่มีรีวิวสำหรับสถานที่นี้</p>
        ) : (
          <ul className="review-list">
            {p.reviews.map((review) => (
              <li key={review.id} className={`review${review.isMine ? " review-mine" : ""}`}>
                <div className="review-head">
                  <Stars score={review.score} />
                  <span className="muted small">
                    {review.isMine ? "รีวิวของคุณ" : "รุ่นพี่ CSMJU"}
                    {review.personCode ? ` · ${review.personCode}` : ""}
                    {review.position ? ` · ${review.position}` : ""}
                    {review.internshipYear ? ` · ฝึกปี ${review.internshipYear}` : ""}
                    {` · ${formatDate(review.createdAt)}`}
                  </span>
                </div>
                {review.comment ? <p className="prose">{review.comment}</p> : <p className="muted small">ให้คะแนนอย่างเดียว</p>}
                {(review.isMine || can.moderateReviews(me.data)) && (
                  <details className="danger-zone">
                    <summary>ลบรีวิวนี้</summary>
                    <form action={deleteReview}>
                      <input type="hidden" name="placeId" value={p.id} />
                      <input type="hidden" name="reviewId" value={review.id} />
                      <button className="btn btn-danger btn-sm" type="submit">
                        ลบ
                      </button>
                    </form>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Shell>
  );
}
