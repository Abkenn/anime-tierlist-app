'use client';

import { ChevronDown } from 'lucide-react';
import { lazy, Suspense, useEffect, useEffectEvent, useState } from 'react';
import {
  keyboardBehaviors,
  matchesKeyboardBehavior,
} from '@/app/_lib/keybindings';
import type { UserSeedProps } from './user-seed-panel';

const UserSeedPanel = lazy(async () => ({
  default: (await import('./user-seed-panel')).UserSeedPanel,
}));

export const UserSeed = (props: UserSeedProps) => {
  const [activated, setActivated] = useState(props.open);

  if (props.open && !activated) {
    setActivated(true);
  }

  const activate = () => {
    setActivated(true);
    props.onOpenChange(true);
  };
  const shortcut = useEffectEvent((event: KeyboardEvent) => {
    if (!props.busy && matchesKeyboardBehavior(event, keyboardBehaviors.save)) {
      event.preventDefault();
      activate();
    }
  });
  const trigger = (
    <button
      type="button"
      disabled={props.busy}
      aria-haspopup="dialog"
      aria-expanded={props.open}
      onClick={activate}
      className="inline-flex min-h-9 justify-self-start items-center gap-1 cursor-pointer text-xs font-medium text-foreground underline decoration-current/70 underline-offset-4 transition-[color,text-decoration-color,opacity] hover:decoration-current active:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50"
    >
      Save &amp; import
      <ChevronDown aria-hidden="true" className="size-3" />
    </button>
  );

  useEffect(() => {
    if (activated) {
      return;
    }
    window.addEventListener('keydown', shortcut);

    return () => window.removeEventListener('keydown', shortcut);
  }, [activated]);

  return activated ? (
    <Suspense fallback={trigger}>
      <UserSeedPanel {...props} />
    </Suspense>
  ) : (
    trigger
  );
};
