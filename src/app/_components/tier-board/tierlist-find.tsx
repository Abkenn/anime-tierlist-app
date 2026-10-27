'use client';

import { X } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  keyboardBehaviors,
  matchesKeyboardBehavior,
} from '@/app/_lib/keybindings';

type TierlistFindProps = {
  query: string;
  onQueryChange: (query: string) => void;
  count: number;
  disabled?: boolean;
};

export const TierlistFind = ({
  query,
  onQueryChange,
  count,
  disabled = false,
}: TierlistFindProps) => {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const handleFind = useEffectEvent((event: KeyboardEvent) => {
    if (
      disabled ||
      event.defaultPrevented ||
      !matchesKeyboardBehavior(event, keyboardBehaviors.find)
    ) {
      return;
    }
    event.preventDefault();
    if (!open) {
      previousFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    }
    setOpen(true);
    input.current?.focus();
    input.current?.select();
  });
  const close = () => {
    setOpen(false);
    onQueryChange('');
    previousFocus.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    window.addEventListener('keydown', handleFind);

    return () => window.removeEventListener('keydown', handleFind);
  }, []);

  useEffect(() => {
    if (open) {
      input.current?.focus();
    }
  }, [open]);

  return open && !disabled ? (
    <search
      aria-label="Find in tierlist"
      className="fixed right-4 top-12 z-80 flex max-w-[calc(100vw-2rem)] items-center gap-3 border border-divider bg-background/95 px-3 py-2 text-sm shadow-sm"
      onKeyDown={(event) => {
        if (event.code === 'Escape') {
          event.stopPropagation();
          close();
        }
      }}
    >
      <input
        ref={input}
        name="tierlist-find"
        aria-label="Find anime in tierlist"
        placeholder="Find in tierlist…"
        value={query}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        className="min-w-0 w-48 bg-transparent outline-none"
      />

      <span
        role="status"
        className="whitespace-nowrap text-xs text-muted-foreground"
      >
        {query.trim() ? `${count} found` : ''}
      </span>

      <button
        type="button"
        aria-label="Close find"
        onClick={close}
        className="cursor-pointer p-1 hover:opacity-60"
      >
        <X className="size-4" />
      </button>
    </search>
  ) : null;
};
