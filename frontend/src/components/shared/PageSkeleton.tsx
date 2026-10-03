/** Loading state shaped like the page that is coming (ui-design-system.md 9.1) - not a spinner. */
export default function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="กำลังโหลด">
      <div className="h-8 w-2/5 rounded-lg bg-surface-variant" />
      <div className="h-4 w-3/5 rounded-lg bg-surface-variant" />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-32 rounded-xl bg-surface-variant/60" />
      ))}
    </div>
  );
}
