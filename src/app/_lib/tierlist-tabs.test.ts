import { expect, it, vi } from 'vitest';
import { notifyTierlistTabs, subscribeTierlistTabs } from './tierlist-tabs';

it('shares one channel, delivers local and remote notifications, and closes after the last subscriber', () => {
  const instances: Channel[] = [];
  class Channel extends EventTarget {
    postMessage = vi.fn();
    close = vi.fn();

    constructor() {
      super();
      instances.push(this);
    }
  }
  vi.stubGlobal('BroadcastChannel', Channel);
  const first = vi.fn();
  const second = vi.fn();
  const stopFirst = subscribeTierlistTabs(first);
  const stopSecond = subscribeTierlistTabs(second);

  try {
    notifyTierlistTabs();
    notifyTierlistTabs();
    expect(instances).toHaveLength(1);
    expect(instances[0].postMessage).toHaveBeenCalledTimes(2);
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(2);
    instances[0].dispatchEvent(
      new MessageEvent('message', { data: 'changed' }),
    );
    instances[0].dispatchEvent(
      new MessageEvent('message', { data: 'unrecognized' }),
    );
    expect(first).toHaveBeenCalledTimes(3);
    expect(second).toHaveBeenCalledTimes(3);

    stopFirst();
    expect(instances[0].close).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('focus'));
    expect(first).toHaveBeenCalledTimes(3);
    expect(second).toHaveBeenCalledTimes(4);
    stopSecond();
    expect(instances[0].close).toHaveBeenCalledTimes(1);
  } finally {
    stopFirst();
    stopSecond();
    vi.unstubAllGlobals();
  }
});
