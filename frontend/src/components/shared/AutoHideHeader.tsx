"use client";

import { useEffect, useRef, useState } from "react";

/** Pixels of scrolling in one direction before the header reacts - ignores jitter. */
const THRESHOLD = 8;

/**
 * Sticky header that slides away while scrolling down and comes back on the
 * first scroll up, so a phone screen keeps its height for content. The CSS
 * only hides it on narrow screens; it always shows at the top of the page and
 * whenever something inside it has keyboard focus.
 */
export default function AutoHideHeader({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const header = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    lastY.current = window.scrollY;

    function update() {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (Math.abs(delta) < THRESHOLD) return;
      const height = header.current?.offsetHeight ?? 0;
      setHidden(delta > 0 && y > height && !header.current?.contains(document.activeElement));
      lastY.current = y;
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header ref={header} className={`topbar${hidden ? " topbar-hidden" : ""}`} onFocus={() => setHidden(false)}>
      {children}
    </header>
  );
}
