'use client';

import { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/app/_lib/relative-time';

type ConflictProps = {
  onlineItemCount: number;
  localItemCount: number;
  localUpdatedAt?: number;
  onlineUpdatedAt?: number;
  busy: boolean;
  error: string;
  onKeepDevice: () => Promise<unknown>;
  onAcceptOnline: () => Promise<unknown>;
};

export const TierlistConflict = ({
  onlineItemCount,
  localItemCount,
  localUpdatedAt,
  onlineUpdatedAt,
  busy,
  error,
  onKeepDevice,
  onAcceptOnline,
}: ConflictProps) => {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section
      aria-label="Choose tierlist version"
      className="mb-3 border border-divider p-3 text-xs"
    >
      <p>Which version do you want to keep?</p>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-3">
        <button
          type="button"
          disabled={busy}
          title={
            localUpdatedAt === undefined
              ? undefined
              : new Date(localUpdatedAt).toLocaleString()
          }
          onClick={() => {
            void onKeepDevice();
          }}
          className="cursor-pointer underline underline-offset-4 disabled:opacity-50"
        >
          This device · {localItemCount} items (
          {formatRelativeTime(localUpdatedAt, now)})
        </button>

        <button
          type="button"
          disabled={busy}
          title={
            onlineUpdatedAt === undefined
              ? undefined
              : new Date(onlineUpdatedAt).toLocaleString()
          }
          onClick={() => {
            void onAcceptOnline();
          }}
          className="cursor-pointer underline underline-offset-4 disabled:opacity-50"
        >
          Saved online · {onlineItemCount} items (
          {formatRelativeTime(onlineUpdatedAt, now)})
        </button>
      </div>

      {error && (
        <p role="status" className="mt-2">
          {error}
        </p>
      )}
    </section>
  );
};
