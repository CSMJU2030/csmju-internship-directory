"use client";

import { useEffect, useState } from "react";
import { CheckCircleIcon } from "../icons";

const SHOW_MS = 4000;

/**
 * Success message after a form action (ui-design-system.md 8.4): top right on
 * a desktop, top of the screen on a phone, gone after four seconds. Errors
 * the user has to fix stay inline instead.
 */
export default function Toast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), SHOW_MS);
    return () => clearTimeout(timer);
  }, [message]);

  if (!visible) return null;
  return (
    <p
      role="status"
      className="fade-slide-up fixed inset-x-4 top-4 z-50 flex items-center gap-2 rounded-lg border border-success/30 bg-surface-container-lowest px-4 py-3 text-body-md text-emerald-700 shadow-lg md:left-auto md:right-8 md:top-20 md:max-w-md"
    >
      <CheckCircleIcon className="h-5 w-5 shrink-0" />
      {message}
    </p>
  );
}
