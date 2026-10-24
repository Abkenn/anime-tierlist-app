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
import {
  isOutdatedTierlistClient,
  tierlistErrorMessage,
  tierlistUpdateMessage,
} from '@/app/_lib/tierlist-error';
import { userSeedSchema } from '@/app/_lib/tierlist-sync';
import {
  beginGoogleSignIn,
  readGoogleTierlist,
  signOutGoogle,
} from '@/app/_services/google-auth.actions';
import {
  connectTierlist,
  createShareSeed,
  disconnectTierlist,
  replaceAccountFromSeed,
} from '@/app/_services/tierlist.actions';
import { UserSeed } from './user-seed';

export const LocalTierlist = ({ children }: PropsWithChildren) => {
  const storage = useLocalTierlist();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [googleProfileKey, setGoogleProfileKey] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [identityReady, setIdentityReady] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountHandle] = useState(() => Popover.createHandle());
  const googleConnected = Boolean(
    storage.snapshot?.accountOwnerId ||
      (googleProfileKey && googleProfileKey === storage.seed),
  );
  const sync = useTierlistSync(
    storage,
    busy ||
      !identityReady ||
      Boolean(storage.snapshot?.accountOwnerId && !googleConnected),
    googleConnected,
  );
  const visibleError = sync.status === 'outdated' ? '' : error;
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
    outdated: 'Saved on this device.',
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
  const controlsBusy =
    busy || !identityReady || storage.status === 'loading' || !storage.seed;
  const showIdentity = Boolean(storage.seed && !busy && identityReady);
  const identityLabel = googleConnected ? googleLabel : anonymousLabel;
  const identitySeparator = backedUp ? '' : ' · ';
  const statusText =
    message + (showIdentity ? identitySeparator + identityLabel : '');
  const backupMessage = sync.message ?? 'Couldn’t reach your saved tierlist.';
  const needsReconnect =
    sync.status === 'offline' || sync.status === 'outdated';
  const reconnectLabel =
    sync.status === 'outdated' ? 'Reload app' : 'Try saving again';

  const perform = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError('');

    try {
      await operation();
      return true;
    } catch (failure) {
      if (isOutdatedTierlistClient(failure)) {
        sync.requireReload();
        setError('');
        return false;
      }

      setError(
        tierlistErrorMessage(
          failure,
          'Couldn’t connect. Your current tierlist is unchanged.',
        ),
      );
      return false;
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

      if (!googleConnected && parsed.data === storage.seed) {
        return;
      }

      if (googleConnected) {
        await storage.flush();
        const snapshot = storage.snapshot;
        if (!snapshot?.sync || !backedUp) {
          throw new Error(
            'Wait for your changes to save before replacing this tierlist.',
          );
        }

        const result = await replaceAccountFromSeed({
          seed: parsed.data,
          ownerId: snapshot.sync.ownerId,
          revision: snapshot.sync.serverRevision,
        });
        if (!result.ok) {
          throw new Error(result.message);
        }

        await storage.replaceRemote(result.value, snapshot.revision);
        sync.retry();
        return;
      }

      const result = await connectTierlist({ seed: parsed.data });

      if (!result.ok) {
        throw new Error(result.message);
      }

      await storage.importProfile(parsed.data, result.value);
    });

  const shareSeed = async () => {
    await storage.flush();
    if (!backedUp) {
      throw new Error('Wait for your changes to save before sharing.');
    }

    const result = await createShareSeed();
    if (!result.ok) {
      throw new Error(result.message);
    }

    return result.value;
  };

  const restoreDevice = () =>
    perform(async () => {
      await signOutGoogle().catch(() => {
        setError(
          'Returned to this device’s tierlist. Google sign-out could not reach the server; retry when online.',
        );
      });
      setGoogleProfileKey('');
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

  const reloadApp = () =>
    perform(async () => {
      await storage.flush();
      window.location.reload();
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
      setIdentityReady(true);
      return;
    }

    try {
      const account = await readGoogleTierlist();
      setGoogleProfileKey(account?.profileKey ?? '');
      setGoogleName(account?.displayName ?? '');

      if (account && account.profileKey !== storage.seed) {
        await perform(async () => {
          await storage.importAccountProfile(
            account.profileKey,
            account.remote,
          );
        });
      } else if (!account && storage.snapshot?.accountOwnerId) {
        await storage.restoreDeviceProfile();
      }
    } catch (failure) {
      if (isOutdatedTierlistClient(failure)) {
        sync.requireReload();
        return;
      }

      if (result === 'connected') {
        setError(
          'Unable to open your Google tierlist. Your device’s list is unchanged. Try signing in again.',
        );
      }
    } finally {
      setIdentityReady(true);
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
        identity={`${statusText}:${visibleError}:${sync.status === 'offline' ? backupMessage : ''}`}
        lines={[
          statusText,
          visibleError && !sync.conflict && !accountOpen ? visibleError : '',
          needsReconnect ? backupMessage : '',
          sync.status === 'offline' ? 'Retrying in 30 seconds...' : '',
          needsReconnect ? reconnectLabel : '',
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
            seed={
              googleConnected || storage.snapshot?.accountOwnerId
                ? ''
                : storage.seed
            }
            open={accountOpen}
            handle={accountHandle}
            onOpenChange={setAccountOpen}
            imported={storage.imported}
            busy={controlsBusy}
            error={visibleError}
            onImport={importSeed}
            onUseDevice={restoreDevice}
            googleConnected={googleConnected}
            canSignIn={backedUp}
            onGoogleSignIn={signIn}
            onGoogleSignOut={restoreDevice}
            onShare={shareSeed}
          />
        </div>

        {visibleError && !sync.conflict && !accountOpen && (
          <p role="status" className="mb-3 text-xs text-muted-foreground">
            <TerminalText text={visibleError} line={1} />
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

        {sync.status === 'outdated' && (
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <p role="status">
              <TerminalText text={tierlistUpdateMessage} line={2} />
            </p>

            <button
              type="button"
              disabled={busy}
              onClick={() => void reloadApp()}
              className="min-h-9 cursor-pointer underline underline-offset-4 hover:text-foreground disabled:opacity-50"
            >
              <TerminalText text="Reload app" line={4} />
            </button>
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
