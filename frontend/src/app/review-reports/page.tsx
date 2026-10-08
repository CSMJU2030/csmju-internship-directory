import type { Metadata } from "next";
import Link from "next/link";
import { EyeIcon, StatusBadge } from "@/csmju";
import HideReviewButton from "../../components/features/HideReviewButton";
import Stars from "../../components/features/Stars";
import { CheckCircleIcon } from "../../components/icons";
import { alertError, card, link, muted, pageTitle, small } from "../../components/ui";
import {
  REPORT_REASONS,
  REPORT_STATUS_LABEL,
  can,
  getMe,
  hasSession,
  isUnauthorized,
  listReports,
  type ReportReason,
} from "../../lib/api";
import { describeError, formatDate } from "../../lib/format";
import { setReviewVisibility } from "../actions";
import Flash from "../_components/Flash";
import ReSignIn from "../_components/ReSignIn";
import SignedOut from "../_components/SignedOut";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "รีวิวที่ถูกรายงาน" };

const STATUSES = ["OPEN", "ACTION_TAKEN", "DISMISSED"] as const;

/** The moderators' queue: reported reviews, settled by hiding or keeping each one. */
export default async function ReviewReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; ok?: string; error?: string }>;
}) {
  const { status: asked, page, ok, error } = await searchParams;
  const status = STATUSES.find((value) => value === asked) ?? "OPEN";

  const me = await getMe();
  if (!me.ok) {
    if (me.status === 401 && (await hasSession())) return <ReSignIn />;
    return <SignedOut next="/review-reports" reason={me.status === 401 ? null : describeError(me.code, me.message)} />;
  }
  if (!can.moderateReviews(me.data)) {
    return (
      <p className={alertError} role="alert">
        หน้านี้สำหรับเจ้าหน้าที่/อาจารย์และผู้ดูแลระบบ
      </p>
    );
  }

  const reports = await listReports(status, page);
  if (isUnauthorized(reports)) return <ReSignIn />;
  const meta = reports.ok ? reports.meta : undefined;
  const currentPage = meta?.page ?? 1;
  const totalPages = meta?.totalPages ?? 1;
  const pageHref = (target: number) => `/review-reports?status=${status}${target > 1 ? `&page=${target}` : ""}`;

  return (
    <>
      <div className="fade-slide-up">
        <h1 className={`${pageTitle} mb-2`}>รีวิวที่ถูกรายงาน</h1>
        <p className={muted}>ตรวจรีวิวที่ผู้ใช้รายงาน แล้วเลือกซ่อนหรือคงไว้ ผู้เขียนจะไม่รู้ว่าใครรายงาน</p>
      </div>

      <Flash ok={ok} error={error} />

      <nav aria-label="สถานะรายงาน" className="flex gap-1 overflow-x-auto border-b border-outline-variant/40">
        {STATUSES.map((value) => (
          <Link
            key={value}
            href={`/review-reports?status=${value}`}
            aria-current={value === status ? "page" : undefined}
            className={`-mb-px flex min-h-11 items-center whitespace-nowrap border-b-2 px-4 text-label-md transition-colors ${
              value === status
                ? "border-primary-container text-primary-container"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {REPORT_STATUS_LABEL[value]}
            {value === status && meta ? ` (${meta.total.toLocaleString("th-TH")})` : ""}
          </Link>
        ))}
      </nav>

      {!reports.ok ? (
        <p className={alertError} role="alert">
          {describeError(reports.code, reports.message)}
        </p>
      ) : reports.data.length === 0 ? (
        <section className={`${card} flex flex-col items-center gap-3 py-12 text-center`}>
          <CheckCircleIcon className="h-12 w-12 text-outline" />
          <h2 className="font-display text-headline-md text-on-surface">
            {status === "OPEN" ? "ไม่มีรายงานที่รอตรวจ" : "ยังไม่มีรายงานในสถานะนี้"}
          </h2>
        </section>
      ) : (
        <ul className="space-y-4">
          {reports.data.map((report) => {
            const placeHref = `/internship-places/${encodeURIComponent(report.placeId)}`;
            const review = report.review;
            return (
              <li key={report.id} className={`${card} flex flex-col gap-3`}>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={status === "OPEN" ? "warning" : "neutral"} label={REPORT_REASONS[report.reason as ReportReason] ?? report.reason} />
                  {report.reviewReportCount > 1 && <span className={small}>รีวิวนี้ถูกรายงาน {report.reviewReportCount} ครั้ง</span>}
                  <span className={small}>· รายงานเมื่อ {formatDate(report.createdAt)}</span>
                </div>
                {report.detail && <p className="break-words text-body-md text-on-surface">“{report.detail}”</p>}

                <div className={`flex flex-col gap-2 rounded-xl border border-outline-variant/40 p-4 ${review.isHidden ? "bg-surface-variant/40" : ""}`}>
                  <Link className={`${link} min-h-0 font-display`} href={placeHref}>
                    {report.placeName}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars score={review.score} />
                    <span className={small}>
                      {review.personCode ? `${review.personCode} · ` : ""}
                      {review.position ? `${review.position} · ` : ""}
                      เขียนเมื่อ {formatDate(review.createdAt)}
                    </span>
                    {review.isHidden && <StatusBadge tone="neutral" label="ซ่อนอยู่" />}
                  </div>
                  {review.comment ? (
                    <p className="max-w-prose whitespace-pre-line break-words text-body-md text-on-surface">{review.comment}</p>
                  ) : (
                    <p className={small}>ให้คะแนนอย่างเดียว</p>
                  )}
                  {review.hiddenReason && <p className={small}>เหตุผลที่ซ่อน: {review.hiddenReason}</p>}
                </div>

                <div className="flex flex-wrap justify-end gap-1">
                  {(status === "OPEN" || review.isHidden) && (
                    <form action={setReviewVisibility}>
                      <input type="hidden" name="placeId" value={report.placeId} />
                      <input type="hidden" name="reviewId" value={review.id} />
                      <input type="hidden" name="isHidden" value="false" />
                      <input type="hidden" name="returnTo" value="queue" />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-label-md text-primary-container transition-colors hover:bg-primary-container/10"
                      >
                        <EyeIcon className="h-4 w-4" />
                        {review.isHidden ? "แสดงรีวิวอีกครั้ง" : "คงรีวิวไว้"}
                      </button>
                    </form>
                  )}
                  {!review.isHidden && (
                    <HideReviewButton action={setReviewVisibility} placeId={report.placeId} reviewId={review.id} returnTo="queue" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="หน้า">
          {currentPage > 1 ? (
            <Link className={link} href={pageHref(currentPage - 1)}>
              หน้าก่อน
            </Link>
          ) : (
            <span />
          )}
          <span className={small}>
            หน้า {currentPage} จาก {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link className={link} href={pageHref(currentPage + 1)}>
              หน้าถัดไป
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
