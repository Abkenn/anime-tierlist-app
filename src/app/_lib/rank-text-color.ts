import type { HexColor } from '@/app/_types/tierlist.types';

const luminance = (hex: HexColor) => {
  const channels = [1, 3, 5].map(
    (offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
};

export const rankTextColor = (background: HexColor): HexColor => {
  const light = '#ededeb';
  const dark = '#171717';
  const value = luminance(background);
  const contrast = (color: HexColor) =>
    (Math.max(value, luminance(color)) + 0.05) /
    (Math.min(value, luminance(color)) + 0.05);

  return contrast(light) > contrast(dark) ? light : dark;
};
