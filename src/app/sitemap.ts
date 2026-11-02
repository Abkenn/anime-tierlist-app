import type { MetadataRoute } from 'next';
import { siteUrl } from '@/app/_lib/site-metadata';

const sitemap = (): MetadataRoute.Sitemap => [{ url: siteUrl.href }];

export default sitemap;
