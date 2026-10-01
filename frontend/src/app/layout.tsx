import type { Metadata } from "next";
import { Noto_Sans_Thai, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font - no request to Google from the browser (ui-design-system.md 4.1).
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "600", "700", "800"] });
const notoSansThai = Noto_Sans_Thai({ variable: "--font-noto-thai", subsets: ["latin", "thai"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "ระบบสถานที่ฝึกงาน · CSMJU",
  description: "ค้นหาสถานที่ฝึกงาน/สหกิจศึกษา และรีวิวจากรุ่นพี่ สาขาวิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยแม่โจ้",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${jakarta.variable} ${notoSansThai.variable}`}>
      <body>{children}</body>
    </html>
  );
}
