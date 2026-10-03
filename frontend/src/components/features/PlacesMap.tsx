"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { pinTone } from "../../lib/format";

export type MapPlace = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  averageScore: number;
  reviewCount: number;
};

/** How many of the nearest places the map frames together with the user's position. */
const NEAREST_IN_VIEW = 3;

/** Mae Jo University main campus. */
const MJU = { lat: 18.8953, lng: 99.0132 };

/**
 * Every place on an OpenStreetMap map, with pins coloured by average score.
 * Leaflet is called directly in this client component - react-leaflet is not
 * allowed (tech-stack.md 1.4.2) - and loaded only in the browser.
 */
export default function PlacesMap({ places, origin }: { places: MapPlace[]; origin?: { lat: number; lng: number } }) {
  const originLat = origin?.lat;
  const originLng = origin?.lng;

  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let resize: ResizeObserver | undefined;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !element.current) return;
      map = L.map(element.current, { scrollWheelZoom: false }).setView([MJU.lat, MJU.lng], 11);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      L.marker([MJU.lat, MJU.lng], {
        icon: L.divIcon({ className: "", html: '<span class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-secondary text-label-sm text-white shadow-md" aria-hidden="true">มจ</span>', iconSize: [28, 28] }),
        keyboard: false,
        title: "มหาวิทยาลัยแม่โจ้",
      }).addTo(map);

      const markers = places.map((place) => {
        const label = place.reviewCount > 0 ? place.averageScore.toFixed(1) : "–";
        const marker = L.marker([place.latitude, place.longitude], {
          icon: L.divIcon({
            className: "",
            html: `<span class="flex h-8 w-8 -rotate-45 items-center justify-center rounded-full rounded-bl-none border-2 border-white shadow-md ${pinTone(place.averageScore)}"><span class="rotate-45 text-label-sm">${label}</span></span>`,
            iconSize: [34, 42],
            iconAnchor: [17, 40],
            popupAnchor: [0, -36],
          }),
          title: place.name,
        });
        // Built as DOM nodes, never as HTML from user text.
        const popup = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = place.name;
        const link = document.createElement("a");
        link.href = `/internship-places/${encodeURIComponent(place.id)}`;
        link.textContent = "ดูรายละเอียด";
        popup.append(name, document.createElement("br"), link);
        marker.bindPopup(popup);
        return marker.addTo(map!);
      });

      if (originLat !== undefined && originLng !== undefined) {
        // "Near me": mark the (rounded) position and frame it with the nearest places.
        const me = L.marker([originLat, originLng], {
          icon: L.divIcon({ className: "", html: '<span class="block h-5 w-5 rounded-full border-4 border-white bg-primary-container shadow-md ring-4 ring-primary-container/20" aria-hidden="true"></span>', iconSize: [22, 22] }),
          keyboard: false,
          title: "ตำแหน่งของคุณ (โดยประมาณ)",
          zIndexOffset: 1000,
        }).addTo(map);
        const nearest = [...markers]
          .sort((a, b) => me.getLatLng().distanceTo(a.getLatLng()) - me.getLatLng().distanceTo(b.getLatLng()))
          .slice(0, NEAREST_IN_VIEW);
        map.fitBounds(L.featureGroup([me, ...nearest]).getBounds().pad(0.2), { maxZoom: 14 });
      } else if (markers.length > 1) {
        map.fitBounds(L.featureGroup(markers).getBounds().pad(0.15), { maxZoom: 15 });
      } else if (markers.length === 1) {
        map.setView(markers[0].getLatLng(), 15);
      }
      // Redraw tiles when the box changes size (window resize, scrollbar), or part stays grey.
      resize = new ResizeObserver(() => map?.invalidateSize());
      resize.observe(element.current);
    });

    return () => {
      cancelled = true;
      resize?.disconnect();
      map?.remove();
    };
  }, [places, originLat, originLng]);

  return <div ref={element} className="z-0 h-96 w-full rounded-xl border border-outline-variant/40" role="region" aria-label="แผนที่สถานที่ฝึกงาน" />;
}
