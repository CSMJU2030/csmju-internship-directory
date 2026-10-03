import type { Metadata } from "next";
import Link from "next/link";
import Stars from "../../components/features/Stars";
import { RateReviewIcon } from "../../components/icons";
import { alertError, card, link, muted, pageTitle, primaryButton, small } from "../../components/ui";
import { can, getMe, hasSession, isUnauthorized, listMyReviews } from "../../lib/api";
import { describeError, formatDate, provinceLabel } from "../../lib/format";
import ReSignIn from "../_components/ReSignIn";
import SignedOut from "../_components/SignedOut";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "รีวิวของฉัน" };

/** Every review the signed-in user wrote, each linking to its place to edit or delete. */
export default async function MyReviewsPage() {
  const me = await getMe();
  if (!me.ok) {
    if (me.status === 401 && (await hasSession())) return <ReSignIn />;
    return <SignedOut next="/my-reviews" reason={me.status === 401 ? null : describeError(me.code, me.message)} />;
  }

  const reviews = await listMyReviews();
  if (isUnauthorized(reviews)) return <ReSignIn />;

  return (
    <>
      <div className="fade-slide-up">
        <h1 className={`${pageTitle} mb-2`}>รีวิวของฉัน</h1>
        <p className={muted}>รีวิวทั้งหมดที่คุณเขียนไว้ กดที่สถานที่เพื่อแก้ไขหรือลบรีวิว</p>
      </div>

      {!reviews.ok ? (
        <p className={alertError} role="alert">
          {describeError(reviews.code, reviews.message)}
        </p>
      ) : reviews.data.length === 0 ? (
        <section className={`${card} flex flex-col items-center gap-3 py-12 text-center`}>
          <RateReviewIcon className="h-12 w-12 text-outline" />
          <h2 className="font-display text-headline-md text-on-surface">ยังไม่มีรีวิว</h2>
          <p className={muted}>
            {can.review(me.data)
              ? "เคยฝึกงานที่ไหน เลือกสถานที่แล้วให้คะแนนได้เลย ช่วยรุ่นน้องตัดสินใจได้มาก"
              : "บทบาทของคุณดูรีวิวได้อย่างเดียว"}
          </p>
          <Link className={primaryButton} href="/">
            ไปที่รายการสถานที่
          </Link>
        </section>
      ) : (
        <>
          <p className={small}>
            ทั้งหมด <span className="tabular-nums">{reviews.data.length.toLocaleString("th-TH")}</span> รีวิว
          </p>
          <ul className="space-y-4">
            {reviews.data.map((review) => {
              const href = `/internship-places/${encodeURIComponent(review.placeId)}#my-review`;
              return (
                <li key={review.id} className={`${card} flex flex-col gap-3`}>
                  <div>
                    <h2 className="break-words font-display text-headline-md text-on-surface">
                      <Link className="hover:text-primary-container hover:underline" href={href}>
                        {review.placeName}
                      </Link>
                    </h2>
                    <p className={small}>{provinceLabel(review.placeProvince)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars score={review.score} />
                    <span className={small}>
                      {review.position ? `${review.position} · ` : ""}
                      {review.internshipYear ? `ฝึกปี ${review.internshipYear} · ` : ""}
                      เขียนเมื่อ {formatDate(review.createdAt)}
                    </span>
                  </div>
                  {review.comment ? (
                    <p className="max-w-prose whitespace-pre-line break-words text-body-md text-on-surface">{review.comment}</p>
                  ) : (
                    <p className={small}>ให้คะแนนอย่างเดียว</p>
                  )}
                  <Link className={link} href={href}>
                    แก้ไขหรือลบรีวิวนี้
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
