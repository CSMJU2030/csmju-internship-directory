/**
 * Fields of work a place takes interns for. The list is closed so filters and
 * labels stay the same across the API and the web page; the page shows `label`.
 */
export const PLACE_TAGS = [
  { key: 'web', label: 'Web Development' },
  { key: 'mobile', label: 'Mobile App' },
  { key: 'ai-data', label: 'AI / Data' },
  { key: 'network', label: 'Network / Infra' },
  { key: 'uxui', label: 'UX/UI Design' },
  { key: 'testing', label: 'Software Testing' },
  { key: 'security', label: 'Cybersecurity' },
  { key: 'game', label: 'Game' },
  { key: 'iot', label: 'IoT / Embedded' },
  { key: 'erp', label: 'Business / ERP' },
] as const;

export type PlaceTag = (typeof PLACE_TAGS)[number]['key'];

export const PLACE_TAG_KEYS: readonly PlaceTag[] = PLACE_TAGS.map((tag) => tag.key);

/** A place lists at most this many fields of work. */
export const MAX_TAGS_PER_PLACE = 5;

/** A field of work the list does not have yet may be added in the user's own words, this long. */
export const CUSTOM_TAG_LENGTH = { min: 2, max: 40 } as const;

const fold = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Stored form of a place's fields of work: a preset key (`web`) when the
 * value names a preset by key or label, otherwise the user's own words
 * (whitespace collapsed). Duplicates are dropped case-insensitively and the
 * order is kept.
 */
export function normalizeTags(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const folded = fold(raw);
    if (!folded) continue;
    const preset = PLACE_TAGS.find((tag) => tag.key === folded || fold(tag.label) === folded);
    const value = preset ? preset.key : raw.trim().replace(/\s+/g, ' ');
    const key = fold(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

/** The key a filter value matches: a preset key, or the folded custom words. */
export function tagMatchKey(value: string): string {
  return fold(normalizeTags([value])[0] ?? '');
}

export const isPresetTag = (value: string): boolean => PLACE_TAG_KEYS.includes(value as PlaceTag);
