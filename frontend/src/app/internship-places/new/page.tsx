import type { Metadata } from "next";
import PlaceForm from "../../../components/features/PlaceForm";
import { alertError, muted, pageTitle } from "../../../components/ui";
import { can, getMe, hasSession, isUnauthorized, listProvinces, listTags } from "../../../lib/api";
import { describeError } from "../../../lib/format";
import { createPlace } from "../../actions";
import ReSignIn from "../../_components/ReSignIn";
import Flash from "../../_components/Flash";
import SignedOut from "../../_components/SignedOut";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "เพิ่มสถานที่ฝึกงาน" };

export default async function NewPlacePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  const me = await getMe();
  if (!me.ok) {
    if (me.status === 401 && (await hasSession())) return <ReSignIn />;
    return <SignedOut next="/internship-places/new" reason={me.status === 401 ? null : describeError(me.code, me.message)} />;
  }

  const [tags, provinces] = await Promise.all([listTags(), listProvinces()]);
  if (isUnauthorized(tags, provinces)) return <ReSignIn />;
  if (!tags.ok) throw new Error(tags.code);

  return (
    <>
      <div className="fade-slide-up">
        <h1 className={`${pageTitle} mb-2`}>เพิ่มสถานที่ฝึกงาน</h1>
        <p className={muted}>ระบบตรวจชื่อซ้ำให้ ถ้ามีสถานที่นี้อยู่แล้วจะพาไปเขียนรีวิวที่สถานที่เดิม</p>
      </div>
      <Flash error={error} />
      {can.addPlace(me.data) ? (
        <PlaceForm action={createPlace} tags={tags.data} provinces={provinces.ok ? provinces.data : []} withReview cancelHref="/" />
      ) : (
        <p className={alertError} role="alert">
          คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบย่อยนี้
        </p>
      )}
    </>
  );
}
