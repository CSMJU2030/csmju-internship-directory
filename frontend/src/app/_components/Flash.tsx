import Toast from "../../components/shared/Toast";
import { alertError } from "../../components/ui";

/** Result of the last form action, passed back as ?ok= / ?error=: errors stay on the page, success is a toast. */
export default function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) {
    return (
      <p className={alertError} role="alert">
        {error}
      </p>
    );
  }
  if (ok) return <Toast message={ok} />;
  return null;
}
