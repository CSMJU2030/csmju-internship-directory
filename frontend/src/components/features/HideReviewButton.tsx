"use client";

import { useState } from "react";
import { EyeOffIcon, Modal } from "@/csmju";
import { dangerButton, fieldLabel, input, secondaryButton } from "../ui";

/**
 * Moderators hide a review after a dialog that asks why - the author sees the
 * reason. type="button" so a click before JavaScript loads hides nothing.
 */
export default function HideReviewButton({
  action,
  placeId,
  reviewId,
  returnTo,
}: {
  action: (formData: FormData) => Promise<void>;
  placeId: string;
  reviewId: string;
  /** "queue" sends the moderator back to the report queue instead of the place. */
  returnTo?: "queue";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-label-md text-error transition-colors hover:bg-error-container"
      >
        <EyeOffIcon className="h-4 w-4" />
        ซ่อนรีวิว
      </button>
      {open && (
        <Modal title="ซ่อนรีวิวนี้?" onClose={() => setOpen(false)}>
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="placeId" value={placeId} />
            <input type="hidden" name="reviewId" value={reviewId} />
            <input type="hidden" name="isHidden" value="true" />
            {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
            <p className="text-body-md text-on-surface-variant">
              รีวิวจะไม่แสดงต่อผู้อื่นและไม่นับคะแนน รายงานที่ค้างอยู่จะปิดเป็น &quot;ซ่อนแล้ว&quot; แสดงกลับได้ภายหลัง
            </p>
            <label className={fieldLabel}>
              เหตุผล (ผู้เขียนรีวิวจะเห็น)
              <input className={input} name="reason" maxLength={200} placeholder="เช่น ใช้คำไม่สุภาพ" />
            </label>
            <div className="flex justify-end gap-3">
              <button type="button" className={secondaryButton} onClick={() => setOpen(false)}>
                ยกเลิก
              </button>
              <button type="submit" className={dangerButton}>
                ซ่อนรีวิว
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
