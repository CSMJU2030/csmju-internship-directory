import {
  MJU_LOCATION,
  averageScore,
  currentBuddhistYear,
  distanceKm,
  overallMean,
  placeNameKey,
  rankScore,
} from './place-scoring';

describe('place scoring rules', () => {
  describe('placeNameKey', () => {
    it('treats company prefixes, suffixes, spaces and punctuation as the same name', () => {
      expect(placeNameKey('บริษัท เทคโนโลยีเชียงใหม่ ซอฟต์แวร์ จำกัด')).toBe(
        placeNameKey('เทคโนโลยี เชียงใหม่ซอฟต์แวร์'),
      );
      expect(placeNameKey('Agoda Co., Ltd.')).toBe(placeNameKey('agoda'));
    });

    it('keeps different names apart', () => {
      expect(placeNameKey('Agoda')).not.toBe(placeNameKey('Agode'));
    });
  });

  describe('averageScore', () => {
    it('rounds to one decimal and is 0 without reviews', () => {
      expect(averageScore({ count: 0, sum: 0 })).toBe(0);
      expect(averageScore({ count: 3, sum: 13 })).toBe(4.3);
    });
  });

  describe('rankScore', () => {
    it('ranks many good reviews above a single perfect one', () => {
      const single = { count: 1, sum: 5 };
      const many = { count: 5, sum: 24 };
      const bad = { count: 2, sum: 3 };
      const mean = overallMean([single, many, bad]);
      const ranked = [
        ['single', single],
        ['bad', bad],
        ['many', many],
      ].sort(
        ([, a], [, b]) =>
          rankScore(b as typeof single, mean) - rankScore(a as typeof single, mean),
      );
      expect(ranked.map(([name]) => name)).toEqual(['many', 'single', 'bad']);
    });

    it('uses a neutral mean before any review exists', () => {
      expect(overallMean([])).toBe(3.5);
      expect(rankScore({ count: 0, sum: 0 }, 3.5)).toBe(3.5);
    });
  });

  describe('distanceKm', () => {
    it('measures Chiang Mai to Bangkok at about 580 km', () => {
      const bangkok = { latitude: 13.7563, longitude: 100.5018 };
      const chiangMai = { latitude: 18.7883, longitude: 98.9853 };
      expect(distanceKm(chiangMai, bangkok)).toBeGreaterThan(570);
      expect(distanceKm(chiangMai, bangkok)).toBeLessThan(590);
      expect(distanceKm(MJU_LOCATION, MJU_LOCATION)).toBe(0);
    });
  });

  it('converts to the Buddhist-era year', () => {
    expect(currentBuddhistYear(new Date('2026-10-01T00:00:00+07:00'))).toBe(2569);
  });
});
