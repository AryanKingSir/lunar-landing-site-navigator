import { describe, expect, it } from 'vitest';
import { bestFlags } from './best';

describe('bestFlags', () => {
  it('marks the highest value', () => expect(bestFlags([40, 70, 55])).toEqual([false, true, false]));
  it('marks every tie for the best', () => expect(bestFlags([70, 20, 70])).toEqual([true, false, true]));
  it('marks nothing for a single result', () => expect(bestFlags([50])).toEqual([false]));
  it('marks nothing when all values are equal', () => expect(bestFlags([50, 50])).toEqual([false, false]));
  it('treats values that show as the same percent as equal', () => expect(bestFlags([50.2, 49.8])).toEqual([false, false]));
  it('ignores missing results', () => {
    expect(bestFlags([undefined, 30])).toEqual([false, false]);
    expect(bestFlags([undefined, 30, 60])).toEqual([false, false, true]);
  });
});
