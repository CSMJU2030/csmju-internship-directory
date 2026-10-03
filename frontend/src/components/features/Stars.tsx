import { starsLabel } from "../../lib/format";
import { StarIcon } from "../icons";

/** Five stars, filled to the score; the number is read out, not just the colour. */
export default function Stars({ score }: { score: number }) {
  const filled = Math.round(score);
  return (
    <span className="inline-flex gap-0.5 align-middle" role="img" aria-label={starsLabel(score)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          className={n <= filled ? "h-4 w-4 fill-amber-500 text-amber-500" : "h-4 w-4 fill-surface-variant text-outline-variant"}
        />
      ))}
    </span>
  );
}
