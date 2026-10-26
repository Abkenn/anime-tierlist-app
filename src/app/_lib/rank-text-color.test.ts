import { expect, it } from 'vitest';
import { rankTextColor } from './rank-text-color';

it('uses light text on dark ranks and dark text on bright ranks', () => {
  expect(rankTextColor('#000000')).toBe('#ededeb');
  expect(rankTextColor('#333333')).toBe('#ededeb');
  expect(rankTextColor('#ffffff')).toBe('#171717');
  expect(rankTextColor('#e68e8e')).toBe('#171717');
});
