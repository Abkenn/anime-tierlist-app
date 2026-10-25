'use client';

import { useAtom, useAtomValue } from 'jotai';
import { X } from 'lucide-react';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import {
  renamingItemIdAtom,
  tierFindQueryAtom,
} from '@/app/_atoms/tierlist/find.atoms';
import { editingItemIdAtom } from '@/app/_atoms/tierlist/interaction.atoms';
import { tierItemsAtom } from '@/app/_atoms/tierlist/items.atoms';
import {
  keyboardBehaviors,
  matchesKeyboardBehavior,
} from '@/app/_lib/keybindings';
import { matchesTierItemLabel } from '@/app/_lib/tier-item-label';

export const TierBoardFind = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useAtom(tierFindQueryAtom);
  const deferredQuery = useDeferredValue(query);
  const items = useAtomValue(tierItemsAtom);
  const editing = useAtomValue(editingItemIdAtom);
  const renaming = useAtomValue(renamingItemIdAtom);
  const input = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const count = items.filter((item) =>
    matchesTierItemLabel(item, deferredQuery),
  ).length;

  const close = () => {
    setOpen(false);
    setQuery('');
    previousFocus.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    const handleFind = (event: KeyboardEvent) => {
      if (
        matchesKeyboardBehavior(event, keyboardBehaviors.find) &&
        !editing &&
        !renaming
      ) {
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
      }
    };
    window.addEventListener('keydown', handleFind);

    return () => window.removeEventListener('keydown', handleFind);
  }, [open, editing, renaming]);

  useEffect(() => {
    if (open) {
      input.current?.focus();
    }
  }, [open]);

  return open ? (
    <search
      aria-label="Find in tierlist"
      className="fixed right-4 top-12 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 border border-divider bg-background/95 px-3 py-2 text-sm shadow-sm"
      onKeyDown={(event) => {
        if (event.code === 'Escape') {
          event.stopPropagation();
          close();
        }
      }}
    >
      <input
        ref={input}
        aria-label="Find anime in tierlist"
        placeholder="Find in tierlist…"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
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
