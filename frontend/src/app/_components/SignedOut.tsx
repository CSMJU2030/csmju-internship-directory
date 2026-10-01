import { getHealth } from "../../lib/api";
import { loginHref } from "../../lib/sign-in";

/** The page a visitor without a session sees: one button to Core Hub, no form of its own (SEC-05). */
export default async function SignedOut({ reason, next = "/" }: { reason?: string | null; next?: string }) {
  const health = await getHealth();

  return (
    <main id="main" className="page page-narrow">
      <section className="hero">
        <span className="brand-mark brand-mark-lg" aria-hidden>
          CS
        </span>
        <h1>ระบบสถานที่ฝึกงาน/สหกิจศึกษา</h1>
        <p className="muted">ค้นหาสถานที่ฝึกงาน เบี้ยเลี้ยง ข้อควรระวัง และรีวิวจากรุ่นพี่ CSMJU</p>
      </section>

      <section className="card">
        <h2>เข้าสู่ระบบด้วยบัญชี CSMJU</h2>
        {reason && (
          <p className="alert" role="alert">
            {reason}
          </p>
        )}
        <p>ระบบนี้ไม่มีหน้า login ของตัวเอง ใช้บัญชีเดียวกับ CSMJU Core Hub (รหัสผ่าน หรือ MJU SSO)</p>
        <p>
          <a className="btn btn-primary" href={loginHref(next)}>
            เข้าสู่ระบบผ่าน CSMJU Core Hub
          </a>
        </p>
        <p className="muted small">
          สถานะ backend:{" "}
          <span className={`badge ${health?.status === "ok" ? "badge-ok" : "badge-err"}`}>
            {health ? `${health.status} · ${health.service ?? "-"}` : "ติดต่อไม่ได้"}
          </span>
        </p>
      </section>
    </main>
  );
}
