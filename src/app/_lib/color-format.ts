import type { HexColor } from '@/app/_types/tierlist.types';

export type ColorFormat = 'hex' | 'rgb' | 'hsl';
const rgbToHex = (channels: number[]): HexColor =>
  `#${channels.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`.toUpperCase() as HexColor;

export const formatColor = (color: HexColor, format: ColorFormat) => {
  if (format === 'hex') {
    return color.toUpperCase();
  }
  const channels = [1, 3, 5].map((start) =>
    Number.parseInt(color.slice(start, start + 2), 16),
  );
  if (format === 'rgb') {
    return `rgb(${channels.join(', ')})`;
  }
  const [r, g, b] = channels.map((value) => value / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (delta) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
  }

  return `hsl(${Math.round((h * 60 + 360) % 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
};

export const parseColor = (text: string): HexColor | null => {
  const value = text
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  const hex = value.replace(/^#/, '');
  if (/^(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(hex)) {
    return `#${hex.length === 3 ? Array.from(hex, (char) => char + char).join('') : hex}`.toUpperCase() as HexColor;
  }
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(
    value,
  );
  if (rgb) {
    const channels = rgb.slice(1).map(Number);
    return channels.every((channel) => channel <= 255)
      ? rgbToHex(channels)
      : null;
  }
  const hsl =
    /^hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)$/i.exec(
      value,
    );
  if (!hsl) {
    return null;
  }
  const [h, saturation, lightness] = hsl.slice(1).map(Number);
  if (h > 360 || saturation > 100 || lightness > 100) {
    return null;
  }
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - chroma / 2;
  const sectors = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ];

  return rgbToHex(
    sectors[Math.floor((h % 360) / 60)].map((channel) => (channel + m) * 255),
  );
};
