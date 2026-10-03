import { Star } from "lucide-react";
import { starsLabel } from "../../lib/format";

/** Five stars, filled to the score; the number is read out, not just the colour. */
export default function Stars({ score }: { score: number }) {
  const filled = Math.round(score);
  return (
    <span className="stars" role="img" aria-label={starsLabel(score)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden="true" strokeWidth={1.5} className={n <= filled ? "star star-on" : "star"} />
      ))}
    </span>
  );
}
