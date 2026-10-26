import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useOfflineUpdate } from './use-offline-update';

it('detects a waiting update and waits for controller takeover before completing', async () => {
  const worker = Object.assign(new EventTarget(), { postMessage: vi.fn() });
  const registration = Object.assign(new EventTarget(), {
    waiting: null as typeof worker | null,
    installing: null as typeof worker | null,
  });
  const container = Object.assign(new EventTarget(), {
    ready: Promise.resolve(registration),
  });
  const original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: container,
  });

  const hook = renderHook(useOfflineUpdate);
  try {
    await act(async () => {});
    act(() => {
      registration.installing = worker;
      registration.dispatchEvent(new Event('updatefound'));
      registration.waiting = worker;
      worker.dispatchEvent(new Event('statechange'));
    });
    await waitFor(() => expect(hook.result.current.available).toBe(true));

    let completed = false;
    const activated = (async () => {
      await hook.result.current.activate();
      completed = true;
    })();
    expect(worker.postMessage).toHaveBeenCalledWith('ACTIVATE_UPDATE');
    await Promise.resolve();
    expect(completed).toBe(false);

    await act(async () => {
      registration.waiting = null;
      container.dispatchEvent(new Event('controllerchange'));
      await activated;
    });
    expect(completed).toBe(true);
    expect(hook.result.current.available).toBe(false);
  } finally {
    hook.unmount();
    if (original) {
      Object.defineProperty(navigator, 'serviceWorker', original);
    } else {
      Reflect.deleteProperty(navigator, 'serviceWorker');
    }
  }
});
