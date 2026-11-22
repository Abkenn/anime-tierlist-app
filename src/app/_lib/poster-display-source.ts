import { getImageProps } from 'next/image';

// A 2x image for typical board posters; originals remain for exports.
export const posterDisplaySource = (source: string, size: 'board' | 'compact' = 'board') =>
  source.startsWith('/curated/') ||
  /^https:\/\/cdn\.myanimelist\.net\/(?:images\/anime|s\/common\/uploaded_files)\/[^?#]+$/u.test(
    source,
  )
    ? getImageProps({
        src: source,
        alt: '',
        width: size === 'compact' ? 32 : 128,
        height: size === 'compact' ? 48 : 192,
        quality: 60,
      }).props.src
    : source;
