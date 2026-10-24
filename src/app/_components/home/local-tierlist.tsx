'use client';

import { type PropsWithChildren, useState } from 'react';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { useLocalTierlist } from '@/app/_hooks/use-local-tierlist';
import { useTierlistSync } from '@/app/_hooks/use-tierlist-sync';
import { userSeedSchema } from '@/app/_lib/tierlist-sync';
import {
  connectTierlist,
  disconnectTierlist,
} from '@/app/_services/tierlist.actions';
import { UserSeed } from './user-seed';

export const LocalTierlist = ({ children }: PropsWithChildren) => {
  const storage = useLocalTierlist();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sync = useTierlistSync(storage, busy);
  const onlineMessages = {
    connecting: 'Saved on this device · Connecting...',
    saving: 'Saved on this device · Saving online...',
    saved: 'Saved on this device and online',
    offline: sync.message ?? 'Saved locally. Online saving is unavailable.',
    conflict: 'Changes on this device and online need your choice.',
  };
  const messages = {
    loading: 'Restoring tierlist...',
    saving: 'Saving...',
    saved: onlineMessages[sync.status],
    error: storage.error ?? 'Unable to save on this device.',
  };
  const message = messages[storage.status];

  const perform = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError('');

    try {
      await operation();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Unable to switch tierlists. Your current list is unchanged.',
      );
    } finally {
      setBusy(false);
    }
  };

  const importSeed = (input: string) =>
    perform(async () => {
      const parsed = userSeedSchema.safeParse(input);

      if (!parsed.success) {
        throw new Error('Enter a valid 64-character seed.');
      }

      if (parsed.data === storage.seed) {
        return;
      }

      const result = await connectTierlist({ seed: parsed.data });

      if (!result.ok) {
        throw new Error(result.message);
      }

      await storage.importProfile(parsed.data, result.value);
    });

  const restoreDevice = () =>
    perform(async () => {
      await disconnectTierlist().catch(() => null);
      await storage.restoreDeviceProfile();
    });

  return (
    <>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3 text-xs text-muted-foreground">
        <p role="status">
          <TerminalText text={message} />
        </p>

        {storage.seed && (
          <UserSeed
            seed={storage.seed}
            imported={storage.imported}
            busy={busy}
            error={error}
            onImport={importSeed}
            onUseDevice={restoreDevice}
          />
        )}
      </div>

      {sync.status === 'offline' && (
        <button
          type="button"
          onClick={sync.retry}
          className="mb-3 cursor-pointer text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Retry online saving
        </button>
      )}

      {sync.conflict && (
        <section
          aria-label="Choose tierlist version"
          className="mb-3 border border-divider p-3 text-xs"
        >
          <p>
            This device has {storage.snapshot?.items.length ?? 0} items. Latest
            saved online has {sync.conflict.document.items.length} items. Keep
            the version you want; a local copy of replaced edits is retained.
          </p>

          <div className="mt-2 flex gap-5">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void perform(sync.keepDeviceChanges);
              }}
              className="cursor-pointer underline underline-offset-4 disabled:opacity-50"
            >
              This device
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void perform(sync.acceptOnlineChanges);
              }}
              className="cursor-pointer underline underline-offset-4 disabled:opacity-50"
            >
              Latest saved online
            </button>
          </div>

          {error && (
            <p role="status" className="mt-2">
              {error}
            </p>
          )}
        </section>
      )}

      <div
        inert={storage.status === 'loading' || busy}
        aria-busy={storage.status === 'loading' || busy}
      >
        {children}
      </div>
    </>
  );
};
