"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MyLocationIcon } from "../icons";
import { alertError, tonalButton } from "../ui";

/** Two decimals is about one kilometre - enough to sort places, without the exact spot. */
const round = (value: number) => value.toFixed(2);

/**
 * Asks the browser for the user's position and lists places nearest first.
 * The position goes into the address only rounded, and is never stored.
 */
export default function NearMeButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function locate() {
    if (!("geolocation" in navigator)) {
      setMessage("เบราว์เซอร์นี้หาตำแหน่งไม่ได้");
      return;
    }
    setBusy(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("nearLat", round(coords.latitude));
        params.set("nearLng", round(coords.longitude));
        params.set("sort", "distance");
        setBusy(false);
        router.push(`${pathname}?${params.toString()}`);
      },
      (error) => {
        setBusy(false);
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? "ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง เปิดสิทธิ์ตำแหน่งในเบราว์เซอร์แล้วลองอีกครั้ง"
            : "หาตำแหน่งไม่สำเร็จ ลองอีกครั้ง",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <>
      <button type="button" className={tonalButton} onClick={locate} disabled={busy}>
        <MyLocationIcon className="h-5 w-5" />
        {busy ? "กำลังหาตำแหน่ง..." : "ใกล้ฉัน"}
      </button>
      {message && (
        <p className={`${alertError} basis-full`} role="alert">
          {message}
        </p>
      )}
    </>
  );
}
