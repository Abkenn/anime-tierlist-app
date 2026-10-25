import type { useLocalTierlist } from '@/app/_hooks/use-local-tierlist';
import type { useTierlistSync } from '@/app/_hooks/use-tierlist-sync';

type AccountStatusInput = {
  storage: ReturnType<typeof useLocalTierlist>;
  sync: ReturnType<typeof useTierlistSync>;
  busy: boolean;
  error: string;
  googleConnected: boolean;
  googleName: string;
  hintName: string;
  identityReady: boolean;
};

export const getTierlistAccountStatus = ({
  storage,
  sync,
  busy,
  error,
  googleConnected,
  googleName,
  hintName,
  identityReady,
}: AccountStatusInput) => {
  const visibleError = sync.status === 'outdated' ? '' : error;
  const displayName = googleName || (googleConnected ? hintName : '');
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
    (cachedAccount || (storage.status === 'loading' && hintName));
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
  const restoredName = displayName || hintName;
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

  return {
    visibleError,
    backedUp,
    restoringAccount,
    verifyingIdentity,
    controlsBusy,
    message,
    showIdentity,
    identityLabel,
    identitySeparator,
    statusText,
    backupMessage,
    needsReconnect,
    reconnectLabel,
  };
};
