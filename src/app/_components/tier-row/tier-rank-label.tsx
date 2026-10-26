'use client';

import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Input } from '@base-ui/react/input';
import { cn } from 'cn';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Plus, SwatchBook, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { addRankAtom, removeRankAtom } from '@/app/_atoms/tierlist/ranks.atoms';
import {
  enabledTierRanksAtom,
  rankDetailsAtom,
} from '@/app/_atoms/tierlist/settings.atoms';
import { rankTextColor } from '@/app/_lib/rank-text-color';
import { tierColorClasses } from '@/app/_lib/tier-colors';
import type {
  HexColor,
  TierColor,
  TierRank,
} from '@/app/_types/tierlist.types';
import { TierRankMove } from './tier-rank-move';

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
  const [presetColor, setPresetColor] = useState<HexColor>('#aaaaaa');
  const labelRef = useRef<HTMLDivElement>(null);
  const label = details[rank]?.label ?? rank;
  const addRankButtonClass =
    'absolute left-1/2 z-20 flex size-6 -translate-x-1/2 cursor-pointer items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-60';

  useLayoutEffect(() => {
    if (!labelRef.current || !color) {
      return;
    }

    const channels = getComputedStyle(labelRef.current)
      .backgroundColor.match(/[\d.]+/g)
      ?.slice(0, 3);
    if (channels?.length === 3) {
      setPresetColor(
        `#${channels.map((channel) => Math.round(Number(channel)).toString(16).padStart(2, '0')).join('')}`,
      );
    }
  }, [color]);
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
      ref={labelRef}
      animate={
        details[rank]?.color
          ? {
              backgroundColor: details[rank].color,
              color: rankTextColor(details[rank].color),
            }
          : undefined
      }
      className={cn(
        'group relative flex aspect-square self-start items-center justify-center border-r border-ink p-2 text-graphite',
        tierColorClasses[color],
        label.length > 4
          ? 'text-[clamp(0.875rem,calc(var(--tier-size,6rem)*0.1),1.25rem)]'
          : 'text-[clamp(1rem,calc(var(--tier-size,6rem)*0.15),1.75rem)]',
      )}
    >
      <button
        type="button"
        aria-label={`Add tier above ${label}`}
        onClick={() => add(rank)}
        className={cn(addRankButtonClass, 'top-0')}
      >
        <Plus
          aria-hidden="true"
          className="size-[clamp(0.625rem,calc(var(--tier-size)*0.1),0.875rem)]"
        />
      </button>

      <button
        type="button"
        aria-label={`Delete ${label}`}
        onClick={() => setConfirming(true)}
        className="absolute top-0 right-0 z-30 flex size-6 cursor-pointer items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-60"
      >
        <Trash2
          aria-hidden="true"
          className="size-[clamp(0.625rem,calc(var(--tier-size)*0.1),0.875rem)]"
        />
      </button>

      <TierRankMove rank={rank} label={label} />

      {editing ? (
        <Input
          autoFocus
          aria-label="Tier name"
          name="tierName"
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
          className="w-full cursor-text wrap-break-word p-1 text-center hover:underline"
          aria-label={`Rename ${label}`}
        >
          {label}
        </button>
      )}

      <div className="absolute right-0 bottom-0 flex size-6 items-center justify-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-lg:opacity-60">
        <SwatchBook
          aria-hidden="true"
          className="size-[clamp(0.625rem,calc(var(--tier-size)*0.1),0.875rem)]"
        />
        <input
          type="color"
          name="tierColor"
          aria-label={`Color for ${label}`}
          value={details[rank]?.color ?? presetColor}
          onChange={(event) =>
            setDetails({
              ...details,
              [rank]: { label, color: event.target.value as HexColor },
            })
          }
          className="absolute inset-0 size-full cursor-pointer border-0 bg-transparent p-0 opacity-0"
        />
      </div>

      {rank === ranks.at(-1) && (
        <button
          type="button"
          aria-label="Add tier below"
          onClick={() => add()}
          className={cn(addRankButtonClass, 'bottom-0')}
        >
          <Plus
            aria-hidden="true"
            className="size-[clamp(0.625rem,calc(var(--tier-size)*0.1),0.875rem)]"
          />
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
