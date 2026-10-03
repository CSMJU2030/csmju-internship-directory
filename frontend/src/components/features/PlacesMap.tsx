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

/** Mae Jo University main campus. */
const MJU = { lat: 18.8953, lng: 99.0132 };

/**
 * Every place on an OpenStreetMap map, with pins coloured by average score.
 * Leaflet is called directly in this client component - react-leaflet is not
 * allowed (tech-stack.md 1.4.2) - and loaded only in the browser.
 */
export default function PlacesMap({ places }: { places: MapPlace[] }) {
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
        icon: L.divIcon({ className: "map-pin-wrap", html: '<span class="map-campus" aria-hidden="true">มจ</span>', iconSize: [28, 28] }),
        keyboard: false,
        title: "มหาวิทยาลัยแม่โจ้",
      }).addTo(map);

      const markers = places.map((place) => {
        const label = place.reviewCount > 0 ? place.averageScore.toFixed(1) : "–";
        const marker = L.marker([place.latitude, place.longitude], {
          icon: L.divIcon({
            className: "map-pin-wrap",
            html: `<span class="map-pin ${pinTone(place.averageScore)}"><span>${label}</span></span>`,
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

      if (markers.length > 1) {
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
  }, [places]);

  return <div ref={element} className="map" role="region" aria-label="แผนที่สถานที่ฝึกงาน" />;
}
