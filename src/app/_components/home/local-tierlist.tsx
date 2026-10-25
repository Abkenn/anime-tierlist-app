'use client';

import { Popover } from '@base-ui/react/popover';
import { cn } from 'cn';
import {
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { RetryCountdown } from '@/app/_components/shell/retry-countdown';
import { TerminalSequence } from '@/app/_components/shell/terminal-sequence';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { useAccountDisplayHint } from '@/app/_hooks/use-account-display-hint';
import { useLocalTierlist } from '@/app/_hooks/use-local-tierlist';
import { usePromiseValue } from '@/app/_hooks/use-promise-value';
import { useTierlistSync } from '@/app/_hooks/use-tierlist-sync';
import { authClient } from '@/app/_lib/auth-client';
import {
  isOutdatedTierlistClient,
  tierlistErrorMessage,
  tierlistUpdateMessage,
} from '@/app/_lib/tierlist-error';
import { userSeedSchema } from '@/app/_lib/tierlist-sync';
import { readGoogleTierlist } from '@/app/_services/google-auth.actions';
import {
  connectTierlist,
  createShareSeed,
  disconnectTierlist,
  replaceAccountFromSeed,
} from '@/app/_services/tierlist.actions';
import type { AccountSnapshot } from '@/app/_types/account-snapshot';
import { UserSeed } from './user-seed';

const unavailableAccount: AccountSnapshot = { status: 'unavailable' };

export const LocalTierlist = ({
  children,
  initialAccount,
}: PropsWithChildren<{ initialAccount?: Promise<AccountSnapshot> }>) => {
  const initial = usePromiseValue(initialAccount, unavailableAccount);
  const initialReady = !initialAccount || initial !== null;
  const storage = useLocalTierlist();
  const session = authClient.useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [googleProfileKey, setGoogleProfileKey] = useState('');
  const [googleName, setGoogleName] = useState('');
  const accountHint = useAccountDisplayHint();
  const [resolvedUserId, setResolvedUserId] = useState<string | null>();
  const sessionUserId =
    session.isPending && initial?.status === 'ready'
      ? initial.userId
      : (session.data?.user.id ?? null);
  const sessionReady = !session.isPending || initial?.status === 'ready';
  const identityReady =
    initialReady && sessionReady && resolvedUserId === sessionUserId;
  const [accountOpen, setAccountOpen] = useState(false);
  const statusAnchor = useRef<HTMLButtonElement>(null);
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
  const displayName = googleName || (googleConnected ? accountHint.name : '');
  const googleLabel = displayName
    ? `${displayName} (Google)`
    : 'Google account';
  const cachedAccount = Boolean(
    googleConnected &&
      storage.status === 'saved' &&
      storage.snapshot?.sync?.syncedLocalRevision ===
        storage.snapshot?.revision,
  );
  const restoringAccount =
    !busy &&
    (sync.status === 'connecting' || !identityReady) &&
    (cachedAccount || (storage.status === 'loading' && accountHint.name));
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
  const restoredMessage = cachedAccount ? 'Changes saved in ' : '';
  const settledMessage = restoringAccount ? restoredMessage : saveMessage;
  const verifyingIdentity = !identityReady && !busy;
  const visibleMessage =
    verifyingIdentity && !restoringAccount ? '' : settledMessage;
  const message = busy ? 'Opening tierlist...' : visibleMessage;
  const controlsBusy =
    busy || !identityReady || storage.status === 'loading' || !storage.seed;
  const showIdentity = Boolean(
    restoringAccount || (storage.seed && !busy && identityReady),
  );
  const restoredName = displayName || accountHint.name;
  const restoredLabel = restoredName
    ? `${restoredName} (Google)`
    : 'Google account';
  const verifiedLabel = googleConnected ? googleLabel : anonymousLabel;
  const identityLabel = restoringAccount ? restoredLabel : verifiedLabel;
  const identitySeparator = backedUp || restoringAccount ? '' : ' · ';
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

      setAccountOpen(true);
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
      if (sessionUserId) {
        const result = await authClient.signOut();
        if (result.error) {
          throw new Error(
            'Unable to sign out. Check your connection and try again.',
          );
        }
      }

      setGoogleProfileKey('');
      setGoogleName('');
      accountHint.clear();
      setAccountOpen(false);
      try {
        await disconnectTierlist();
      } catch {
        // Restoring the device profile must also work without the server.
      }

      await storage.restoreDeviceProfile();
    });

  const signIn = () =>
    perform(async () => {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/?google=connected',
        errorCallbackURL: '/?google=failed',
      });
      if (result.error) {
        throw new Error(
          result.error.code === 'PROVIDER_NOT_FOUND'
            ? 'Google sign-in is not configured on this server yet.'
            : 'Unable to start Google sign-in. Check your connection and try again.',
        );
      }
    });

  const reloadApp = () =>
    perform(async () => {
      await storage.flush();
      window.location.reload();
    });

  const completeGoogleSignIn = useEffectEvent(async (userId: string | null) => {
    const result = new URL(window.location.href).searchParams.get('google');

    if (result) {
      const url = new URL(window.location.href);
      url.searchParams.delete('google');
      window.history.replaceState(null, '', url);
    }

    if (result === 'failed') {
      setAccountOpen(true);
      setError(
        'Google sign-in was cancelled or could not be completed. Please try again.',
      );
      setResolvedUserId(userId);

      return;
    }

    try {
      const fromServer =
        initial?.status === 'ready' && initial.userId === userId;
      if (session.error && !fromServer) {
        throw new Error('Unable to check your account right now.');
      }

      let account = fromServer ? initial.account : null;
      if (!account && userId) {
        account = await readGoogleTierlist();
      }

      setGoogleProfileKey(account?.profileKey ?? '');
      setGoogleName(account?.displayName ?? '');
      if (account) {
        accountHint.remember(account.displayName);
      } else {
        accountHint.clear();
      }

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
        setAccountOpen(true);
        setError(
          'Unable to open your Google tierlist. Your device’s list is unchanged. Try signing in again.',
        );
      }
    } finally {
      setResolvedUserId(userId);
    }
  });

  useEffect(() => {
    if (
      storage.seed &&
      initialReady &&
      sessionReady &&
      !busy &&
      resolvedUserId !== sessionUserId
    ) {
      void completeGoogleSignIn(sessionUserId);
    }
  }, [
    storage.seed,
    sessionUserId,
    initialReady,
    sessionReady,
    busy,
    resolvedUserId,
  ]);

  return (
    <>
      <TerminalSequence
        identity={`${statusText}:${sync.status === 'offline' ? backupMessage : ''}`}
        lines={[
          statusText,
          '',
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
                          <span
                            className={cn(
                              !backedUp && !restoringAccount && 'sm:hidden',
                            )}
                          >
                            {content}
                          </span>
                        ),
                      },
                      {
                        id: 'account',
                        text: identityLabel,
                        render: (content: ReactNode) => (
                          <Popover.Trigger
                            ref={statusAnchor}
                            handle={accountHandle}
                            className={cn(
                              'max-w-full cursor-pointer wrap-break-word text-left align-baseline underline decoration-current/50 underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4',
                              !backedUp && !restoringAccount && 'sm:hidden',
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
            statusAnchor={statusAnchor}
            onOpenChange={setAccountOpen}
            imported={storage.imported}
            busy={controlsBusy}
            error={visibleError}
            onImport={importSeed}
            onUseDevice={restoreDevice}
            resolvingIdentity={verifyingIdentity}
            googleConnected={googleConnected || Boolean(restoringAccount)}
            canSignIn={backedUp}
            onGoogleSignIn={signIn}
            onGoogleSignOut={restoreDevice}
            onShare={shareSeed}
          />
        </div>

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
        className="flex min-h-0 flex-1 flex-col"
        inert={storage.status === 'loading' || busy}
        aria-busy={storage.status === 'loading' || busy}
      >
        {children}
      </div>
    </>
  );
};
