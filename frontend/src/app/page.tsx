import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon } from "@/csmju";
import NearMeButton from "../components/features/NearMeButton";
import PlacesMap from "../components/features/PlacesMap";
import Stars from "../components/features/Stars";
import { MapIcon, SearchOffIcon } from "../components/icons";
import { alertError, card, fieldLabel, input, link, muted, pageTitle, primaryButton, secondaryButton, small, tag } from "../components/ui";
import { can, getMe, hasSession, isUnauthorized, listPlaces, listProvinces, listTags, type PlaceQuery } from "../lib/api";
import { describeError, formatAllowance, formatKm, googleMapsUrl, provinceLabel } from "../lib/format";
import Flash from "./_components/Flash";
import ReSignIn from "./_components/ReSignIn";
import SignedOut from "./_components/SignedOut";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "สถานที่ฝึกงาน" };

/** Places per page of the list (api-conventions.md: ?page=&limit=, at most 100). */
const PAGE_SIZE = 20;

/** The map asks for one page of the largest size the API allows. */
const MAP_LIMIT = 100;

const SORTS: Array<{ value: string; label: string }> = [
  { value: "rank", label: "อันดับยอดนิยม" },
  { value: "rating", label: "คะแนนเฉลี่ย" },
  { value: "allowance", label: "เบี้ยเลี้ยงสูงสุด" },
  { value: "reviews", label: "จำนวนรีวิว" },
  { value: "distance", label: "ใกล้ ม.แม่โจ้" },
  { value: "newest", label: "เพิ่มล่าสุด" },
];

type Search = PlaceQuery & { ok?: string; error?: string };

/** The same search with another page number, for the pager links. */
function pageHref(query: PlaceQuery, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && key !== "page" && key !== "limit") params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/?${search}` : "/";
}

export default async function HomePage({ searchParams }: { searchParams: Promise<Search> }) {
  const { ok, error, ...query } = await searchParams;

  const me = await getMe();
  if (!me.ok) {
    // A session that ended renews itself; a visitor who never signed in gets the button.
    if (me.status === 401 && (await hasSession())) return <ReSignIn />;
    return <SignedOut reason={me.status === 401 ? null : describeError(me.code, me.message)} />;
  }

  const { page: _page, limit: _limit, ...search } = query;
  const near = Boolean(query.nearLat && query.nearLng);
  const filtered = Object.values(search).some(Boolean);
  const [places, mapPlaces, provinceList, tags] = await Promise.all([
    listPlaces({ ...query, limit: String(PAGE_SIZE) }),
    // The map shows the matches of every page, not only this one (up to MAP_LIMIT).
    listPlaces({ ...search, limit: String(MAP_LIMIT) }),
    listProvinces(),
    listTags(),
  ]);
  if (isUnauthorized(places, mapPlaces, provinceList, tags)) return <ReSignIn />;

  const provinces = provinceList.ok ? provinceList.data.map((province) => province.name).sort((a, b) => a.localeCompare(b, "th")) : [];
  const mapTotal = mapPlaces.ok ? (mapPlaces.meta?.total ?? mapPlaces.data.length) : 0;
  const tagLabel = new Map(tags.ok ? tags.data.map((item) => [item.key, item.label]) : []);
  const meta = places.ok ? places.meta : undefined;
  const currentPage = meta?.page ?? 1;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <>
      <div className="fade-slide-up">
        <h1 className={`${pageTitle} mb-2`}>สถานที่ฝึกงาน/สหกิจศึกษา</h1>
        <p className={muted}>อันดับ เบี้ยเลี้ยง ข้อควรระวัง และพิกัด จากรีวิวของรุ่นพี่ CSMJU</p>
      </div>

      <Flash ok={ok} error={error} />

      <form className={`${card} grid gap-4 sm:grid-cols-2 lg:grid-cols-4`} method="get" role="search" aria-label="ค้นหาและตัวกรอง">
        <label className={`${fieldLabel} sm:col-span-2 lg:col-span-4`}>
          ค้นหา
          <span className="relative block">
            <SearchIcon className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-outline" />
            <input className={`${input} pl-10`} type="search" name="q" defaultValue={query.q ?? ""} placeholder="ชื่อบริษัท จังหวัด หรือคำในรีวิว" maxLength={100} />
          </span>
        </label>
        <label className={fieldLabel}>
          จังหวัด
          <select className={input} name="province" defaultValue={query.province ?? ""}>
            <option value="">ทุกจังหวัด</option>
            {provinces.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldLabel}>
          เบี้ยเลี้ยง
          <select className={input} name="allowance" defaultValue={query.allowance ?? ""}>
            <option value="">ทั้งหมด</option>
            <option value="paid">มีเบี้ยเลี้ยง</option>
            <option value="free">ไม่มีเบี้ยเลี้ยง</option>
          </select>
        </label>
        <label className={fieldLabel}>
          คะแนน
          <select className={input} name="minRating" defaultValue={query.minRating ?? ""}>
            <option value="">ทุกคะแนน</option>
            <option value="4">4 ดาวขึ้นไป</option>
            <option value="3">3 ดาวขึ้นไป</option>
          </select>
        </label>
        <label className={fieldLabel}>
          สายงาน
          <select className={input} name="tag" defaultValue={query.tag ?? ""}>
            <option value="">ทุกสายงาน</option>
            {tags.ok &&
              tags.data.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
          </select>
        </label>
        <label className={fieldLabel}>
          เรียงตาม
          <select className={input} name="sort" defaultValue={query.sort ?? "rank"}>
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {near && sort.value === "distance" ? "ใกล้ฉัน" : sort.label}
              </option>
            ))}
          </select>
        </label>
        {near && (
          <>
            <input type="hidden" name="nearLat" value={query.nearLat} />
            <input type="hidden" name="nearLng" value={query.nearLng} />
          </>
        )}
        <div className="flex flex-wrap items-end gap-3 sm:col-span-2 lg:col-span-3">
          <button className={primaryButton} type="submit">
            ค้นหา
          </button>
          <NearMeButton />
          {filtered && (
            <Link className={secondaryButton} href="/">
              ล้างตัวกรอง
            </Link>
          )}
        </div>
      </form>

      {!places.ok ? (
        <p className={alertError} role="alert">
          {describeError(places.code, places.message)}
        </p>
      ) : places.data.length === 0 && (meta?.total ?? 0) > 0 ? (
        <section className={`${card} flex flex-col items-center gap-3 py-12 text-center`}>
          <h2 className="font-display text-headline-md text-on-surface">ไม่มีหน้านี้</h2>
          <p className={muted}>รายการมีทั้งหมด {totalPages} หน้า</p>
          <Link className={secondaryButton} href={pageHref(query, 1)}>
            กลับไปหน้าแรก
          </Link>
        </section>
      ) : places.data.length === 0 ? (
        <section className={`${card} flex flex-col items-center gap-3 py-12 text-center`}>
          {filtered ? (
            <>
              <SearchOffIcon className="h-12 w-12 text-outline" />
              <h2 className="font-display text-headline-md text-on-surface">ไม่พบสถานที่ฝึกงานตรงตามเงื่อนไข</h2>
              <p className={muted}>ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p>
              <Link className={secondaryButton} href="/">
                ล้างตัวกรอง
              </Link>
            </>
          ) : (
            <>
              <MapIcon className="h-12 w-12 text-outline" />
              <h2 className="font-display text-headline-md text-on-surface">ยังไม่มีสถานที่ฝึกงาน</h2>
              <p className={muted}>เพิ่มที่ที่เคยฝึกงานพร้อมรีวิว เพื่อช่วยรุ่นน้องเลือกที่ฝึกงาน</p>
              {can.addPlace(me.data) && (
                <Link className={primaryButton} href="/internship-places/new">
                  เพิ่มสถานที่ฝึกงาน
                </Link>
              )}
            </>
          )}
        </section>
      ) : (
        <>
          <p className={small} aria-live="polite">
            พบ <span className="tabular-nums">{(meta?.total ?? places.data.length).toLocaleString("th-TH")}</span> แห่ง
            {totalPages > 1 && ` · หน้า ${currentPage} จาก ${totalPages}`}
          </p>
          {mapTotal > MAP_LIMIT && (
            <p className={small}>
              แผนที่แสดง {MAP_LIMIT} แห่งแรกจาก {mapTotal.toLocaleString("th-TH")} แห่ง — ใช้ตัวกรองเพื่อดูส่วนที่เหลือ
            </p>
          )}
          {mapPlaces.ok && (
            <PlacesMap
              places={mapPlaces.data.map(({ id, name, latitude, longitude, averageScore, reviewCount }) => ({
                id,
                name,
                latitude,
                longitude,
                averageScore,
                reviewCount,
              }))}
              origin={near ? { lat: Number(query.nearLat), lng: Number(query.nearLng) } : undefined}
            />
          )}
          <ol className="space-y-4">
            {places.data.map((place) => (
              <li key={place.id} className={`${card} flex flex-col gap-3`}>
                <div className="flex flex-wrap items-start gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container/10 text-label-md tabular-nums text-primary-container"
                    aria-label={`อันดับที่ ${place.rank} ของทั้งหมด`}
                    title="อันดับจากคะแนนรีวิวของทั้งระบบ"
                  >
                    {place.rank}
                  </span>
                  <div className="min-w-0 flex-1 basis-48">
                    <h2 className="break-words font-display text-headline-md text-on-surface">
                      <Link className="hover:text-primary-container hover:underline" href={`/internship-places/${encodeURIComponent(place.id)}`}>
                        {place.name}
                      </Link>
                    </h2>
                    <p className={small}>
                      {provinceLabel(place.province)} · {near ? "ห่างจากคุณ" : "ห่าง ม.แม่โจ้"} {formatKm(place.distanceKm)}
                    </p>
                  </div>
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-label-sm ${
                      place.dailyAllowanceSatang > 0 ? "bg-success/10 text-emerald-700" : "bg-surface-variant text-on-surface-variant"
                    }`}
                  >
                    {formatAllowance(place.dailyAllowanceSatang)}
                  </span>
                </div>
                {place.tags.length > 0 && (
                  <ul className="flex flex-wrap gap-2" aria-label="สายงาน">
                    {place.tags.map((key) => (
                      <li key={key} className={tag}>
                        {tagLabel.get(key) ?? key}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="line-clamp-2 break-words text-body-md text-on-surface-variant">{place.notes}</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {place.reviewCount > 0 ? (
                    <span className="inline-flex items-center gap-2">
                      <Stars score={place.averageScore} />
                      <span className={`${small} tabular-nums`}>
                        {place.averageScore.toLocaleString("th-TH", { maximumFractionDigits: 1 })} · {place.reviewCount} รีวิว
                      </span>
                    </span>
                  ) : (
                    <span className={small}>ยังไม่มีรีวิว</span>
                  )}
                  <span className="flex flex-wrap gap-4">
                    <Link className={link} href={`/internship-places/${encodeURIComponent(place.id)}`}>
                      ดูรายละเอียด
                    </Link>
                    <a className={link} href={googleMapsUrl(place.latitude, place.longitude)} target="_blank" rel="noopener noreferrer">
                      Google Maps
                    </a>
                  </span>
                </div>
              </li>
            ))}
          </ol>
          {totalPages > 1 && (
            <nav className="flex flex-wrap items-center justify-center gap-3" aria-label="เปลี่ยนหน้า">
              {currentPage > 1 && (
                <Link className={secondaryButton} href={pageHref(query, currentPage - 1)}>
                  หน้าก่อนหน้า
                </Link>
              )}
              <span className={small}>
                หน้า {currentPage} จาก {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link className={secondaryButton} href={pageHref(query, currentPage + 1)}>
                  หน้าถัดไป
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
