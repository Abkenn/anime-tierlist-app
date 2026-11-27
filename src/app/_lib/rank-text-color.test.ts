import { expect, it } from 'vitest';
import { contrastingTextColor } from './text-contrast';

it('uses light text on dark ranks and dark text on bright ranks', () => {
  expect(contrastingTextColor('#000000')).toBe('#ededeb');
  expect(contrastingTextColor('#333333')).toBe('#ededeb');
  expect(contrastingTextColor('#ffffff')).toBe('#171717');
  expect(contrastingTextColor('#e68e8e')).toBe('#171717');
});
