"use server";

import { redirect } from "next/navigation";
import { call, type ApiResult, type PlaceDetail } from "../lib/api";
import { describeError } from "../lib/format";

/**
 * Form actions. Each forwards the SSO cookie to the backend, which checks the
 * permission itself - hiding a button is only a convenience. Results come
 * back to the page as ?ok= / ?error= so the forms work without client JS.
 */

function withParams(path: string, params: Record<string, string>): string {
  const [base, query = ""] = path.split("?");
  const merged = new URLSearchParams(query);
  merged.delete("ok");
  merged.delete("error");
  for (const [key, value] of Object.entries(params)) merged.set(key, value);
  return `${base}?${merged.toString()}`;
}

/**
 * The backend answered 401 to a form: the session ended. An action cannot
 * navigate the top-level page to /auth/login, so /signin-again asks the user
 * and does it (auth-contract 7), then returns to the form's page.
 */
function signInAgain(path: string): never {
  const page = withParams(path, { error: "การเข้าสู่ระบบหมดอายุ กรุณาส่งอีกครั้ง" });
  redirect(`/signin-again?${new URLSearchParams({ next: page })}`);
}

function back(path: string, result: ApiResult<unknown>, ok: string): never {
  if (!result.ok && result.status === 401) signInAgain(path);
  redirect(withParams(path, result.ok ? { ok } : { error: describeError(result.code, result.message) }));
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();
const optionalText = (formData: FormData, name: string) => text(formData, name) || undefined;

function optionalInt(formData: FormData, name: string): number | undefined {
  const value = text(formData, name);
  return value === "" ? undefined : Number(value);
}

/** Baht with up to 2 decimals from the form, integer satang for the API (data-dictionary.md 5). */
function allowanceSatang(formData: FormData): number {
  const baht = Number(text(formData, "allowanceBaht") || "0");
  return Number.isFinite(baht) ? Math.round(baht * 100) : Number.NaN;
}

/** The backend takes at most this many fields of work per place. */
const MAX_TAGS = 5;

/**
 * Ticked fields of work plus the ones typed into "เพิ่มสายงาน" - the box takes
 * several separated by commas, so it works before (or without) JavaScript too.
 */
function placeTags(formData: FormData): string[] {
  const typed = text(formData, "newTags")
    .split(/[,;]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  // The same words ticked and typed again count once.
  const seen = new Set<string>();
  return [...formData.getAll("tags").map(String), ...typed].filter((tag) => {
    const key = tag.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Too many fields of work: say so plainly instead of the backend's validation text. */
function checkTags(formData: FormData, formPath: string): void {
  if (placeTags(formData).length > MAX_TAGS) {
    redirect(withParams(formPath, { error: `เลือกสายงานได้สูงสุด ${MAX_TAGS} สายงาน (รวมที่พิมพ์เพิ่ม)` }));
  }
}

function placeBody(formData: FormData) {
  return {
    name: text(formData, "name"),
    province: text(formData, "province"),
    latitude: Number(text(formData, "latitude")),
    longitude: Number(text(formData, "longitude")),
    dailyAllowanceSatang: allowanceSatang(formData),
    workHours: text(formData, "workHours"),
    notes: text(formData, "notes"),
    tags: placeTags(formData),
  };
}

export async function createPlace(formData: FormData) {
  const formPath = "/internship-places/new";
  if (!text(formData, "latitude") || !text(formData, "longitude")) {
    redirect(withParams(formPath, { error: "กรุณาปักหมุดตำแหน่งบนแผนที่" }));
  }
  checkTags(formData, formPath);

  const created = await call<PlaceDetail>("/api/v1/internship-places", { method: "POST", body: placeBody(formData) });
  if (!created.ok) {
    // The same company already exists: send the user there to review it instead.
    const existing = (created.details as { placeId?: string } | undefined)?.placeId;
    if (created.status === 409 && existing) {
      redirect(withParams(`/internship-places/${encodeURIComponent(existing)}`, { error: "มีสถานที่นี้ในระบบแล้ว เขียนรีวิวที่นี่ได้เลย" }));
    }
    back(formPath, created, "");
  }

  const placePath = `/internship-places/${encodeURIComponent(created.data.id)}`;
  const score = optionalInt(formData, "score");
  const wroteSomething = Boolean(text(formData, "comment") || text(formData, "position") || text(formData, "internshipYear"));
  if (score === undefined && wroteSomething) {
    // The place is saved; only the review is missing its score.
    redirect(withParams(placePath, { error: "เพิ่มสถานที่แล้ว แต่รีวิวยังไม่ได้บันทึก เพราะยังไม่ได้ให้คะแนนดาว" }));
  }
  if (score !== undefined) {
    const review = await call(`/api/v1/internship-places/${encodeURIComponent(created.data.id)}/reviews`, {
      method: "POST",
      body: {
        score,
        comment: optionalText(formData, "comment"),
        position: optionalText(formData, "position"),
        internshipYear: optionalInt(formData, "internshipYear"),
      },
    });
    back(placePath, review, "เพิ่มสถานที่และรีวิวแล้ว");
  }
  redirect(withParams(placePath, { ok: "เพิ่มสถานที่แล้ว" }));
}

export async function updatePlace(formData: FormData) {
  const id = text(formData, "id");
  const placePath = `/internship-places/${encodeURIComponent(id)}`;
  checkTags(formData, `${placePath}/edit`);
  const result = await call(`/api/v1/internship-places/${encodeURIComponent(id)}`, { method: "PATCH", body: placeBody(formData) });
  back(result.ok ? placePath : `${placePath}/edit`, result, "บันทึกการแก้ไขแล้ว");
}

export async function deletePlace(formData: FormData) {
  const id = text(formData, "id");
  const result = await call(`/api/v1/internship-places/${encodeURIComponent(id)}`, { method: "DELETE" });
  back(result.ok ? "/" : `/internship-places/${encodeURIComponent(id)}`, result, "ลบสถานที่แล้ว");
}

export async function saveReview(formData: FormData) {
  const placeId = text(formData, "placeId");
  const reviewId = text(formData, "reviewId");
  const placePath = `/internship-places/${encodeURIComponent(placeId)}`;
  const body = {
    score: optionalInt(formData, "score"),
    // Empty on edit clears the text; empty on a new review sends none.
    comment: reviewId ? text(formData, "comment") : optionalText(formData, "comment"),
    position: text(formData, "position"),
    // "ไม่ระบุ" on edit sends null so the year is cleared; an omitted field would keep it.
    internshipYear: reviewId ? (optionalInt(formData, "internshipYear") ?? null) : optionalInt(formData, "internshipYear"),
  };

  const base = `/api/v1/internship-places/${encodeURIComponent(placeId)}/reviews`;
  const result = reviewId
    ? await call(`${base}/${encodeURIComponent(reviewId)}`, { method: "PATCH", body })
    : await call(base, { method: "POST", body });
  back(placePath, result, reviewId ? "แก้ไขรีวิวแล้ว" : "บันทึกรีวิวแล้ว ขอบคุณที่แบ่งปันประสบการณ์");
}

export async function deleteReview(formData: FormData) {
  const placeId = text(formData, "placeId");
  const reviewId = text(formData, "reviewId");
  const result = await call(
    `/api/v1/internship-places/${encodeURIComponent(placeId)}/reviews/${encodeURIComponent(reviewId)}`,
    { method: "DELETE" },
  );
  back(`/internship-places/${encodeURIComponent(placeId)}`, result, "ลบรีวิวแล้ว");
}
