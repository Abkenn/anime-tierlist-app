'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { TerminalText } from './terminal-text';

const dots = ['.', '..', '...', '..'];
export const TerminalPending = ({ text }: { text: string }) => {
  const [step, setStep] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    const timer = window.setInterval(
      () => setStep((value) => (value + 1) % dots.length),
      650,
    );

    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  return (
    <TerminalText
      text={`${text}${reducedMotion ? '...' : dots[step]}`}
      pending
      replaceTail
    />
  );
};
