/** @jest-environment node */
const Suit = require('./group-column-suitability.js');

function nLevels(count, perGroup) {
  const levels = [];
  for (let i = 0; i < count; i++) levels.push({ level: 'L' + i, n: perGroup == null ? 10 : perGroup });
  return levels;
}

function emails(count) {
  const levels = [];
  for (let i = 0; i < count; i++) levels.push({ level: 'user' + i + '@example.com', n: 1 });
  return levels;
}

describe('Group column suitability', () => {
  test('State/Region with 10 groups is recommended', () => {
    const out = Suit.classify({
      name: 'State/Region',
      levels: nLevels(10, 17)
    });
    expect(out.bucket).toBe('recommended');
    expect(out.disabled).toBe(false);
    expect(out.indicator).toBe('Recommended · 10 groups');
  });

  test('Postal with 5 groups is eligible, not recommended', () => {
    const out = Suit.classify({
      name: 'Postal',
      levels: nLevels(5, 20)
    });
    expect(out.bucket).toBe('other');
    expect(out.disabled).toBe(false);
    expect(out.indicator).toBe('5 groups');
  });

  test('City with 19 groups is eligible with a many-groups caution', () => {
    const out = Suit.classify({
      name: 'City',
      levels: nLevels(19, 9)
    });
    expect(out.bucket).toBe('other');
    expect(out.disabled).toBe(false);
    expect(out.indicator).toBe('19 groups · many groups');
  });

  test('email with many addresses is not recommended', () => {
    const out = Suit.classify({
      name: 'email',
      levels: emails(73),
      rowCount: 172
    });
    expect(out.bucket).toBe('disabled');
    expect(out.disabled).toBe(true);
    expect(out.reason).toBe('email');
    expect(out.indicator).toBe('73 groups · not recommended');
  });

  test('current analysis variable is disabled even if it looks categorical', () => {
    const out = Suit.classify({
      name: 'a004',
      levels: nLevels(40, 4),
      isAnalysisVariable: true
    });
    expect(out.bucket).toBe('disabled');
    expect(out.disabled).toBe(true);
    expect(out.indicator).toBe('Current analysis variable');
  });

  test('almost one unique value per row is disabled', () => {
    const out = Suit.classify({
      name: 'CustomerKey',
      levels: nLevels(168, 1),
      rowCount: 172
    });
    expect(out.bucket).toBe('disabled');
    expect(out.uniqueRatio).toBeGreaterThan(0.85);
    expect(out.indicator).toMatch(/not recommended/);
  });

  test('uuid-like values are treated as identifiers', () => {
    const out = Suit.classify({
      name: 'record_id',
      levels: [
        { level: '550e8400-e29b-41d4-a716-446655440000', n: 1 },
        { level: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', n: 1 },
        { level: '6ba7b811-9dad-11d1-80b4-00c04fd430c8', n: 1 }
      ]
    });
    expect(out.disabled).toBe(true);
    expect(out.reason).toMatch(/identifier|unique-per-row|email/);
  });

  test('partition keeps recommended ahead of other eligible columns', () => {
    const items = [
      Object.assign(Suit.classify({ name: 'Postal', levels: nLevels(5) }), { idx: 1 }),
      Object.assign(Suit.classify({ name: 'State/Region', levels: nLevels(10) }), { idx: 0 }),
      Object.assign(Suit.classify({ name: 'email', levels: emails(73) }), { idx: 2 })
    ];
    const parts = Suit.partition(items);
    expect(parts.recommended.map((x) => x.idx)).toEqual([0]);
    expect(parts.other.map((x) => x.idx)).toEqual([1]);
    expect(parts.disabled.map((x) => x.idx)).toEqual([2]);
  });
});
