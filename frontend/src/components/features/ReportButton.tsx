"use client";

import { useState } from "react";
import { Modal } from "@/csmju";
import { REPORT_REASONS } from "../../lib/report-reasons";
import { FlagIcon } from "../icons";
import { fieldLabel, input, primaryButton, secondaryButton } from "../ui";

/**
 * "รายงาน" on someone else's review: a dialog asks why, then the form goes to
 * the server action. Once reported, the button says so and does nothing.
 */
export default function ReportButton({
  action,
  placeId,
  reviewId,
  reported,
}: {
  action: (formData: FormData) => Promise<void>;
  placeId: string;
  reviewId: string;
  reported: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (reported) {
    return (
      <span className="inline-flex min-h-11 items-center gap-1.5 px-3 text-label-md text-on-surface-variant">
        <FlagIcon className="h-4 w-4" />
        รายงานแล้ว · รอผู้ดูแลตรวจ
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-label-md text-on-surface-variant transition-colors hover:bg-surface-variant/50"
      >
        <FlagIcon className="h-4 w-4" />
        รายงาน
      </button>
      {open && (
        <Modal title="รายงานรีวิวนี้" onClose={() => setOpen(false)}>
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="placeId" value={placeId} />
            <input type="hidden" name="reviewId" value={reviewId} />
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-2 text-label-md text-on-surface">เหตุผล</legend>
              {Object.entries(REPORT_REASONS).map(([value, label], index) => (
                <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 text-body-md text-on-surface">
                  <input type="radio" name="reason" value={value} required defaultChecked={index === 0} className="h-4 w-4 accent-primary-container" />
                  {label}
                </label>
              ))}
            </fieldset>
            <label className={fieldLabel}>
              รายละเอียดเพิ่มเติม (ไม่บังคับ)
              <textarea className={input} name="detail" rows={2} maxLength={300} />
            </label>
            <p className="text-label-md font-normal text-on-surface-variant">ผู้เขียนรีวิวจะไม่รู้ว่าใครรายงาน</p>
            <div className="flex justify-end gap-3">
              <button type="button" className={secondaryButton} onClick={() => setOpen(false)}>
                ยกเลิก
              </button>
              <button type="submit" className={primaryButton}>
                ส่งรายงาน
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
