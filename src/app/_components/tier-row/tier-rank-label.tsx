'use client';

import { Input } from '@base-ui/react/input';
import { cn } from 'cn';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Ellipsis, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import dynamic from 'next/dynamic';
import { lazy, Suspense, useRef, useState } from 'react';
import { addRankAtom, removeRankAtom } from '@/app/_atoms/tierlist/ranks.atoms';
import { enabledTierRanksAtom, rankDetailsAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { ColorPicker } from '@/app/_components/ui/color-picker';
import { useTierLabelLayout } from '@/app/_hooks/use-tier-label-layout';
import { rankTextColor } from '@/app/_lib/rank-text-color';
import { tierColorClasses, tierColors } from '@/app/_lib/tier-colors';
import type { HexColor, TierRank } from '@/app/_types/tierlist.types';
import { TierRankMove } from './tier-rank-move';

const TierRankDeleteDialog = dynamic(() =>
  import('./tier-rank-delete-dialog').then((module) => module.TierRankDeleteDialog),
);

const TierRankOptions = lazy(async () => ({
  default: (await import('./tier-rank-options')).TierRankOptions,
}));

export const TierRankLabel = ({ rank }: { rank: TierRank }) => {
  const [details, setDetails] = useAtom(rankDetailsAtom);
  const ranks = useAtomValue(enabledTierRanksAtom);
  const add = useSetAtom(addRankAtom);
  const remove = useSetAtom(removeRankAtom);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [presetColor, setPresetColor] = useState<HexColor>('#aaaaaa');
  const [optionsActivated, setOptionsActivated] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);
  const label = details[rank]?.label ?? rank;
  const textLayout = useTierLabelLayout({ ref: labelRef, label, editing });
  const color = tierColors[rank] ?? 'stone';
  const addRankButtonClass =
    'absolute left-1/2 z-20 flex size-6 -translate-x-1/2 cursor-pointer items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:hidden';
  const labelLines = textLayout.lines.map((line, index) => (
    <span key={textLayout.lines.slice(0, index + 1).join(' ')} className="block whitespace-nowrap">
      {line}
    </span>
  ));
  const optionsTrigger = (
    <button
      type="button"
      aria-label={`Edit ${label} tier`}
      aria-haspopup="dialog"
      onClick={() => setOptionsActivated(true)}
      className="absolute right-0 top-0 z-30 hidden size-11 cursor-pointer items-center justify-center focus-visible:outline-2 pointer-coarse:flex"
    >
      <Ellipsis aria-hidden="true" className="size-4" />
    </button>
  );

  const beginRename = () => {
    setDraft(label);
    setEditing(true);
  };

  const readPresetColor = () => {
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
  };
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
        'group relative flex min-h-(--tier-size,5rem) self-stretch items-center justify-center border-r border-ink p-2 text-graphite pointer-coarse:min-h-[max(6rem,var(--tier-size,5rem))]',
        label.length > 4 && 'min-h-[max(6rem,var(--tier-size,5rem))]',
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
        className="absolute top-0 right-0 z-30 flex size-6 cursor-pointer items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:hidden"
      >
        <Trash2
          aria-hidden="true"
          className="size-[clamp(0.625rem,calc(var(--tier-size)*0.1),0.875rem)]"
        />
      </button>

      <TierRankMove rank={rank} label={label} />

      <div
        data-tier-label=""
        style={{ fontSize: textLayout.fontSize }}
        className="min-w-0 w-full p-1 text-center leading-tight"
      >
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
            className="min-w-0 w-full border-b border-current bg-transparent text-center text-sm outline-none pointer-coarse:min-h-11"
          />
        ) : (
          <>
            <button
              type="button"
              onClick={beginRename}
              className="hidden min-h-6 min-w-0 w-full cursor-text text-center hover:underline pointer-fine:block"
              aria-label={`Rename ${label}`}
            >
              {labelLines}
            </button>

            <span className="block pointer-fine:hidden">{labelLines}</span>
          </>
        )}
      </div>

      <div className="contents pointer-coarse:hidden">
        <ColorPicker
          label={`Color for ${label}`}
          color={details[rank]?.color ?? presetColor}
          onOpen={readPresetColor}
          onChange={(next) => setDetails({ ...details, [rank]: { label, color: next } })}
        />
      </div>

      {optionsActivated ? (
        <Suspense fallback={optionsTrigger}>
          <TierRankOptions
            trigger={optionsTrigger}
            rank={rank}
            label={label}
            color={details[rank]?.color ?? presetColor}
            onColorOpen={readPresetColor}
            onColorChange={(next) => setDetails({ ...details, [rank]: { label, color: next } })}
            onRename={beginRename}
            onDelete={() => setConfirming(true)}
          />
        </Suspense>
      ) : (
        optionsTrigger
      )}

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

      {confirming && (
        <TierRankDeleteDialog
          label={label}
          rankCount={ranks.length}
          onOpenChange={setConfirming}
          onDelete={() => {
            remove(rank);
            setConfirming(false);
          }}
        />
      )}
    </motion.div>
  );
};
