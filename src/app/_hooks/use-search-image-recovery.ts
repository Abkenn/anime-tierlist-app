'use client';

import { useEffect, useEffectEvent, useState } from 'react';

const IMAGE_RETRY_DELAY_MS = 10_000;
const MAX_IMAGE_RETRIES = 3;

type SearchImageRecoveryInput = {
  scope: string;
  failedIds: string[];
  onRetry: (ids: string[]) => void;
};

export const useSearchImageRecovery = ({
  scope,
  failedIds,
  onRetry,
}: SearchImageRecoveryInput) => {
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const retry = useEffectEvent(onRetry);
  const candidates = JSON.stringify(failedIds);

  useEffect(() => {
    const failed: string[] = JSON.parse(candidates);
    const ids = failed.filter(
      (id) => (attempts[`${scope}:${id}`] ?? 0) < MAX_IMAGE_RETRIES,
    );

    if (ids.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      setAttempts((current) => {
        const next = { ...current };
        for (const id of ids) {
          const key = `${scope}:${id}`;
          next[key] = (next[key] ?? 0) + 1;
        }

        return next;
      });
      retry(ids);
    }, IMAGE_RETRY_DELAY_MS);

    return () => clearTimeout(timer);
  }, [scope, candidates, attempts]);

  return attempts;
};
