'use client';

import { useLinkStatus } from 'next/link';

export const NavigationStatus = () => {
  const { pending } = useLinkStatus();
  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="ml-3 inline-flex min-w-20 items-center text-xs text-muted-foreground"
    >
      {pending && <span>loading…</span>}
    </span>
  );
};
