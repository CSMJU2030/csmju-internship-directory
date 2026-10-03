import { describeError, formatAllowance, formatDate, formatKm, googleMapsUrl, pinTone, provinceLabel, starsLabel } from "./format";

describe("formatAllowance", () => {
  it("shows baht per day from satang", () => {
    expect(formatAllowance(35_000)).toBe("350 บาท/วัน");
    expect(formatAllowance(12_550)).toBe("125.5 บาท/วัน");
  });

  it("says there is none for zero", () => {
    expect(formatAllowance(0)).toBe("ไม่มีเบี้ยเลี้ยง");
  });
});

describe("formatKm", () => {
  it("uses metres below one kilometre", () => {
    expect(formatKm(0.42)).toBe("420 ม.");
  });

  it("keeps one decimal below ten kilometres and none above", () => {
    expect(formatKm(4.3)).toBe("4.3 กม.");
    expect(formatKm(145.4)).toBe("145 กม.");
  });
});

describe("provinceLabel", () => {
  it("prefixes จ. except for Bangkok", () => {
    expect(provinceLabel("เชียงใหม่")).toBe("จ.เชียงใหม่");
    expect(provinceLabel("กรุงเทพมหานคร")).toBe("กรุงเทพมหานคร");
  });
});

describe("formatDate", () => {
  it("shows Bangkok time in the Buddhist era", () => {
    // 17:30 UTC on 31 Dec is already 1 Jan in Bangkok.
    expect(formatDate("2025-12-31T17:30:00Z")).toContain("2569");
  });
});

describe("starsLabel and pinTone", () => {
  it("reads the score out", () => {
    expect(starsLabel(4.25)).toBe("4.3 จาก 5 ดาว");
  });

  it("colours pins by average score", () => {
    expect(pinTone(0)).toContain("bg-outline");
    expect(pinTone(4.6)).toContain("bg-success");
    expect(pinTone(3.5)).toContain("bg-primary-container");
    expect(pinTone(2.5)).toContain("bg-amber-500");
    expect(pinTone(1.2)).toContain("bg-error");
  });
});

describe("describeError", () => {
  it("keeps the backend's Thai message", () => {
    expect(describeError("VALIDATION_ERROR", "ชื่อสถานที่ต้องไม่ว่าง")).toBe("ชื่อสถานที่ต้องไม่ว่าง");
  });

  it("falls back to the standard text by code, then a generic one", () => {
    expect(describeError("FORBIDDEN", "Forbidden")).toMatch(/ไม่มีสิทธิ์/);
    expect(describeError("SOMETHING_NEW", "boom")).toMatch(/ระบบขัดข้อง/);
  });
});

describe("googleMapsUrl", () => {
  it("is built from coordinates only", () => {
    expect(googleMapsUrl(18.8, 99.01)).toBe("https://www.google.com/maps/search/?api=1&query=18.8,99.01");
  });
});
