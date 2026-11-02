import type { MetadataRoute } from 'next';
import { siteUrl } from '@/app/_lib/site-metadata';

const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: '*',
    allow: '/',
    disallow: ['/api/auth/', '/api/rpc/'],
  },
  sitemap: new URL('/sitemap.xml', siteUrl).href,
});

export default robots;
