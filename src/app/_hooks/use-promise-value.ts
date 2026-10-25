'use client';

import { useEffect, useState } from 'react';
export const usePromiseValue = <T>(
  source: Promise<T> | undefined,
  fallback: T,
) => {
  const [resolved, setResolved] = useState<{ source: Promise<T>; value: T }>();

  useEffect(() => {
    if (!source) {
      return;
    }

    let active = true;

    const resolve = async () => {
      let value: T;

      try {
        value = await source;
      } catch {
        value = fallback;
      }

      if (active) {
        setResolved({ source, value });
      }
    };

    void resolve();

    return () => {
      active = false;
    };
  }, [source, fallback]);

  return resolved?.source === source ? (resolved?.value ?? null) : null;
};
