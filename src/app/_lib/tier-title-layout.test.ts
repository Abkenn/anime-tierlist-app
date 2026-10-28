import { expect, it } from 'vitest';
import { getTierTitleLayout } from './tier-title-layout';

it('shrinks manual titles to fit narrow posters and scales with poster height', () => {
  const title = {
    text: 'Ascendance of a Bookworm',
    color: '#ffffff' as const,
    position: 'bottom' as const,
    wrap: false,
  };
  const narrow = getTierTitleLayout(title, 60, 100);
  const wide = getTierTitleLayout(title, 160, 160);
  expect(narrow.fontSize).toBeLessThan(wide.fontSize);
  expect(narrow.fontSize).toBeLessThan(8);
  expect(narrow.lines).toEqual([title.text]);
});

it('fits wrapped text into no more than four lines', () => {
  const layout = getTierTitleLayout(
    {
      text: 'A long anime title that needs automatic wrapping to fit',
      color: '#ffffff',
      position: 'top',
      wrap: true,
    },
    65,
    90,
  );
  expect(layout.lines.length).toBeLessThanOrEqual(4);
  expect(layout.lines.join('').replace(/\s/gu, '')).toBe(
    'Alonganimetitlethatneedsautomaticwrappingtofit',
  );
});

it('wraps Mushoku Tensei at the space and shrinks long words instead of splitting them', () => {
  const title = {
    text: 'Mushoku Tensei',
    color: '#ffffff' as const,
    position: 'top' as const,
    wrap: true,
  };
  expect(getTierTitleLayout(title, 65, 100).lines).toEqual([
    'Mushoku',
    'Tensei',
  ]);
  const longWord = getTierTitleLayout(
    { ...title, text: 'Supercalifragilisticexpialidocious' },
    40,
    100,
  );
  expect(longWord.lines).toEqual(['Supercalifragilisticexpialidocious']);
  expect(longWord.fontSize).toBeLessThan(4);
});
