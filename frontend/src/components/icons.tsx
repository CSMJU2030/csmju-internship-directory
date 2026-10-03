/**
 * Icons this subsystem needs that the central set (@/csmju icons.tsx) does
 * not have. Same style as the central set (ui-design-system.md 14): inline
 * SVG, 24px viewBox, currentColor stroke 1.8 with round ends. Use these and
 * @/csmju icons only - never a second icon library.
 */
type IconProps = React.SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

const STAR = "M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8-4.3-4.1 5.9-.8L12 3.5Z";

export function StarIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d={STAR} />
    </svg>
  );
}

export function MyLocationIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
    </svg>
  );
}

export function SearchOffIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5M8.3 8.3l4.4 4.4M12.7 8.3l-4.4 4.4" />
    </svg>
  );
}

export function MapIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="m9 4.5-5 2v13l5-2 6 2 5-2v-13l-5 2-6-2Z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </svg>
  );
}

export function RateReviewIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M4.5 5.5h15a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H9l-4.5 3.5V6.5a1 1 0 0 1 1-1Z" />
      <path d="m12 8.2.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3.9-1.8Z" />
    </svg>
  );
}

export function OpenInNewIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M13.5 4.5h6v6M19.5 4.5l-8 8" />
      <path d="M18 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H10" />
    </svg>
  );
}
