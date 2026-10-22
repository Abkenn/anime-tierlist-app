'use client';

import { useId, useState } from 'react';
import { useOfflineReconnect } from '@/app/_hooks/use-offline-reconnect';

type OfflineNoticeProps = ReturnType<typeof useOfflineReconnect> & {
  mode: 'offline' | 'dev' | 'dev-temporary';
};

export const OfflineStatus = () => {
  const connection = useOfflineReconnect();

  if (connection.mode === null) {
    return null;
  }

  return (
    <OfflineNotice
      key={connection.mode}
      {...connection}
      mode={connection.mode}
    />
  );
};

const OfflineNotice = ({ mode, checking, reconnect }: OfflineNoticeProps) => {
  const [open, setOpen] = useState(true);
  const noticeId = useId();

  const descriptions = {
    offline: 'The server is unreachable. Checking again every 30 seconds.',
    dev: 'Offline preview is pinned. Automatic reconnection is paused.',
    'dev-temporary': 'Offline preview. Checking the server every 30 seconds.',
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="flex min-h-11 items-center gap-2 px-2 text-xs text-umber dark:text-gold"
        aria-expanded={open}
        aria-controls={noticeId}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
        offline
      </button>

      {open && (
        <aside
          id={noticeId}
          aria-label="Offline connection"
          className="absolute -right-16 top-full z-40 mt-2 w-[min(21rem,calc(100vw-3rem))] rounded-lg border border-gold/60 bg-lemon-cream dark:bg-olive p-4 text-brown dark:text-lemon-cream shadow-sm sm:right-0"
        >
          <span
            aria-hidden="true"
            className="absolute -top-1.5 right-24 size-2.5 rotate-45 border-l border-t border-gold/60 bg-lemon-cream dark:bg-olive sm:right-6"
          />

          <div className="flex items-start justify-between gap-4">
            <div role="status" className="space-y-2">
              <p className="text-sm font-medium">You’re in offline mode</p>

              <p className="text-xs leading-5">{descriptions[mode]}</p>
            </div>

            <button
              type="button"
              aria-label="Dismiss offline notice"
              className="-mr-2 -mt-2 flex size-9 shrink-0 items-center justify-center rounded-sm text-lg hover:bg-brown/10 dark:hover:bg-lemon-cream/10"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <button
            type="button"
            disabled={checking}
            onClick={() => void reconnect()}
            className="mt-3 min-h-9 text-xs underline underline-offset-4 disabled:cursor-wait disabled:no-underline"
          >
            {checking ? 'Reconnecting…' : 'Retry connection'}
          </button>
        </aside>
      )}
    </div>
  );
};
