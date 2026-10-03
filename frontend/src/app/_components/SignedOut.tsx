import { CsmjuLogo } from "@/csmju";
import { alertError, card, muted, primaryButton, small } from "../../components/ui";
import { getHealth } from "../../lib/api";
import { loginHref } from "../../lib/sign-in";

/** The page a visitor without a session sees: one button to Core Hub, no form of its own (SEC-05). */
export default async function SignedOut({ reason, next = "/" }: { reason?: string | null; next?: string }) {
  const health = await getHealth();

  return (
    <main id="main" className="brand-gradient flex min-h-dvh items-center justify-center p-4">
      <div className="fade-slide-up w-full max-w-md space-y-6">
        <CsmjuLogo framed priority className="mx-auto w-64" />
        <section className={`${card} space-y-4`}>
          <div>
            <h1 className="mb-2 font-display text-headline-md text-on-surface">ระบบสถานที่ฝึกงาน/สหกิจศึกษา</h1>
            <p className={muted}>ค้นหาสถานที่ฝึกงาน เบี้ยเลี้ยง ข้อควรระวัง และรีวิวจากรุ่นพี่ CSMJU</p>
          </div>
          {reason && (
            <p className={alertError} role="alert">
              {reason}
            </p>
          )}
          <p className={muted}>ระบบนี้ไม่มีหน้า login ของตัวเอง ใช้บัญชีเดียวกับ CSMJU Core Hub (รหัสผ่าน หรือ MJU SSO)</p>
          <a className={`${primaryButton} w-full`} href={loginHref(next)}>
            เข้าสู่ระบบผ่าน CSMJU Core Hub
          </a>
          <p className={small}>
            สถานะระบบ:{" "}
            <span
              className={`rounded-full px-2.5 py-1 text-label-sm ${
                health?.status === "ok" ? "bg-success/10 text-emerald-700" : "bg-error-container text-on-error-container"
              }`}
            >
              {health ? `${health.status} · ${health.service ?? "-"}` : "ติดต่อไม่ได้"}
            </span>
          </p>
        </section>
      </div>
    </main>
  );
}
