import Link from "next/link";
import type { PlaceDetail, PlaceTag, Province } from "../../lib/api";
import LocationPicker from "./LocationPicker";
import ProvincePicker from "./ProvincePicker";
import { ReviewFields } from "./ReviewForm";
import TagPicker from "./TagPicker";
import { card, fieldLabel, input, primaryButton, secondaryButton } from "../ui";

/**
 * Add or correct a place. With `withReview` the first review is part of the
 * form (add); without it only the place's own fields are sent (edit).
 */
export default function PlaceForm({
  action,
  tags,
  provinces,
  place,
  withReview = false,
  cancelHref,
}: {
  action: (formData: FormData) => Promise<void>;
  tags: PlaceTag[];
  provinces: Province[];
  place?: PlaceDetail;
  withReview?: boolean;
  cancelHref: string;
}) {
  return (
    <form action={action} className={`${card} flex flex-col gap-6`}>
      {place && <input type="hidden" name="id" value={place.id} />}
      <label className={fieldLabel}>
        ชื่อบริษัท/หน่วยงาน (จำเป็น)
        <input className={input} name="name" required minLength={2} maxLength={120} defaultValue={place?.name ?? ""} placeholder="บริษัท ตัวอย่าง จำกัด" />
      </label>
      <ProvincePicker provinces={provinces} initial={place?.province ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldLabel}>
          เบี้ยเลี้ยง (บาท/วัน · 0 = ไม่มี)
          <input
            className={input}
            name="allowanceBaht"
            type="number"
            min={0}
            max={10000}
            step="0.01"
            inputMode="decimal"
            defaultValue={place ? String(place.dailyAllowanceSatang / 100) : ""}
          />
        </label>
      </div>
      <label className={fieldLabel}>
        เวลาทำงาน
        <input className={input} name="workHours" maxLength={80} defaultValue={place?.workHours ?? ""} placeholder="08:30 - 17:30 น. (จันทร์ - ศุกร์)" />
      </label>
      <label className={fieldLabel}>
        ข้อควรระวัง / สวัสดิการ (จำเป็น)
        <textarea className={input} name="notes" rows={3} required minLength={5} maxLength={600} defaultValue={place?.notes ?? ""} />
      </label>
      <TagPicker tags={tags} initial={place?.tags ?? []} />

      <LocationPicker initial={place ? { lat: place.latitude, lng: place.longitude } : undefined} />

      {withReview && (
        <fieldset className="flex min-w-0 flex-col gap-4 rounded-xl border border-outline-variant/40 p-4">
          <legend className="px-1 text-label-md text-on-surface">รีวิวของคุณ (ไม่บังคับ — ข้ามได้ ถ้าเคยฝึกที่นี่ให้คะแนนไว้ก็พอ)</legend>
          <ReviewFields required={false} />
        </fieldset>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <Link className={secondaryButton} href={cancelHref}>
          ยกเลิก
        </Link>
        <button className={primaryButton} type="submit">
          บันทึก
        </button>
      </div>
    </form>
  );
}
