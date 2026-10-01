"use server";

import { redirect } from "next/navigation";
import { call, type ApiResult, type PlaceDetail } from "../lib/api";
import { describeError } from "../lib/format";

/**
 * Form actions. Each forwards the SSO cookie to the backend, which checks the
 * permission itself - hiding a button is only a convenience. Results come
 * back to the page as ?ok= / ?error= so the forms work without client JS.
 */

function samePath(value: FormDataEntryValue | null, fallback: string): string {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : fallback;
}

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

function placeBody(formData: FormData) {
  return {
    name: text(formData, "name"),
    province: text(formData, "province"),
    latitude: Number(text(formData, "latitude")),
    longitude: Number(text(formData, "longitude")),
    dailyAllowanceSatang: allowanceSatang(formData),
    workHours: text(formData, "workHours"),
    notes: text(formData, "notes"),
    tags: formData.getAll("tags").map(String),
  };
}

export async function createPlace(formData: FormData) {
  const formPath = "/internship-places/new";
  if (!text(formData, "latitude") || !text(formData, "longitude")) {
    redirect(withParams(formPath, { error: "กรุณาปักหมุดตำแหน่งบนแผนที่" }));
  }

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
  if (score !== undefined) {
    const review = await call(`/api/v1/internship-places/${encodeURIComponent(created.data.id)}/reviews`, {
      method: "POST",
      body: {
        score,
        comment: text(formData, "comment"),
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
  const placePath = samePath(formData.get("returnTo"), `/internship-places/${encodeURIComponent(placeId)}`);
  const body = {
    score: optionalInt(formData, "score"),
    comment: text(formData, "comment"),
    position: text(formData, "position"),
    internshipYear: optionalInt(formData, "internshipYear"),
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
