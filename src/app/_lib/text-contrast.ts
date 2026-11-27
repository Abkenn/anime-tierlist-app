import type { HexColor } from '@/app/_types/tierlist.types';

type TextContrastOptions = {
  lightColor?: HexColor;
  darkColor?: HexColor;
  textOpacity?: number;
  minimumLightContrast?: number;
  backing?: { color: HexColor; opacity: number };
};

const channels = (color: HexColor) =>
  [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));

const toHex = (values: number[]): HexColor =>
  `#${values.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;

const compositeColor = (foreground: HexColor, background: HexColor, opacity: number) => {
  const base = channels(background);

  return toHex(
    channels(foreground).map((value, index) => value * opacity + base[index] * (1 - opacity)),
  );
};

const luminance = (color: HexColor) => {
  const [red, green, blue] = channels(color).map((value) => {
    const channel = value / 255;

    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
};

export const contrastingTextColor = (
  background: HexColor,
  options: TextContrastOptions = {},
): HexColor => {
  const {
    lightColor = '#ededeb',
    darkColor = '#171717',
    textOpacity = 1,
    minimumLightContrast,
    backing,
  } = options;
  const surface = backing ? compositeColor(backing.color, background, backing.opacity) : background;
  const value = luminance(surface);

  const contrast = (color: HexColor) => {
    const foreground = luminance(compositeColor(color, surface, textOpacity));

    return (Math.max(value, foreground) + 0.05) / (Math.min(value, foreground) + 0.05);
  };

  return (
    minimumLightContrast === undefined
      ? contrast(lightColor) > contrast(darkColor)
      : contrast(lightColor) >= minimumLightContrast
  )
    ? lightColor
    : darkColor;
};

export const averagePixelColor = (
  pixels: ArrayLike<number>,
  background: HexColor = '#1c1c1c',
): HexColor => {
  const count = Math.floor(pixels.length / 4);
  if (!count) {
    return background;
  }
  const base = channels(background);
  const totals = [0, 0, 0];
  Array.from({ length: count }, (_, index) => index).forEach((index) => {
    const alpha = (pixels[index * 4 + 3] ?? 255) / 255;
    totals.forEach((_, channel) => {
      totals[channel] +=
        (pixels[index * 4 + channel] ?? base[channel]) * alpha + base[channel] * (1 - alpha);
    });
  });

  return toHex(totals.map((value) => value / count));
};
