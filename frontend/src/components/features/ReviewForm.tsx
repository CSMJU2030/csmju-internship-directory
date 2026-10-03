import { RATING_TEXT } from "../../lib/format";
import { fieldLabel, input } from "../ui";

/** Buddhist-era years offered for "ปีที่ฝึก": this year and the 11 before it. */
export function internshipYears(now = new Date()): number[] {
  const current = now.getFullYear() + 543;
  return Array.from({ length: 12 }, (_, index) => current - index);
}

type ReviewValues = { score?: number; comment?: string | null; position?: string | null; internshipYear?: number | null };

/**
 * Review fields shared by the review form and the "add place" form. Plain
 * form controls with visible labels - they work without client JS.
 */
export function ReviewFields({ values = {}, required = true }: { values?: ReviewValues; required?: boolean }) {
  const years = internshipYears();
  if (values.internshipYear && !years.includes(values.internshipYear)) years.push(values.internshipYear);

  return (
    <>
      <fieldset className="flex min-w-0 flex-wrap gap-x-6">
        <legend className="mb-2 text-label-md text-on-surface">ให้คะแนน{required ? " (จำเป็น)" : ""}</legend>
        {[5, 4, 3, 2, 1].map((score) => (
          <label key={score} className="flex min-h-11 cursor-pointer items-center gap-2 text-body-md text-on-surface">
            <input className="h-5 w-5 accent-primary-container" type="radio" name="score" value={score} defaultChecked={values.score === score} required={required} />
            <span>
              {score} ดาว · {RATING_TEXT[score]}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldLabel}>
          ตำแหน่งที่ฝึก
          <input className={input} name="position" maxLength={60} defaultValue={values.position ?? ""} placeholder="Frontend Developer Intern" />
        </label>
        <label className={fieldLabel}>
          ปีที่ฝึก (พ.ศ.)
          <select className={input} name="internshipYear" defaultValue={values.internshipYear ? String(values.internshipYear) : ""}>
            <option value="">ไม่ระบุ</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={fieldLabel}>
        เล่าประสบการณ์ (ไม่บังคับ — ให้คะแนนอย่างเดียวก็ได้)
        <textarea
          className={input}
          name="comment"
          rows={4}
          maxLength={1000}
          defaultValue={values.comment ?? ""}
          placeholder="งานที่ได้ทำ พี่เลี้ยง บรรยากาศ สิ่งที่ได้เรียนรู้"
        />
      </label>
    </>
  );
}
