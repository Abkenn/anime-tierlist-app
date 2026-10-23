export const getTierDensity = (itemCount: number) =>
  1 - Math.min(1, Math.max(0, (itemCount - 100) / 400)) * 0.15;
