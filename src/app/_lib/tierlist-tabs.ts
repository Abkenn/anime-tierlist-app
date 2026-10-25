const channelName = 'tierlist-draft-changed';
const subscribers = new Set<() => void>();
let channel: BroadcastChannel | undefined;

const refreshSubscribers = () => {
  subscribers.forEach((refresh) => {
    refresh();
  });
};

const getChannel = () => {
  if (
    typeof window === 'undefined' ||
    typeof BroadcastChannel === 'undefined'
  ) {
    return;
  }

  if (!channel) {
    channel = new BroadcastChannel(channelName);
    channel.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (event.data === 'changed') {
        refreshSubscribers();
      }
    });
  }

  return channel;
};

const closeChannel = () => {
  channel?.close();
  channel = undefined;
};

export const notifyTierlistTabs = () => {
  getChannel()?.postMessage('changed');
  // BroadcastChannel doesn't deliver a message back to its sending instance.
  refreshSubscribers();
  if (!subscribers.size) {
    closeChannel();
  }
};

export const subscribeTierlistTabs = (refresh: () => void) => {
  const subscriber = () => refresh();
  subscribers.add(subscriber);
  getChannel();
  window.addEventListener('focus', refreshSubscribers);

  return () => {
    subscribers.delete(subscriber);
    if (!subscribers.size) {
      closeChannel();
      window.removeEventListener('focus', refreshSubscribers);
    }
  };
};

export const withTierlistSyncLock = async (operation: () => Promise<void>) => {
  if (!navigator.locks) {
    await operation();

    return;
  }

  // Authentication cookies are shared too, so serialize online work across profiles.
  await navigator.locks.request('tierlist-online-sync', operation);
};
