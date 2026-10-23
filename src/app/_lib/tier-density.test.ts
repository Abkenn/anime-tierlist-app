import { describe, expect, it } from 'vitest';
import { getTierDensity } from './tier-density';

describe('uniform tier density', () => {
  it('keeps the larger comfortable size through 100 items', () => {
    expect(getTierDensity(0)).toBe(1);
    expect(getTierDensity(4)).toBe(1);
    expect(getTierDensity(100)).toBe(1);
  });

  it('reduces size gradually and stops shrinking at 500 items', () => {
    expect(getTierDensity(101)).toBeCloseTo(0.999625);
    expect(getTierDensity(300)).toBeCloseTo(0.925);
    expect(getTierDensity(500)).toBe(0.85);
    expect(getTierDensity(1000)).toBe(0.85);
  });
});
