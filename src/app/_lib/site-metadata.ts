import type { Metadata } from 'next';

export const siteUrl = new URL(
  '/',
  process.env.SITE_URL ?? 'https://anime-tierlist-app.vercel.app/',
);
export const siteName = 'Anime Tierlist';
export const siteTitle = 'Anime Tierlist | Your anime. Your order.';
export const siteDescription =
  'Create your anime tierlist. Search for posters, drag them into place, and make every image yours with custom crops, ratios, and titles.';
export const siteAccent = '#ef596b';
export const discordEmbedUrl = new URL('/api/discord-embed?v=1', siteUrl).href;
export const oembedUrl = new URL(
  `/api/oembed?${new URLSearchParams({ url: siteUrl.href, format: 'json' })}`,
  siteUrl,
).href;

if (siteUrl.protocol !== 'https:' && siteUrl.hostname !== 'localhost') {
  throw new Error('SITE_URL must be a public HTTPS origin.');
}

export const homepageMetadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  alternates: {
    canonical: '/',
    types: { 'application/json+oembed': [{ url: oembedUrl, title: siteName }] },
  },
  openGraph: {
    type: 'website',
    url: siteUrl.href,
    siteName,
    title: siteTitle,
    description: siteDescription,
    locale: 'en_US',
  },
  twitter: { card: 'summary', title: siteTitle, description: siteDescription },
};
