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
