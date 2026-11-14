import { describe, expect, it } from 'vitest';
import { validateNewScenario } from './validate';

const ok = { date: '2026-12-01', time: '00:00', lat: -89, lon: 0, days: 30 };

describe('validateNewScenario', () => {
  it('accepts valid input', () => expect(validateNewScenario(ok)).toBeNull());
  it('rejects empty date', () => expect(validateNewScenario({ ...ok, date: '' })).not.toBeNull());
  it('rejects empty time', () => expect(validateNewScenario({ ...ok, time: '' })).not.toBeNull());
  it('rejects lat 91', () => expect(validateNewScenario({ ...ok, lat: 91 })).not.toBeNull());
  it('rejects lat NaN', () => expect(validateNewScenario({ ...ok, lat: NaN })).not.toBeNull());
  it('rejects days 0', () => expect(validateNewScenario({ ...ok, days: 0 })).not.toBeNull());
  it('rejects days 1.5', () => expect(validateNewScenario({ ...ok, days: 1.5 })).not.toBeNull());
  it('rejects days 61', () => expect(validateNewScenario({ ...ok, days: 61 })).not.toBeNull());
});
