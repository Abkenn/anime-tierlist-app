'use client';

import { SpeedInsights } from '@vercel/speed-insights/next';

export const PerformanceInsights = () => (
  <SpeedInsights
    debug={false}
    beforeSend={(event) => {
      const url = new URL(event.url);
      url.search = '';
      url.hash = '';

      return { ...event, url: url.toString() };
    }}
  />
);
