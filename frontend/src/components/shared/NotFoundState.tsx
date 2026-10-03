import Link from "next/link";

/** Empty state for a missing page or record (ui-design-system.md 9.3) - not a red error. */
export default function NotFoundState() {
  return (
    <main id="main" className="page page-narrow">
      <section className="card empty">
        <h1>ไม่พบข้อมูล</h1>
        <p>ไม่พบข้อมูลที่คุณกำลังค้นหา อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง</p>
        <p>
          <Link className="btn btn-secondary" href="/">
            กลับไปที่รายการ
          </Link>
        </p>
      </section>
    </main>
  );
}
