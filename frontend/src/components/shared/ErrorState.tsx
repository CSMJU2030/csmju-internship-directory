"use client";

import Link from "next/link";
import { card, muted, pageTitle, primaryButton, secondaryButton } from "../ui";

/**
 * Error state of a route segment (ui-design-system.md 9.3): a standard Thai
 * message and "ลองอีกครั้ง" - never error.message, which can carry internals.
 */
export default function ErrorState({ retry, digest }: { retry: () => void; digest?: string }) {
  return (
    <section className={`${card} mx-auto w-full max-w-xl space-y-4`} role="alert">
      <h1 className={pageTitle}>ระบบขัดข้องชั่วคราว</h1>
      <p className={muted}>
        กรุณาลองอีกครั้ง หากยังพบปัญหา กรุณาแจ้งผู้ดูแลระบบ
        {digest ? (
          <>
            {" "}
            พร้อมรหัส: <span className="break-all font-mono">{digest}</span>
          </>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-3">
        <button className={primaryButton} type="button" onClick={() => retry()}>
          ลองอีกครั้ง
        </button>
        <Link className={secondaryButton} href="/">
          กลับหน้าหลัก
        </Link>
      </div>
    </section>
  );
}
