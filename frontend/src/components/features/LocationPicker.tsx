"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { secondaryButton, small } from "../ui";

type Point = { lat: number; lng: number };

const MJU: Point = { lat: 18.8953, lng: 99.0132 };

/**
 * Pick a place's location: click the map, drag the pin, or use this device's
 * position. The chosen point is sent with the form as `latitude`/`longitude`.
 */
export default function LocationPicker({ initial }: { initial?: Point }) {
  const element = useRef<HTMLDivElement>(null);
  const setPin = useRef<(point: Point, zoom?: number) => void>(() => undefined);
  const [point, setPoint] = useState<Point | null>(initial ?? null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let resize: ResizeObserver | undefined;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !element.current) return;
      const start = initial ?? MJU;
      map = L.map(element.current).setView([start.lat, start.lng], initial ? 16 : 11);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      let marker: import("leaflet").Marker | undefined;
      const icon = L.divIcon({
        className: "",
        html: '<span class="flex h-8 w-8 -rotate-45 items-center justify-center rounded-full rounded-bl-none border-2 border-white bg-primary-container text-white shadow-md"><span class="rotate-45 text-label-md">+</span></span>',
        iconSize: [34, 42],
        iconAnchor: [17, 40],
      });
      setPin.current = (next, zoom) => {
        const rounded = { lat: Math.round(next.lat * 1e6) / 1e6, lng: Math.round(next.lng * 1e6) / 1e6 };
        if (!marker) {
          marker = L.marker([rounded.lat, rounded.lng], { draggable: true, icon }).addTo(map!);
          marker.on("dragend", () => setPin.current(marker!.getLatLng()));
        } else {
          marker.setLatLng([rounded.lat, rounded.lng]);
        }
        if (zoom) map!.setView([rounded.lat, rounded.lng], zoom);
        setPoint(rounded);
        setMessage("");
      };
      if (initial) setPin.current(initial);
      map.on("click", (event) => setPin.current(event.latlng));
      // Redraw tiles when the box changes size (window resize, scrollbar), or part stays grey.
      resize = new ResizeObserver(() => map?.invalidateSize());
      resize.observe(element.current);
    });

    return () => {
      cancelled = true;
      resize?.disconnect();
      map?.remove();
    };
  }, [initial]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMessage("เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง");
      return;
    }
    setMessage("กำลังระบุตำแหน่ง…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPin.current({ lat: position.coords.latitude, lng: position.coords.longitude }, 17);
        setMessage("");
      },
      () => setMessage("ระบุตำแหน่งไม่สำเร็จ กรุณาคลิกบนแผนที่แทน"),
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-2 text-label-md text-on-surface">ตำแหน่งบนแผนที่ (คลิกเพื่อปักหมุด · ลากหมุดเพื่อปรับ)</legend>
      <div ref={element} className="z-0 h-72 w-full rounded-xl border border-outline-variant/40" role="application" aria-label="แผนที่สำหรับปักหมุดตำแหน่ง" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={small} aria-live="polite">
          {point ? `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}` : "ยังไม่ได้ปักหมุด"}
          {message ? ` · ${message}` : ""}
        </span>
        <button type="button" className={secondaryButton} onClick={useMyLocation}>
          ใช้ตำแหน่งปัจจุบัน
        </button>
      </div>
      <input type="hidden" name="latitude" value={point?.lat ?? ""} />
      <input type="hidden" name="longitude" value={point?.lng ?? ""} />
    </fieldset>
  );
}
