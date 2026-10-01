import type { Metadata } from "next";
import Link from "next/link";
import PlacesMap from "../components/features/PlacesMap";
import Stars from "../components/features/Stars";
import { can, getMe, hasSession, isUnauthorized, listPlaces, listTags, type PlaceQuery } from "../lib/api";
import { describeError, formatAllowance, formatKm, googleMapsUrl, provinceLabel } from "../lib/format";
import ReSignIn from "./_components/ReSignIn";
import Shell, { Flash } from "./_components/Shell";
import SignedOut from "./_components/SignedOut";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "สถานที่ฝึกงาน · ระบบสถานที่ฝึกงาน · CSMJU",
};

const SORTS: Array<{ value: string; label: string }> = [
  { value: "rank", label: "อันดับยอดนิยม" },
  { value: "rating", label: "คะแนนเฉลี่ย" },
  { value: "allowance", label: "เบี้ยเลี้ยงสูงสุด" },
  { value: "reviews", label: "จำนวนรีวิว" },
  { value: "distance", label: "ใกล้ ม.แม่โจ้" },
  { value: "newest", label: "เพิ่มล่าสุด" },
];

type Search = PlaceQuery & { ok?: string; error?: string };

export default async function HomePage({ searchParams }: { searchParams: Promise<Search> }) {
  const { ok, error, ...query } = await searchParams;

  const me = await getMe();
  if (!me.ok) {
    // A session that ended renews itself; a visitor who never signed in gets the button.
    if (me.status === 401 && (await hasSession())) return <ReSignIn />;
    return <SignedOut reason={me.status === 401 ? null : describeError(me.code, me.message)} />;
  }

  const filtered = Object.values(query).some(Boolean);
  const [places, all, tags] = await Promise.all([
    listPlaces(query),
    filtered ? listPlaces({}) : Promise.resolve(null),
    listTags(),
  ]);
  if (isUnauthorized(places, tags, ...(all ? [all] : []))) return <ReSignIn />;

  const everyPlace = all?.ok ? all.data : places.ok ? places.data : [];
  const provinces = [...new Set(everyPlace.map((place) => place.province))].sort((a, b) => a.localeCompare(b, "th"));
  const tagLabel = new Map(tags.ok ? tags.data.map((tag) => [tag.key, tag.label]) : []);

  return (
    <Shell me={me.data} active="places">
      <div className="page-head page-head-row">
        <div>
          <h1>สถานที่ฝึกงาน/สหกิจศึกษา</h1>
          <p className="muted">อันดับ เบี้ยเลี้ยง ข้อควรระวัง และพิกัด จากรีวิวของรุ่นพี่ CSMJU</p>
        </div>
        {can.addPlace(me.data) && (
          <Link className="btn btn-primary" href="/internship-places/new">
            เพิ่มสถานที่ฝึกงาน
          </Link>
        )}
      </div>

      <Flash ok={ok} error={error} />

      <form className="card filters" method="get" role="search" aria-label="ค้นหาและตัวกรอง">
        <label className="filter-grow">
          ค้นหา
          <input type="search" name="q" defaultValue={query.q ?? ""} placeholder="ชื่อบริษัท จังหวัด หรือคำในรีวิว" maxLength={100} />
        </label>
        <label>
          จังหวัด
          <select name="province" defaultValue={query.province ?? ""}>
            <option value="">ทุกจังหวัด</option>
            {provinces.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </label>
        <label>
          เบี้ยเลี้ยง
          <select name="allowance" defaultValue={query.allowance ?? ""}>
            <option value="">ทั้งหมด</option>
            <option value="paid">มีเบี้ยเลี้ยง</option>
            <option value="free">ไม่มีเบี้ยเลี้ยง</option>
          </select>
        </label>
        <label>
          คะแนน
          <select name="minRating" defaultValue={query.minRating ?? ""}>
            <option value="">ทุกคะแนน</option>
            <option value="4">4 ดาวขึ้นไป</option>
            <option value="3">3 ดาวขึ้นไป</option>
          </select>
        </label>
        <label>
          สายงาน
          <select name="tag" defaultValue={query.tag ?? ""}>
            <option value="">ทุกสายงาน</option>
            {tags.ok &&
              tags.data.map((tag) => (
                <option key={tag.key} value={tag.key}>
                  {tag.label}
                </option>
              ))}
          </select>
        </label>
        <label>
          เรียงตาม
          <select name="sort" defaultValue={query.sort ?? "rank"}>
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </label>
        <div className="filter-actions">
          <button className="btn btn-primary" type="submit">
            ค้นหา
          </button>
          {filtered && (
            <Link className="btn btn-secondary" href="/">
              ล้างตัวกรอง
            </Link>
          )}
        </div>
      </form>

      {!places.ok ? (
        <p className="alert" role="alert">
          {describeError(places.code, places.message)}
        </p>
      ) : places.data.length === 0 ? (
        <section className="card empty">
          <h2>ไม่พบสถานที่ฝึกงานตรงตามเงื่อนไข</h2>
          <p className="muted">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p>
          {filtered && (
            <Link className="btn btn-secondary" href="/">
              ล้างตัวกรอง
            </Link>
          )}
        </section>
      ) : (
        <>
          <p className="muted small" aria-live="polite">
            พบ <span className="tabular">{places.data.length.toLocaleString("th-TH")}</span> แห่ง
          </p>
          <PlacesMap
            places={places.data.map(({ id, name, latitude, longitude, averageScore, reviewCount }) => ({
              id,
              name,
              latitude,
              longitude,
              averageScore,
              reviewCount,
            }))}
          />
          <ol className="place-list">
            {places.data.map((place, index) => (
              <li key={place.id} className="card place-card">
                <div className="place-card-head">
                  <span className="rank-badge tabular" aria-label={`ลำดับที่ ${index + 1}`}>
                    {index + 1}
                  </span>
                  <div className="place-card-title">
                    <h2>
                      <Link href={`/internship-places/${encodeURIComponent(place.id)}`}>{place.name}</Link>
                    </h2>
                    <p className="muted small">
                      {provinceLabel(place.province)} · ห่าง ม.แม่โจ้ {formatKm(place.distanceKm)}
                    </p>
                  </div>
                  <span className={`badge ${place.dailyAllowanceSatang > 0 ? "badge-ok" : "badge-muted"}`}>
                    {formatAllowance(place.dailyAllowanceSatang)}
                  </span>
                </div>
                {place.tags.length > 0 && (
                  <ul className="tag-list" aria-label="สายงาน">
                    {place.tags.map((tag) => (
                      <li key={tag} className="tag">
                        {tagLabel.get(tag) ?? tag}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="place-notes">{place.notes}</p>
                <div className="place-card-foot">
                  {place.reviewCount > 0 ? (
                    <span>
                      <Stars score={place.averageScore} />{" "}
                      <span className="muted small tabular">
                        {place.averageScore.toLocaleString("th-TH", { maximumFractionDigits: 1 })} · {place.reviewCount} รีวิว
                      </span>
                    </span>
                  ) : (
                    <span className="muted small">ยังไม่มีรีวิว</span>
                  )}
                  <span className="place-links">
                    <Link href={`/internship-places/${encodeURIComponent(place.id)}`}>ดูรายละเอียด</Link>
                    <a href={googleMapsUrl(place.latitude, place.longitude)} target="_blank" rel="noopener noreferrer">
                      Google Maps
                    </a>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </Shell>
  );
}
