"use client";

import Link from "next/link";

/**
 * Error state of a route segment (ui-design-system.md 9.3): a standard Thai
 * message and "ลองอีกครั้ง" - never error.message, which can carry internals.
 */
export default function ErrorState({ retry, digest }: { retry: () => void; digest?: string }) {
  return (
    <main id="main" className="page page-narrow">
      <section className="card" role="alert">
        <h1>ระบบขัดข้องชั่วคราว</h1>
        <p>
          กรุณาลองอีกครั้ง หากยังพบปัญหา กรุณาแจ้งผู้ดูแลระบบ
          {digest ? (
            <>
              {" "}
              พร้อมรหัส: <span className="mono">{digest}</span>
            </>
          ) : null}
        </p>
        <p className="place-links">
          <button className="btn btn-primary" type="button" onClick={() => retry()}>
            ลองอีกครั้ง
          </button>
          <Link className="btn btn-secondary" href="/">
            กลับหน้าหลัก
          </Link>
        </p>
      </section>
    </main>
  );
}
