import { RATING_TEXT } from "../../lib/format";

/** Buddhist-era years offered for "ปีที่ฝึก": this year and the 11 before it. */
export function internshipYears(now = new Date()): number[] {
  const current = now.getFullYear() + 543;
  return Array.from({ length: 12 }, (_, index) => current - index);
}

type ReviewValues = { score?: number; comment?: string; position?: string | null; internshipYear?: number | null };

/**
 * Review fields shared by the review form and the "add place" form. Plain
 * form controls with visible labels - they work without client JS.
 */
export function ReviewFields({ values = {}, required = true }: { values?: ReviewValues; required?: boolean }) {
  const years = internshipYears();
  if (values.internshipYear && !years.includes(values.internshipYear)) years.push(values.internshipYear);

  return (
    <>
      <fieldset className="rating">
        <legend>ให้คะแนน{required ? " (จำเป็น)" : ""}</legend>
        {[5, 4, 3, 2, 1].map((score) => (
          <label key={score} className="choice">
            <input type="radio" name="score" value={score} defaultChecked={values.score === score} required={required} />
            <span>
              {score} ดาว · {RATING_TEXT[score]}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="form-row">
        <label>
          ตำแหน่งที่ฝึก
          <input name="position" maxLength={60} defaultValue={values.position ?? ""} placeholder="Frontend Developer Intern" />
        </label>
        <label>
          ปีที่ฝึก (พ.ศ.)
          <select name="internshipYear" defaultValue={values.internshipYear ? String(values.internshipYear) : ""}>
            <option value="">ไม่ระบุ</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        เล่าประสบการณ์{required ? " (จำเป็น)" : ""}
        <textarea
          name="comment"
          rows={4}
          minLength={5}
          maxLength={1000}
          required={required}
          defaultValue={values.comment ?? ""}
          placeholder="งานที่ได้ทำ พี่เลี้ยง บรรยากาศ สิ่งที่ได้เรียนรู้"
        />
      </label>
    </>
  );
}
