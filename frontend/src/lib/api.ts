import { cookies } from "next/headers";
import type { components } from "./api-types";

/**
 * Server-only client for this subsystem's own backend. The browser never
 * calls the backend with a token of its own: pages and server actions
 * forward the HttpOnly SSO cookie, and the backend verifies it against the
 * Core Hub JWKS on every request.
 *
 * Response types come from backend/openapi.json (tech-stack.md 3) -
 * regenerate with `pnpm --filter frontend generate:api-types`.
 */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:4218";

/**
 * The session cookie the backend sets at /auth/callback: `<SUBSYSTEM_ID>_access_token`
 * with `-` as `_` (auth-contract 5.1). HttpOnly - only this server reads it.
 */
export const SSO_COOKIE = `${(process.env.SUBSYSTEM_ID ?? "csmju-internship-directory").replace(/-/g, "_")}_access_token`;

export type PlaceSummary = components["schemas"]["PlaceSummaryDto"];
export type PlaceDetail = components["schemas"]["PlaceDetailDto"];
export type Review = components["schemas"]["ReviewViewDto"];
export type PlaceTag = components["schemas"]["PlaceTagDto"];
export type Province = components["schemas"]["ProvinceDto"];
export type MyReview = components["schemas"]["MyReviewDto"];

export type SubsystemRole = "STUDENT" | "ALUMNI" | "STAFF" | "ADMIN" | "VIEWER";

/** Role names as the app shell shows them (ui-design-system.md 10.3). */
export const ROLE_LABEL: Record<SubsystemRole, string> = {
  STUDENT: "นักศึกษา",
  ALUMNI: "ศิษย์เก่า",
  STAFF: "เจ้าหน้าที่/อาจารย์",
  ADMIN: "ผู้ดูแลระบบ",
  VIEWER: "ผู้เยี่ยมชม",
};

/** GET /api/v1/me - kept by hand: the copied auth controller has no response class. */
export type Me = {
  id: string;
  email: string;
  coreRole: string;
  subsystemRole: SubsystemRole;
  /** `expiresAt` is the token's exp: the session renews through /auth/login then. */
  session: { expiresAt: string | null };
};

export type PageMeta = { total: number; page: number; limit: number; totalPages: number };

type Envelope<T> =
  | { success: true; data: T; meta?: PageMeta }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export type ApiResult<T> =
  | { ok: true; data: T; meta?: PageMeta }
  | { ok: false; status: number; code: string; message: string; details?: unknown };

/**
 * What each role may do, mirroring backend/src/auth/permissions.ts. Hiding a
 * button is only a convenience - the backend checks every request itself.
 */
export const can = {
  addPlace: (me: Me) => me.subsystemRole !== "VIEWER",
  review: (me: Me) => me.subsystemRole !== "VIEWER",
  managePlaces: (me: Me) => me.subsystemRole === "STAFF" || me.subsystemRole === "ADMIN",
  moderateReviews: (me: Me) => me.subsystemRole === "STAFF" || me.subsystemRole === "ADMIN",
};

/**
 * The backend answered 401: no session, or one that ended (expired, or Core
 * Hub signed the user out). The page then renders <ReSignIn />.
 */
export const isUnauthorized = (...results: ApiResult<unknown>[]) =>
  results.some((result) => !result.ok && result.status === 401);

/** Whether this browser has a session cookie at all - a first visit has none. */
export async function hasSession(): Promise<boolean> {
  return (await cookies()).has(SSO_COOKIE);
}

export async function call<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const token = (await cookies()).get(SSO_COOKIE)?.value;
  if (!token) return { ok: false, status: 401, code: "UNAUTHORIZED", message: "ยังไม่ได้เข้าสู่ระบบ" };

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Cookie: `${SSO_COOKIE}=${encodeURIComponent(token)}`,
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 503, code: "SERVICE_UNAVAILABLE", message: "เชื่อมต่อ backend ของระบบย่อยไม่ได้" };
  }

  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (res.ok && body?.success) return { ok: true, data: body.data, meta: body.meta };
  if (body && !body.success) {
    return { ok: false, status: res.status, code: body.error.code, message: body.error.message, details: body.error.details };
  }
  return { ok: false, status: res.status, code: "INTERNAL_ERROR", message: `HTTP ${res.status}` };
}

/** GET /api/v1/me - the identity the backend verified from the Core Hub token. */
export const getMe = () => call<Me>("/api/v1/me");

export type PlaceQuery = {
  q?: string;
  province?: string;
  allowance?: "paid" | "free";
  minRating?: string;
  tag?: string;
  sort?: string;
  page?: string;
  /** Page size, 1-100 (api-conventions.md); the list asks for 20, the map for 100. */
  limit?: string;
  /** Sort and measure distance from here instead of the university (rounded, from NearMeButton). */
  nearLat?: string;
  nearLng?: string;
};

export function listPlaces(query: PlaceQuery) {
  const params = new URLSearchParams({ limit: "100" });
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  return call<PlaceSummary[]>(`/api/v1/internship-places?${params.toString()}`);
}

export const listTags = () => call<PlaceTag[]>("/api/v1/internship-places/tags");

/** Provinces that already have places, most used first. */
export const listProvinces = () => call<Province[]>("/api/v1/internship-places/provinces");

/** The signed-in user's own reviews with their places, newest first. */
export const listMyReviews = () => call<MyReview[]>("/api/v1/internship-places/my-reviews");

export const getPlace = (id: string) => call<PlaceDetail>(`/api/v1/internship-places/${encodeURIComponent(id)}`);

/** GET /api/health - public, used on the signed-out page. */
export async function getHealth(): Promise<{ status: string; service?: string } | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`, { cache: "no-store" });
    const body = (await res.json()) as Envelope<{ status: string; service?: string }>;
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}
