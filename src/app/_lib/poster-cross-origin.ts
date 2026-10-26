// This CDN supports anonymous CORS. Custom URLs may not, so preserve their mode.
export const posterCrossOrigin = (source: string) =>
  /^https?:\/\/cdn\.myanimelist\.net\//iu.test(source)
    ? ('anonymous' as const)
    : undefined;
