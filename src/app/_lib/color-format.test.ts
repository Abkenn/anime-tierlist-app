import { expect, it } from 'vitest';
import { formatColor, parseColor } from './color-format';

it('normalizes plain clipboard colors and converts formats without accepting malformed values', () => {
  expect(parseColor(' \u200B#e68ee6\n')).toBe('#E68EE6');
  expect(parseColor('e68ee6')).toBe('#E68EE6');
  expect(parseColor('#abc')).toBe('#AABBCC');
  expect(formatColor('#e68ee6', 'hex')).toBe('#E68EE6');
  expect(formatColor('#e68ee6', 'rgb')).toBe('rgb(230, 142, 230)');
  expect(parseColor('rgb(230, 142, 230)')).toBe('#E68EE6');
  expect(parseColor('hsl(300, 100%, 50%)')).toBe('#FF00FF');
  expect(parseColor('hsl(360, 100%, 50%)')).toBe('#FF0000');
  expect(formatColor('#808080', 'hsl')).toBe('hsl(0, 0%, 50%)');
  for (const invalid of [
    '#12345',
    '#ZZZZZZ',
    'rgb(256, 0, 0)',
    'hsl(10, 101%, 50%)',
    '<b>#E68EE6</b>',
  ]) {
    expect(parseColor(invalid)).toBeNull();
  }
});
