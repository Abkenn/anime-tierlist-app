import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useAccountDisplayHint } from './use-account-display-hint';

it('restores the verified display name across reloads and clears it on sign-out', () => {
  localStorage.clear();
  const first = renderHook(useAccountDisplayHint);

  act(() => first.result.current.remember('Example'));
  first.unmount();
  const restored = renderHook(useAccountDisplayHint);

  expect(restored.result.current.name).toBe('Example');
  act(() => restored.result.current.clear());
  restored.unmount();
  const signedOut = renderHook(useAccountDisplayHint);

  expect(signedOut.result.current.name).toBe('');
});
