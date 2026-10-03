"use client";

import { useRef, useState } from "react";
import { ConfirmDeleteModal, DeleteIcon } from "@/csmju";

/**
 * A delete button that asks first (ui-design-system.md 8.3) with the central
 * ConfirmDeleteModal, then sends the form with its hidden fields to the
 * server action. Deleting needs JavaScript on purpose - there is no path
 * that skips the question.
 */
export default function DeleteButton({
  action,
  fields,
  label,
  title,
  message,
}: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  /** Button text, a verb: "ลบสถานที่", "ลบรีวิว". */
  label: string;
  title: string;
  message: React.ReactNode;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [asking, setAsking] = useState(false);

  return (
    <form ref={form} action={action}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {/* type="button": the form is only ever sent from the dialog, so a click before
          JavaScript has loaded cannot delete anything without asking. */}
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-label-md text-error transition-colors hover:bg-error-container"
      >
        <DeleteIcon className="h-4 w-4" />
        {label}
      </button>
      {asking && (
        <ConfirmDeleteModal
          title={title}
          message={message}
          onClose={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false);
            form.current?.requestSubmit();
          }}
        />
      )}
    </form>
  );
}
