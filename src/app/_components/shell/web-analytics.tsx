'use client';

import { Analytics } from '@vercel/analytics/next';

export const WebAnalytics = () => (
  <Analytics
    debug={false}
    beforeSend={(event) => {
      const url = new URL(event.url);
      url.search = '';
      url.hash = '';

      return { ...event, url: url.toString() };
    }}
  />
);
