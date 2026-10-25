export const normalizeAnimeQuery = (query: string) =>
  query.trim().replace(/\s+/g, ' ').toLowerCase();

export const imageUrlInput = (input: string) => {
  if (!/^(?:https?:|www\.)/i.test(input)) {
    return null;
  }

  const url = new URL(input.startsWith('www.') ? `https://${input}` : input);

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !/\.(?:png|jpe?g|webp|gif|avif|svg|bmp|ico)$/i.test(url.pathname)
  ) {
    throw new Error(
      'Use a direct image URL ending in .jpg, .png, .webp, or another image extension.',
    );
  }

  return url.href;
};

export const imageSuitability = (width: number, height: number) => {
  const ratio = width / height;

  if (ratio >= 0.55 && ratio <= 0.85) {
    return 0;
  }

  if (ratio >= 0.4 && ratio <= 1) {
    return 1;
  }

  if (ratio > 1 && ratio <= 2) {
    return 2;
  }

  if (ratio < 0.4) {
    return 3;
  }

  return 4;
};

export type SearchInput =
  | { kind: 'empty' }
  | { kind: 'search'; query: string }
  | { kind: 'image'; url: string }
  | { kind: 'invalid'; message: string };

export const classifySearchInput = (input: string): SearchInput => {
  if (!input.trim()) {
    return { kind: 'empty' };
  }

  try {
    const url = imageUrlInput(input.trim());
    if (url) {
      return { kind: 'image', url };
    }
  } catch {
    return {
      kind: 'invalid',
      message:
        'Use a direct image URL ending in .jpg, .png, .webp, or another image extension.',
    };
  }

  const query = normalizeAnimeQuery(input);

  return query.length >= 2 && query.length <= 300
    ? { kind: 'search', query }
    : { kind: 'invalid', message: 'Enter 2–300 characters.' };
};
