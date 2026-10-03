import Link from "next/link";
import { SearchOffIcon } from "../icons";
import { card, muted, pageTitle, secondaryButton } from "../ui";

/** Empty state for a missing page or record (ui-design-system.md 9.3) - not a red error. */
export default function NotFoundState() {
  return (
    <section className={`${card} mx-auto flex w-full max-w-xl flex-col items-center gap-3 py-12 text-center`}>
      <SearchOffIcon className="h-12 w-12 text-outline" />
      <h1 className={pageTitle}>ไม่พบข้อมูล</h1>
      <p className={muted}>ไม่พบข้อมูลที่คุณกำลังค้นหา อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง</p>
      <Link className={secondaryButton} href="/">
        กลับไปที่รายการ
      </Link>
    </section>
  );
}
