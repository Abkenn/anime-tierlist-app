'use client';

import { createContext, type PropsWithChildren, useState } from 'react';

type TerminalSequenceProps = PropsWithChildren<{
  lines: readonly string[];
  identity?: string;
}>;
type SequenceClock = {
  identity?: string;
  lines: readonly string[];
  startedAt?: number;
};

export const TerminalSequenceContext = createContext<SequenceClock | null>(
  null,
);

export const TerminalSequence = ({
  lines,
  identity,
  children,
}: TerminalSequenceProps) => {
  const [clock, setClock] = useState<SequenceClock>(() => ({
    lines,
    identity,
  }));

  if (clock.identity !== identity) {
    setClock({ lines, identity });
  }

  return (
    <TerminalSequenceContext value={clock}>{children}</TerminalSequenceContext>
  );
};
