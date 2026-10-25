'use client';

import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Input } from '@base-ui/react/input';
import { cn } from 'cn';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { motion } from 'motion/react';
import { useState } from 'react';
import { addRankAtom, removeRankAtom } from '@/app/_atoms/tierlist/ranks.atoms';
import {
  enabledTierRanksAtom,
  rankDetailsAtom,
} from '@/app/_atoms/tierlist/settings.atoms';
import { tierColorClasses } from '@/app/_lib/tier-colors';
import type {
  HexColor,
  TierColor,
  TierRank,
} from '@/app/_types/tierlist.types';

export const TierRankLabel = ({
  rank,
  color,
}: {
  rank: TierRank;
  color: TierColor;
}) => {
  const [details, setDetails] = useAtom(rankDetailsAtom);
  const ranks = useAtomValue(enabledTierRanksAtom);
  const add = useSetAtom(addRankAtom);
  const remove = useSetAtom(removeRankAtom);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirming, setConfirming] = useState(false);
  const label = details[rank]?.label ?? rank;
  const commit = () => {
    setEditing(false);
    if (!draft.trim()) {
      setConfirming(true);
    } else {
      setDetails({
        ...details,
        [rank]: { ...details[rank], label: draft.trim() },
      });
    }
  };

  return (
    <motion.div
      animate={
        details[rank]?.color
          ? { backgroundColor: details[rank].color }
          : undefined
      }
      className={cn(
        'group relative flex aspect-square self-start items-center justify-center border-r border-ink p-2 text-graphite',
        tierColorClasses[color],
      )}
    >
      <button
        type="button"
        aria-label={`Add tier above ${label}`}
        onClick={() => add(rank)}
        className="absolute top-0 left-0 z-20 h-5 w-full cursor-pointer text-xs opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-40"
      >
        +
      </button>

      {editing ? (
        <Input
          autoFocus
          aria-label="Tier name"
          value={draft}
          maxLength={100}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
            if (event.key === 'Escape') {
              setEditing(false);
            }
          }}
          className="w-full border-b border-current bg-transparent text-center text-xs outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(label);
            setEditing(true);
          }}
          className="w-full cursor-text wrap-break-word px-1 py-3 text-center text-xs hover:underline"
          aria-label={`Rename ${label}`}
        >
          {label}
        </button>
      )}

      <input
        type="color"
        aria-label={`Color for ${label}`}
        value={details[rank]?.color ?? '#e68e8e'}
        onChange={(event) =>
          setDetails({
            ...details,
            [rank]: { label, color: event.target.value as HexColor },
          })
        }
        className="absolute bottom-1 right-1 size-4 cursor-pointer border-0 bg-transparent p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-60"
      />

      {rank === ranks.at(-1) && (
        <button
          type="button"
          aria-label="Add tier below"
          onClick={() => add()}
          className="absolute bottom-0 left-0 h-5 w-1/2 cursor-pointer text-xs opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-40"
        >
          +
        </button>
      )}

      <AlertDialog.Root open={confirming} onOpenChange={setConfirming}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-background/50" />

          <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-80 -translate-1/2 border border-divider bg-popover p-4 text-sm text-popover-foreground shadow-md">
            <AlertDialog.Title>Delete {label}?</AlertDialog.Title>

            <AlertDialog.Description className="my-3 text-xs text-muted-foreground">
              {ranks.length === 1
                ? 'Keep at least one tier.'
                : 'Its posters move to the adjacent tier.'}
            </AlertDialog.Description>

            <div className="flex gap-5">
              <button
                type="button"
                disabled={ranks.length === 1}
                onClick={() => {
                  remove(rank);
                  setConfirming(false);
                }}
                className="cursor-pointer underline disabled:opacity-40"
              >
                Delete tier
              </button>

              <AlertDialog.Close className="cursor-pointer underline">
                Cancel
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </motion.div>
  );
};
