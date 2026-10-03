import Link from "next/link";
import AutoHideHeader from "../../components/shared/AutoHideHeader";
import Toast from "../../components/shared/Toast";
import { can, type Me } from "../../lib/api";

type NavKey = "places" | "new";

const ROLE_LABEL: Record<Me["subsystemRole"], string> = {
  STUDENT: "นักศึกษา",
  ALUMNI: "ศิษย์เก่า",
  STAFF: "เจ้าหน้าที่/อาจารย์",
  ADMIN: "ผู้ดูแลระบบ",
  VIEWER: "ผู้เยี่ยมชม",
};

/**
 * Header, navigation and the signed-in user, shared by every signed-in page.
 * Temporary until @csmju2030/design-system ships an AppShell that matches
 * standards 1.7 (Central SSO 1.1) - see REPORT.md.
 */
export default function Shell({ me, active, children }: { me: Me; active?: NavKey; children: React.ReactNode }) {
  const nav: Array<{ key: NavKey; href: string; label: string }> = [
    { key: "places", href: "/", label: "สถานที่ฝึกงาน" },
    ...(can.addPlace(me) ? [{ key: "new" as const, href: "/internship-places/new", label: "เพิ่มสถานที่" }] : []),
  ];

  return (
    <>
      <a href="#main" className="skip-link">
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <AutoHideHeader>
        <div className="topbar-inner">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden>
              CS
            </span>
            <span>
              <strong>ระบบสถานที่ฝึกงาน</strong>
              <small>สาขาวิชาวิทยาการคอมพิวเตอร์ ม.แม่โจ้</small>
            </span>
          </Link>

          <nav className="nav" aria-label="เมนูหลัก">
            {nav.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`nav-link${item.key === active ? " nav-link-active" : ""}`}
                aria-current={item.key === active ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="user">
            <span className="user-text">
              <span>{me.email}</span>
              <small>{ROLE_LABEL[me.subsystemRole]}</small>
            </span>
            {/* Signs out of Core Hub too (auth-contract 7). */}
            <form action="/auth/logout" method="post">
              <button className="btn btn-secondary btn-sm" type="submit">
                ออกจากระบบ
              </button>
            </form>
          </div>
        </div>
      </AutoHideHeader>
      <main id="main" className="page">
        {children}
      </main>
    </>
  );
}

/** Result of the last form action, passed back as ?ok= / ?error=: errors stay on the page, success is a toast. */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) {
    return (
      <p className="alert" role="alert">
        {error}
      </p>
    );
  }
  if (ok) return <Toast message={ok} />;
  return null;
}
