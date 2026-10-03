/** Loading state shaped like the page that is coming (ui-design-system.md 9.1) - not a spinner. */
export default function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <main id="main" className="page" aria-busy="true" aria-label="กำลังโหลด">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton skeleton-card" />
      ))}
    </main>
  );
}
