import { getImageProps } from 'next/image';

// A 2x image for typical board posters; originals remain for exports.
export const posterDisplaySource = (source: string) =>
  source.startsWith('/curated/') ||
  /^https:\/\/cdn\.myanimelist\.net\/(?:images\/anime|s\/common\/uploaded_files)\/[^?#]+$/u.test(
    source,
  )
    ? getImageProps({
        src: source,
        alt: '',
        width: 128,
        height: 192,
        quality: 60,
      }).props.src
    : source;
