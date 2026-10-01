import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PlaceForm from "../../../../components/features/PlaceForm";
import { can, getMe, getPlace, hasSession, isUnauthorized, listTags } from "../../../../lib/api";
import { describeError } from "../../../../lib/format";
import { updatePlace } from "../../../actions";
import ReSignIn from "../../../_components/ReSignIn";
import Shell, { Flash } from "../../../_components/Shell";
import SignedOut from "../../../_components/SignedOut";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "แก้ไขข้อมูลสถานที่ · ระบบสถานที่ฝึกงาน · CSMJU",
};

export default async function EditPlacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const placePath = `/internship-places/${encodeURIComponent(id)}`;

  const me = await getMe();
  if (!me.ok) {
    if (me.status === 401 && (await hasSession())) return <ReSignIn />;
    return <SignedOut next={`${placePath}/edit`} reason={me.status === 401 ? null : describeError(me.code, me.message)} />;
  }

  const [place, tags] = await Promise.all([getPlace(id), listTags()]);
  if (isUnauthorized(place, tags)) return <ReSignIn />;
  if (!place.ok && (place.status === 404 || place.status === 400)) notFound();
  if (!place.ok || !tags.ok) throw new Error("load failed");

  return (
    <Shell me={me.data}>
      <div className="page-head">
        <h1>แก้ไขข้อมูลสถานที่</h1>
        <p className="muted">{place.data.name}</p>
      </div>
      <Flash error={error} />
      {can.managePlaces(me.data) ? (
        <PlaceForm action={updatePlace} tags={tags.data} place={place.data} cancelHref={placePath} />
      ) : (
        <p className="alert" role="alert">
          คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบย่อยนี้
        </p>
      )}
    </Shell>
  );
}
