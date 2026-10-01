import { starsLabel } from "../../lib/format";

const STAR_PATH =
  "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5z";

/** Five stars, filled to the score; the number is read out, not just the colour. */
export default function Stars({ score }: { score: number }) {
  const filled = Math.round(score);
  return (
    <span className="stars" role="img" aria-label={starsLabel(score)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} aria-hidden="true" viewBox="0 0 24 24" className={n <= filled ? "star star-on" : "star"}>
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
}
