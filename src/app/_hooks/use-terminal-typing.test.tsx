import { act, cleanup, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { TerminalSequence } from '@/app/_components/shell/terminal-sequence';
import { useTerminalTyping } from './use-terminal-typing';

const text = 'Changes saved anonymously';
let identity = 'first';

const Wrapper = ({ children }: PropsWithChildren) => (
  <TerminalSequence identity={identity} lines={[text]}>
    {children}
  </TerminalSequence>
);

afterEach(cleanup);

describe('unchanged terminal messages', () => {
  it('keeps completed text when its sequence context changes', () => {
    identity = 'first';

    const { result, rerender } = renderHook(
      () => useTerminalTyping({ text, replaceTail: false, line: 0 }),
      { wrapper: Wrapper },
    );

    act(() => result.current.typed.set(text));
    identity = 'next';
    rerender();

    expect(result.current.typed.get()).toBe(text);
  });

  it('continues a partially typed message without erasing its existing prefix', () => {
    identity = 'first';

    const { result, rerender } = renderHook(
      () => useTerminalTyping({ text, replaceTail: false, line: 0 }),
      { wrapper: Wrapper },
    );

    act(() => result.current.typed.set('Changes saved'));
    identity = 'next';
    rerender();

    expect(result.current.typed.get()).toBe('Changes saved');
  });
});

it('resumes a repeated message and preserves the prefix when account text is appended', () => {
  const { result, rerender } = renderHook(
    ({ text }) => useTerminalTyping({ text, replaceTail: false, line: 0 }),
    { initialProps: { text: 'Saved on this device · Connecting...' } },
  );
  act(() => result.current.typed.set('Saved on this device · Connect'));
  rerender({ text: 'Restoring tierlist...' });
  rerender({ text: 'Saved on this device · Connecting...' });
  expect(result.current.typed.get()).toBe('Saved on this device · Connect');
  act(() => result.current.typed.set('Saved on this device · Connecting...'));
  rerender({ text: 'Saved on this device · Connecting... · Google account' });
  expect(result.current.typed.get()).toBe(
    'Saved on this device · Connecting...',
  );
  rerender({ text: 'Saved on this device · Connecting...' });
  expect(result.current.typed.get()).toBe(
    'Saved on this device · Connecting...',
  );
});
