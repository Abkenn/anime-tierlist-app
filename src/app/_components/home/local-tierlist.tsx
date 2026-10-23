'use client';

import type { PropsWithChildren } from 'react';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { useLocalTierlist } from '@/app/_hooks/use-local-tierlist';
import { UserSeed } from './user-seed';

export const LocalTierlist = ({ children }: PropsWithChildren) => {
  const storage = useLocalTierlist();
  const messages = {
    loading: 'Restoring tierlist...',
    saving: 'Saving...',
    saved: 'Saved on this device',
    error: storage.error ?? 'Unable to save on this device.',
  };
  const message = messages[storage.status];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3 text-xs text-muted-foreground">
        <p role="status">
          <TerminalText text={message} />
        </p>

        {storage.seed && <UserSeed seed={storage.seed} />}
      </div>

      <div
        inert={storage.status === 'loading'}
        aria-busy={storage.status === 'loading'}
      >
        {children}
      </div>
    </>
  );
};
