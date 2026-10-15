import { TONE_STYLES } from "@/csmju";
import { VerifiedIcon } from "../icons";

/** "ยืนยันแล้ว": staff checked that the place exists and takes CS interns. */
export default function VerifiedBadge() {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-label-sm ${TONE_STYLES.success.badge}`}
      title="เจ้าหน้าที่/อาจารย์ตรวจแล้วว่าสถานที่นี้มีอยู่จริงและรับนักศึกษาฝึกงาน"
    >
      <VerifiedIcon className="h-4 w-4" />
      ยืนยันแล้ว
    </span>
  );
}
