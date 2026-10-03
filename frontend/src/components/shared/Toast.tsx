"use client";

import { CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";

const SHOW_MS = 4000;

/**
 * Success message after a form action (design system: toast for success,
 * alert for errors). Read out by screen readers, gone after four seconds.
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
    <p className="toast" role="status">
      <CircleCheck size={20} aria-hidden="true" />
      {message}
    </p>
  );
}
