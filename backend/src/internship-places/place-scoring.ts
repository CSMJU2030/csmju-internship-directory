/**
 * Pure scoring and matching rules for internship places - no database, no
 * framework, so they are unit tested directly (place-scoring.spec.ts).
 */

/** Mae Jo University main campus - "how far from the university" is measured from here. */
export const MJU_LOCATION = { latitude: 18.8953, longitude: 99.0132 } as const;

/** Mean used for ranking before any review exists. */
const FALLBACK_MEAN = 3.5;

/**
 * Weight of the overall mean in the Bayesian average: a place needs about this
 * many reviews before its own scores outweigh everyone else's.
 */
const BAYESIAN_WEIGHT = 2;

/**
 * Key used to spot the same company added twice: lower case, without the
 * Thai/English company prefix and suffix, spaces or punctuation.
 */
export function placeNameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^(บริษัท|บจก\.?|หจก\.?)\s*/u, '')
    .replace(/\s*(จำกัด\s*\(มหาชน\)|จำกัด|co\.?,?\s*ltd\.?)$/u, '')
    .replace(/[\s\-_.,()'"/]/gu, '');
}

export interface ScoreStats {
  count: number;
  sum: number;
}

/** Average of 1-5 scores rounded to one decimal, or 0 without reviews. */
export function averageScore(stats: ScoreStats): number {
  return stats.count === 0 ? 0 : Math.round((stats.sum / stats.count) * 10) / 10;
}

/** Mean of every review in the directory - the prior of the Bayesian average. */
export function overallMean(all: readonly ScoreStats[]): number {
  const count = all.reduce((total, stats) => total + stats.count, 0);
  const sum = all.reduce((total, stats) => total + stats.sum, 0);
  return count === 0 ? FALLBACK_MEAN : sum / count;
}

/**
 * Bayesian average used for ranking: a place with one 5-star review does not
 * outrank one with many 4- and 5-star reviews.
 */
export function rankScore(stats: ScoreStats, mean: number): number {
  return (BAYESIAN_WEIGHT * mean + stats.sum) / (BAYESIAN_WEIGHT + stats.count);
}

/** Great-circle distance in kilometres. */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Buddhist-era year, e.g. 2569 for 2026. */
export function currentBuddhistYear(now = new Date()): number {
  return now.getFullYear() + 543;
}
