import type { TierItemTitle } from '@/app/_types/tierlist.types';

export const defaultTierItemTitle: TierItemTitle = {
  text: '',
  wrap: false,
  position: 'bottom',
  color: '#ffffff',
};
export const titlePositions: TierItemTitle['position'][] = [
  'top',
  'middle',
  'bottom',
];

export const normalizeTitleColor = (
  input: string,
): TierItemTitle['color'] | null => {
  const hex = input.trim().replace(/^#/, '');

  if (/^[\da-f]{3}$/i.test(hex)) {
    return `#${[...hex]
      .map((character) => character.repeat(2))
      .join('')
      .toLowerCase()}`;
  }

  return /^[\da-f]{6}$/i.test(hex) ? `#${hex.toLowerCase()}` : null;
};

export const limitTitleLines = (text: string) =>
  text.replace(/\r\n?/g, '\n').split('\n').slice(0, 4).join('\n');
