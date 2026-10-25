'use client';

import { useEffect, useState } from 'react';

import { TerminalText } from './terminal-text';

type RetryCountdownProps = { retryAt: number; line?: number };

export const RetryCountdown = ({ retryAt, line }: RetryCountdownProps) => {
  const [seconds, setSeconds] = useState(() =>
    Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)),
  );

  useEffect(() => {
    const update = () =>
      setSeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));

    update();
    const timer = setInterval(update, 250);

    return () => clearInterval(timer);
  }, [retryAt]);

  return (
    <span role="timer" aria-live="off" className="tabular-nums">
      <TerminalText
        line={line}
        text={
          seconds > 0
            ? `Retrying in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}...`
            : 'Retrying...'
        }
        pending
        replaceTail
      />
    </span>
  );
};
