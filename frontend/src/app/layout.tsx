import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font - no request to Google from the browser (ui-design-system.md 4.1).
// Same families as @csmju2030/design-system: Inter for body, Plus Jakarta Sans for headings, IBM Plex Sans Thai for Thai.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["600", "700"] });
const plexThai = IBM_Plex_Sans_Thai({ variable: "--font-plex-thai", subsets: ["thai"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "ระบบสถานที่ฝึกงาน · CSMJU",
  description: "ค้นหาสถานที่ฝึกงาน/สหกิจศึกษา และรีวิวจากรุ่นพี่ สาขาวิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยแม่โจ้",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${inter.variable} ${jakarta.variable} ${plexThai.variable}`}>
      <body>{children}</body>
    </html>
  );
}
