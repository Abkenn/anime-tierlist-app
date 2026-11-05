import { expect, it } from 'vitest';
import { getTierLabelLayout } from './tier-label-layout';

it('shrinks single words rather than splitting them', () => {
  const dropped = getTierLabelLayout({
    text: 'Dropped',
    width: 35,
    height: 70,
    fontSize: 14,
  });
  expect(dropped.lines).toEqual(['Dropped']);
  expect(dropped.fontSize).toBeLessThan(14);
});

it('wraps at spaces before shrinking, unless an individual word cannot fit', () => {
  const input = { width: 55, height: 100, fontSize: 14 };
  expect(getTierLabelLayout({ ...input, text: 'Good Shows' })).toEqual({
    fontSize: 14,
    lines: ['Good', 'Shows'],
  });
  const narrow = getTierLabelLayout({ ...input, text: 'Extraordinary Shows' });
  expect(narrow.fontSize).toBeLessThan(14);
  expect(narrow.lines.join(' ')).toBe('Extraordinary Shows');
  expect(narrow.lines.some((line) => line.includes('Extraordinary'))).toBe(
    true,
  );
});
