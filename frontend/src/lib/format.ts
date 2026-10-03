/** Every date on screen is Bangkok time, Buddhist era, whatever the server's clock says. */
const TIME_ZONE = "Asia/Bangkok";

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", { timeZone: TIME_ZONE, day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

/** Daily allowance from integer satang, e.g. 35000 -> "350 บาท/วัน". */
export function formatAllowance(satang: number): string {
  if (satang <= 0) return "ไม่มีเบี้ยเลี้ยง";
  const baht = satang / 100;
  return `${baht.toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท/วัน`;
}

export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} ม.` : `${km.toLocaleString("th-TH", { maximumFractionDigits: km < 10 ? 1 : 0 })} กม.`;
}

/** "จ.เชียงใหม่", but Bangkok is not a จังหวัด. */
export function provinceLabel(province: string): string {
  return /กรุงเทพ/.test(province) ? province : `จ.${province}`;
}

export function starsLabel(score: number): string {
  return `${score.toLocaleString("th-TH", { maximumFractionDigits: 1 })} จาก 5 ดาว`;
}

export const RATING_TEXT: Record<number, string> = {
  1: "ควรระวัง",
  2: "พอใช้",
  3: "ปานกลาง",
  4: "ดี",
  5: "ดีมาก แนะนำ",
};

/**
 * Map pin colours by average score, as whole Tailwind classes so the build
 * finds them (the same families as StatusBadge in @/csmju).
 */
export function pinTone(average: number): string {
  if (average === 0) return "bg-outline text-white";
  if (average >= 4.5) return "bg-success text-white";
  if (average >= 3.5) return "bg-primary-container text-white";
  if (average >= 2.5) return "bg-amber-500 text-on-surface";
  return "bg-error text-white";
}

/** Google Maps links built from coordinates only - no user text in the URL. */
export const googleMapsUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
export const directionsUrl = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

/** Standard error messages by error.code (ui-design-system.md 9.3); the backend's Thai message wins when it has one. */
export function describeError(code: string, message: string): string {
  if (/[\u0E00-\u0E7F]/.test(message)) return message;
  const fallback: Record<string, string> = {
    VALIDATION_ERROR: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่",
    BAD_REQUEST: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่",
    FORBIDDEN: "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบย่อยนี้",
    NOT_FOUND: "ไม่พบข้อมูลที่คุณกำลังค้นหา อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง",
    CONFLICT: "ข้อมูลถูกแก้ไขโดยผู้ใช้อื่นแล้ว กรุณารีเฟรชและลองใหม่",
    TOO_MANY_REQUESTS: "มีการใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่",
    SERVICE_UNAVAILABLE: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง",
  };
  return fallback[code] ?? "ระบบขัดข้องชั่วคราว กรุณาลองอีกครั้ง หากยังพบปัญหา กรุณาแจ้งผู้ดูแลระบบ";
}
