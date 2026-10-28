'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useAccountDisplayHint } from '@/app/_hooks/use-account-display-hint';
import { useLocalTierlist } from '@/app/_hooks/use-local-tierlist';
import { useProjectImport } from '@/app/_hooks/use-project-import';
import { usePromiseValue } from '@/app/_hooks/use-promise-value';
import { useTierlistSync } from '@/app/_hooks/use-tierlist-sync';
import { authClient } from '@/app/_lib/auth-client';
import { getTierlistAccountStatus } from '@/app/_lib/tierlist-account-status';
import {
  isOutdatedTierlistClient,
  tierlistErrorMessage,
} from '@/app/_lib/tierlist-error';
import { userSeedSchema } from '@/app/_lib/tierlist-sync';
import { readGoogleTierlist } from '@/app/_services/google-auth.actions';
import {
  activateDeviceTierlist,
  backupLocalTierlist,
  readLocalTierlist,
  saveLocalTierlist,
} from '@/app/_services/local-tierlist';
import { OFFLINE_RECOVERED_EVENT } from '@/app/_services/offline-mode';
import {
  connectTierlist,
  disconnectTierlist,
  replaceAccountFromSeed,
} from '@/app/_services/tierlist.actions';
import {
  findExistingPreview,
  prepareShare,
  publishShare,
} from '@/app/_services/tierlist-share.actions';
import type { AccountSnapshot } from '@/app/_types/account-snapshot';

const unavailableAccount: AccountSnapshot = { status: 'unavailable' };

export const useTierlistAccount = (
  initialAccount?: Promise<AccountSnapshot>,
) => {
  const initial = usePromiseValue(initialAccount, unavailableAccount);
  const initialReady = !initialAccount || initial !== null;
  const storage = useLocalTierlist();
  const session = authClient.useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [googleProfileKey, setGoogleProfileKey] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [accountVerified, setAccountVerified] = useState(false);
  const [accountAttempt, setAccountAttempt] = useState(0);
  const revalidating = useRef(false);
  const sharingSeed = useRef<{
    key: string;
    task: Promise<{ seed: string; ownerId: string; revision: number }>;
  } | null>(null);
  const rejectedProfile = useRef('');
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
  const googleConnected = Boolean(
    storage.snapshot?.accountOwnerId ||
      (googleProfileKey && googleProfileKey === storage.seed),
  );
  const projectImport = useProjectImport({
    storage,
    ready: identityReady && !busy,
    accountProfileKey: googleProfileKey,
  });
  const sync = useTierlistSync(
    storage,
    busy ||
      projectImport.opening ||
      !identityReady ||
      (googleConnected &&
        (!accountVerified ||
          !sessionUserId ||
          googleProfileKey !== storage.seed)),
    googleConnected,
  );
  const status = getTierlistAccountStatus({
    storage,
    sync,
    busy: busy || projectImport.opening,
    error,
    googleConnected,
    googleName,
    hintName: accountHint.name,
    identityReady,
  });

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
        if (!snapshot?.sync || !status.backedUp) {
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

  const backupSeed = async () => (await prepareSharing()).seed;

  const shareInput = async () => {
    await storage.flush();
    await sync.saveNow();
    const snapshot = await storage.refresh();
    if (
      !snapshot?.sync ||
      snapshot.sync.syncedLocalRevision !== snapshot.revision
    ) {
      throw new Error('Wait for your changes to save online before sharing.');
    }

    return {
      ownerId: snapshot.sync.ownerId,
      revision: snapshot.sync.serverRevision,
      seed: googleConnected ? undefined : snapshot.seed,
    };
  };

  const prepareSharing = async () => {
    await storage.flush();
    const snapshot = await storage.refresh();
    if (!snapshot) {
      throw new Error('Wait for your tierlist to finish loading.');
    }
    if (!googleConnected) {
      return {
        seed: snapshot.seed,
        ownerId: snapshot.sync?.ownerId ?? '',
        revision: snapshot.sync?.serverRevision ?? 0,
      };
    }
    const key = `${snapshot.seed}:${snapshot.revision}`;
    if (sharingSeed.current?.key === key) {
      return sharingSeed.current.task;
    }
    const run = async () => {
      try {
        const input = await shareInput();
        const result = await prepareShare(input);
        if (!result.ok) {
          throw new Error(result.message);
        }
        return {
          ...result.value,
          ownerId: input.ownerId,
          revision: input.revision,
        };
      } catch (error) {
        if (sharingSeed.current?.key === key) {
          sharingSeed.current = null;
        }
        throw error;
      }
    };
    const task = run();
    sharingSeed.current = { key, task };
    return task;
  };

  const findSharingPreview = async () => {
    const snapshot = storage.snapshot;
    if (
      !snapshot?.sync ||
      snapshot.sync.syncedLocalRevision !== snapshot.revision
    ) {
      return null;
    }
    const result = await findExistingPreview({
      ownerId: snapshot.sync.ownerId,
      revision: snapshot.sync.serverRevision,
    });
    if (!result.ok || !result.value) {
      return null;
    }

    return new URL(
      `/${result.value.id}.${result.value.version}`,
      window.location.origin,
    ).href;
  };

  const publishSharing = async () => {
    const latest = await shareInput();
    const result = await publishShare({
      ownerId: latest.ownerId,
      revision: latest.revision,
    });
    if (!result.ok) {
      throw new Error(result.message);
    }

    return new URL(
      `/${result.value.id}.${result.value.version}`,
      window.location.origin,
    ).href;
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
        if (result.error.status === 429) {
          throw new Error(
            'Too many sign-in attempts. Wait a moment and try again.',
          );
        }

        if (result.error.code === 'INVALID_ORIGIN') {
          throw new Error(
            'Google sign-in is unavailable at this site address.',
          );
        }

        throw new Error(
          result.error.code === 'PROVIDER_NOT_FOUND'
            ? 'Google sign-in is not configured on this server yet.'
            : 'Unable to start Google sign-in. Check your connection and try again.',
        );
      }
    });

  const replaceDevice = () =>
    perform(async () => {
      if (googleConnected || !storage.imported) {
        throw new Error('Open an imported anonymous tierlist first.');
      }

      await storage.replaceDeviceProfile();
      try {
        await disconnectTierlist();
      } catch {
        // The copied local list can reconnect with its own seed when online.
      }
      setAccountOpen(false);
    });

  const returnFromProject = () =>
    perform(async () => {
      const project = projectImport.project;
      if (!project) {
        return;
      }
      await storage.selectProfile(project.returnSeed);
      projectImport.clear();
      setAccountOpen(false);
      sync.retry();
    });

  const replaceFromProject = () =>
    perform(async () => {
      const project = projectImport.project;
      if (!project) {
        return;
      }
      if (project.returnAccount) {
        const account = await readGoogleTierlist();
        if (!account || account.profileKey !== project.returnSeed) {
          throw new Error(
            'Sign in to the original Google account before replacing its tierlist.',
          );
        }
        const original = await readLocalTierlist(project.returnSeed);
        const source = await storage.refresh();
        if (
          !source?.sync ||
          source.sync.syncedLocalRevision !== source.revision
        ) {
          throw new Error(
            'Wait for this project to finish saving before replacing your tierlist.',
          );
        }
        const result = await replaceAccountFromSeed({
          seed: source.seed,
          ownerId: account.remote.ownerId,
          revision: account.remote.revision,
        });
        if (!result.ok) {
          throw new Error(result.message);
        }
        await backupLocalTierlist(original);
        await saveLocalTierlist(
          {
            ...original,
            ...result.value.document,
            seed: original.seed,
            accountOwnerId: original.accountOwnerId,
            revision: original.revision + 1,
            sync: {
              ownerId: result.value.ownerId,
              serverRevision: result.value.revision,
              syncedLocalRevision: original.revision + 1,
            },
          },
          original.revision,
        );
        await storage.selectProfile(account.profileKey);
      } else if (storage.imported) {
        await storage.replaceDeviceProfile();
      } else {
        await activateDeviceTierlist();
      }
      projectImport.clear();
      setAccountOpen(false);
      sync.retry();
    });

  const reloadApp = () =>
    perform(async () => {
      await storage.flush();
      window.location.reload();
    });

  const completeGoogleSignIn = useEffectEvent(async (userId: string | null) => {
    setAccountVerified(false);
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
      const localProfile =
        new URL(window.location.href).searchParams.get('profile') === 'local';
      const fromServer =
        initial?.status === 'ready' && initial.userId === userId;
      if (session.error && !fromServer && !localProfile) {
        throw new Error('Unable to check your account right now.');
      }

      let account = fromServer && !localProfile ? initial.account : null;
      if (!account && userId && !localProfile) {
        account = await readGoogleTierlist();
      }

      setGoogleProfileKey(account?.profileKey ?? '');
      setGoogleName(account?.displayName ?? '');
      if (account) {
        accountHint.remember(account.displayName);
      } else {
        accountHint.clear();
      }

      if (
        account &&
        account.profileKey !== storage.seed &&
        !projectImport.project
      ) {
        await perform(async () => {
          await storage.importAccountProfile(
            account.profileKey,
            account.remote,
          );
        });
      } else if (!account && storage.snapshot?.accountOwnerId) {
        await storage.restoreDeviceProfile();
      }

      setAccountVerified(true);
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

  const revalidateAccount = useEffectEvent(async () => {
    if (revalidating.current) {
      return;
    }
    revalidating.current = true;
    try {
      await session.refetch();
      setAccountAttempt((value) => value + 1);
    } catch {
      // The next connection recovery retries verification while the local draft stays available.
    } finally {
      revalidating.current = false;
    }
  });

  useEffect(() => {
    const retry = () => {
      void revalidateAccount();
    };
    window.addEventListener('online', retry);
    window.addEventListener(OFFLINE_RECOVERED_EVENT, retry);

    return () => {
      window.removeEventListener('online', retry);
      window.removeEventListener(OFFLINE_RECOVERED_EVENT, retry);
    };
  }, []);

  useEffect(() => {
    if (
      storage.seed &&
      initialReady &&
      sessionReady &&
      !busy &&
      (resolvedUserId !== sessionUserId ||
        (accountAttempt > 0 && !accountVerified) ||
        (!sessionUserId &&
          !session.error &&
          Boolean(storage.snapshot?.accountOwnerId)))
    ) {
      void completeGoogleSignIn(sessionUserId);
    }
  }, [
    storage.seed,
    accountAttempt,
    accountVerified,
    sessionUserId,
    initialReady,
    sessionReady,
    busy,
    resolvedUserId,
    session.error,
    storage.snapshot?.accountOwnerId,
  ]);

  const restoreRejectedProfile = useEffectEvent(() => {
    if (rejectedProfile.current !== storage.seed) {
      rejectedProfile.current = storage.seed;
      void perform(async () => {
        setGoogleProfileKey('');
        setGoogleName('');
        accountHint.clear();
        await storage.restoreDeviceProfile();
      });
    }
  });

  useEffect(() => {
    if (sync.status === 'unauthorized' && !busy && storage.imported) {
      restoreRejectedProfile();
    }
  }, [sync.status, busy, storage.imported]);

  return {
    storage,
    sync,
    busy: busy || projectImport.opening,
    error,
    accountOpen,
    setAccountOpen,
    googleConnected,
    project: projectImport.project,
    accountUnavailable: Boolean(
      storage.snapshot?.accountOwnerId &&
        sessionReady &&
        !session.error &&
        !sessionUserId,
    ),
    status,
    actions: {
      importSeed,
      restoreDevice: projectImport.project ? returnFromProject : restoreDevice,
      replaceDevice: projectImport.project ? replaceFromProject : replaceDevice,
      signIn,
      backupSeed,
      publishSharing,
      findSharingPreview,
      reloadApp,
      keepDeviceChanges: () => perform(sync.keepDeviceChanges),
      acceptOnlineChanges: () => perform(sync.acceptOnlineChanges),
    },
  };
};
