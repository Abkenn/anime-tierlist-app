import { expect, it } from 'vitest';
import { getTierLabelLayout } from './tier-label-layout';

it('wraps combined status labels after the slash without shrinking whole words', () => {
  const input = { width: 72, height: 72, fontSize: 14 };
  expect(getTierLabelLayout({ ...input, text: 'Dropped/On-Hold' })).toEqual({
    fontSize: 14,
    lines: ['Dropped/', 'On-Hold'],
  });
  expect(getTierLabelLayout({ ...input, text: 'Watching' })).toEqual({
    fontSize: 14,
    lines: ['Watching'],
  });
  expect(getTierLabelLayout({ ...input, width: 200, text: 'Dropped/On-Hold' }).lines).toEqual([
    'Dropped/On-Hold',
  ]);
});

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
  expect(narrow.lines.some((line) => line.includes('Extraordinary'))).toBe(true);
});
