/**
 * Labels for review reports. Kept apart from api.ts (server-only, it reads
 * cookies) so the report dialog in the browser can use them too.
 */

/** Why a review is reported - the values of POST .../reviews/:reviewId/reports `reason`. */
export const REPORT_REASONS = {
  SPAM: "สแปม / โฆษณา",
  OFFENSIVE: "คำหยาบหรือไม่สุภาพ",
  FALSE_INFO: "ข้อมูลเท็จ",
  PERSONAL_INFO: "เปิดเผยข้อมูลส่วนตัวของผู้อื่น",
  OTHER: "อื่น ๆ",
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;

/** Report statuses as moderators see them. */
export const REPORT_STATUS_LABEL: Record<string, string> = {
  OPEN: "รอตรวจ",
  ACTION_TAKEN: "ซ่อนแล้ว",
  DISMISSED: "คงไว้",
};
