'use client';

import { Popover } from '@base-ui/react/popover';
import { cn } from 'cn';
import {
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useState,
} from 'react';
import { RetryCountdown } from '@/app/_components/shell/retry-countdown';
import { TerminalSequence } from '@/app/_components/shell/terminal-sequence';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { useLocalTierlist } from '@/app/_hooks/use-local-tierlist';
import { useTierlistSync } from '@/app/_hooks/use-tierlist-sync';
import { tierlistErrorMessage } from '@/app/_lib/tierlist-error';
import { userSeedSchema } from '@/app/_lib/tierlist-sync';
import {
  beginGoogleSignIn,
  readGoogleTierlist,
  signOutGoogle,
} from '@/app/_services/google-auth.actions';
import {
  connectTierlist,
  disconnectTierlist,
} from '@/app/_services/tierlist.actions';
import { UserSeed } from './user-seed';

export const LocalTierlist = ({ children }: PropsWithChildren) => {
  const storage = useLocalTierlist();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [googleSeed, setGoogleSeed] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountHandle] = useState(() => Popover.createHandle());
  const sync = useTierlistSync(storage, busy);
  const googleConnected = Boolean(googleSeed && googleSeed === storage.seed);
  const googleLabel = googleName ? `${googleName} (Google)` : 'Google account';
  const backedUp = Boolean(
    storage.snapshot &&
      storage.status === 'saved' &&
      sync.status === 'saved' &&
      storage.snapshot.sync?.syncedLocalRevision === storage.snapshot.revision,
  );
  const anonymousLabel = backedUp ? 'anonymously' : 'Your seed';
  const onlineMessages = {
    connecting: 'Saved on this device · Connecting...',
    saving: 'Saving changes...',
    saved: googleConnected ? 'Changes saved in ' : 'Changes saved ',
    offline: 'Saved on this device. Backup paused.',
    conflict: 'Choose which saved version to keep.',
  };
  const messages = {
    loading: 'Restoring tierlist...',
    saving: 'Saving on this device...',
    saved: onlineMessages[sync.status],
    error: storage.error ?? 'Unable to save on this device.',
  };
  const saveMessage =
    storage.status === 'saved' && sync.status === 'saved' && !backedUp
      ? 'Saving changes...'
      : messages[storage.status];
  const message = busy ? 'Opening tierlist...' : saveMessage;
  const controlsBusy = busy || storage.status === 'loading' || !storage.seed;
  const showIdentity = Boolean(storage.seed && !busy);
  const identityLabel = googleConnected ? googleLabel : anonymousLabel;
  const identitySeparator = backedUp ? '' : ' · ';
  const statusText =
    message + (showIdentity ? identitySeparator + identityLabel : '');
  const backupMessage = sync.message ?? 'Couldn’t reach your saved tierlist.';

  const perform = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError('');

    try {
      await operation();
    } catch (failure) {
      setError(
        tierlistErrorMessage(
          failure,
          'Couldn’t connect. Your current tierlist is unchanged.',
        ),
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
      await signOutGoogle().catch(() => {
        setError(
          'Returned to this device’s tierlist. Google sign-out could not reach the server; retry when online.',
        );
      });
      setGoogleSeed('');
      setGoogleName('');
      setAccountOpen(false);
      await disconnectTierlist().catch(() => null);
      await storage.restoreDeviceProfile();
    });

  const signIn = () =>
    perform(async () => {
      const result = await beginGoogleSignIn(storage.seed);

      if (!result.ok) {
        throw new Error(result.message);
      }

      window.location.assign(result.url);
    });

  const completeGoogleSignIn = useEffectEvent(async () => {
    const result = new URL(window.location.href).searchParams.get('google');

    if (result) {
      const url = new URL(window.location.href);
      url.searchParams.delete('google');
      window.history.replaceState(null, '', url);
    }

    if (result === 'failed') {
      setError(
        'Google sign-in was cancelled or could not be completed. Please try again.',
      );
      return;
    }

    try {
      const account = await readGoogleTierlist();
      setGoogleSeed(account?.seed ?? '');
      setGoogleName(account?.displayName ?? '');

      if (result === 'connected' && account && account.seed !== storage.seed) {
        await perform(async () => {
          const connected = await connectTierlist({ seed: account.seed });

          if (!connected.ok) {
            throw new Error(connected.message);
          }

          await storage.importProfile(account.seed, connected.value);
        });
      }
    } catch {
      if (result === 'connected') {
        setError(
          'Unable to open your Google tierlist. Your device’s list is unchanged. Try signing in again.',
        );
      }
    }
  });

  useEffect(() => {
    if (storage.seed) {
      void completeGoogleSignIn();
    }
  }, [storage.seed]);

  return (
    <>
      <TerminalSequence
        identity={`${storage.seed}:${storage.status}:${sync.status}:${busy}:${error}`}
        lines={[
          statusText,
          error && !sync.conflict ? error : '',
          sync.status === 'offline' ? backupMessage : '',
          sync.status === 'offline' ? 'Retrying in 30 seconds...' : '',
          sync.status === 'offline' ? 'Try saving again' : '',
        ]}
      >
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <p role="status" className="min-w-0 max-w-full">
            <TerminalText
              segments={[
                { id: 'status', text: message },
                ...(showIdentity
                  ? [
                      {
                        id: 'separator',
                        text: identitySeparator,
                        render: (content: ReactNode) => (
                          <span className={cn(!backedUp && 'sm:hidden')}>
                            {content}
                          </span>
                        ),
                      },
                      {
                        id: 'account',
                        text: identityLabel,
                        render: (content: ReactNode) => (
                          <Popover.Trigger
                            handle={accountHandle}
                            className={cn(
                              'max-w-full cursor-pointer wrap-break-word text-left align-baseline underline decoration-current/50 underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4',
                              !backedUp && 'sm:hidden',
                            )}
                          >
                            {content}
                          </Popover.Trigger>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </p>

          <UserSeed
            seed={storage.seed}
            open={accountOpen}
            handle={accountHandle}
            onOpenChange={setAccountOpen}
            imported={storage.imported}
            busy={controlsBusy}
            error={error}
            onImport={importSeed}
            onUseDevice={restoreDevice}
            googleConnected={googleConnected}
            canSignIn={backedUp}
            onGoogleSignIn={signIn}
            onGoogleSignOut={restoreDevice}
          />
        </div>

        {error && !sync.conflict && (
          <p role="status" className="mb-3 text-xs text-muted-foreground">
            <TerminalText text={error} line={1} />
          </p>
        )}

        {sync.status === 'offline' && (
          <div className="mb-3 space-y-1 text-xs text-muted-foreground">
            <p role="status">
              <TerminalText text={backupMessage} line={2} />
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {sync.retryAt && (
                <RetryCountdown retryAt={sync.retryAt} line={3} />
              )}

              <button
                type="button"
                onClick={sync.retry}
                className="min-h-9 cursor-pointer underline underline-offset-4 hover:text-foreground"
              >
                <TerminalText text="Try saving again" line={4} />
              </button>
            </div>
          </div>
        )}
      </TerminalSequence>

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
