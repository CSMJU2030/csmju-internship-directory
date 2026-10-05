import type { Metadata } from "next";
import { Noto_Sans_Thai, Plus_Jakarta_Sans } from "next/font/google";
import { CsmjuAppShell, type NavItem } from "@/csmju";
import { can, getMe, ROLE_LABEL, type Me } from "../lib/api";
import "./globals.css";

// Self-hosted at build time by next/font (ui-design-system.md 4.1) - same setup as the standards template.
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "600", "700", "800"] });
const notoSansThai = Noto_Sans_Thai({ variable: "--font-noto-thai", subsets: ["latin", "thai"], weight: ["400", "500", "600", "700"] });

/** Must match display_name in subsystem.yaml. */
const DISPLAY_NAME = "ระบบสถานที่ฝึกงาน";

/** Core Hub web origin for the "กลับ CSMJU Portal" link (ui-design-system.md 5.1) - from .env, never hardcoded. */
const CORE_HUB_WEB_URL = process.env.CORE_HUB_WEB_URL;

export const metadata: Metadata = {
  title: { template: `%s · ${DISPLAY_NAME} · CSMJU`, default: `${DISPLAY_NAME} · CSMJU` },
  description: "ค้นหาสถานที่ฝึกงาน/สหกิจศึกษา และรีวิวจากรุ่นพี่ สาขาวิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยแม่โจ้",
};

function navFor(me: Me): NavItem[] {
  return [
    { label: "สถานที่ฝึกงาน", labelEn: "Places", href: "/", icon: "school" },
    ...(can.review(me) ? [{ label: "รีวิวของฉัน", labelEn: "My reviews", href: "/my-reviews", icon: "menu-book" as const }] : []),
  ];
}

/** Two letters for the avatar, from the e-mail Core Hub put in the token - shown, never stored (DD-01). */
const initials = (email: string) => email.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "CS";

/**
 * Signed-in pages sit in CsmjuAppShell; a visitor without a session (or one
 * that just ended) gets the page alone - the sign-in screen or ReSignIn.
 * The user comes from this subsystem's own GET /api/v1/me.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const me = await getMe();

  return (
    <html lang="th" className={`${jakarta.variable} ${notoSansThai.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-on-surface">
        {me.ok ? (
          <CsmjuAppShell
            displayName={DISPLAY_NAME}
            nav={navFor(me.data)}
            primaryAction={can.addPlace(me.data) ? { label: "เพิ่มสถานที่ฝึกงาน", href: "/internship-places/new" } : undefined}
            user={{ initials: initials(me.data.email), roleLabel: ROLE_LABEL[me.data.subsystemRole] }}
            coreHubUrl={CORE_HUB_WEB_URL}
          >
            {children}
          </CsmjuAppShell>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
