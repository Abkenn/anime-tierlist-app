'use client';

import { Popover } from '@base-ui/react/popover';
import { useAtomValue, useSetAtom } from 'jotai';
import { type ReactElement, useRef, useState } from 'react';
import { positionsLockedAtom } from '@/app/_atoms/tierlist/interaction.atoms';
import { addRankAtom, moveRankAtom } from '@/app/_atoms/tierlist/ranks.atoms';
import { enabledTierRanksAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { ColorPicker } from '@/app/_components/ui/color-picker';
import type { HexColor, TierRank } from '@/app/_types/tierlist.types';

type TierRankOptionsProps = {
  trigger: ReactElement;
  rank: TierRank;
  label: string;
  color: HexColor;
  onColorOpen: () => void;
  onColorChange: (color: HexColor) => void;
  onRename: () => void;
  onDelete: () => void;
};

export const TierRankOptions = ({
  trigger,
  rank,
  label,
  color,
  onColorOpen,
  onColorChange,
  onRename,
  onDelete,
}: TierRankOptionsProps) => {
  const [open, setOpen] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const ranks = useAtomValue(enabledTierRanksAtom);
  const locked = useAtomValue(positionsLockedAtom);
  const add = useSetAtom(addRankAtom);
  const move = useSetAtom(moveRankAtom);
  const index = ranks.indexOf(rank);
  const buttonClass =
    'flex min-h-11 w-full cursor-pointer items-center px-3 text-left text-sm hover:bg-muted focus-visible:outline-2 disabled:cursor-default disabled:opacity-50';

  const run = (action: () => void) => {
    pending.current = action;
    setActionPending(true);
    setOpen(false);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setActionPending(false);
        }
        setOpen(next);
      }}
      onOpenChangeComplete={(next) => {
        if (!next && pending.current) {
          const action = pending.current;
          pending.current = null;
          action();
        }
      }}
    >
      <Popover.Trigger render={trigger} />

      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="z-50"
        >
          <Popover.Popup
            finalFocus={actionPending ? false : undefined}
            aria-label={`Options for ${label}`}
            className="w-56 max-w-[calc(100vw-1rem)] border border-divider bg-popover p-1 text-popover-foreground shadow-md"
          >
            <Popover.Title className="px-3 py-2 text-xs text-muted-foreground">
              {label}
            </Popover.Title>

            <button type="button" className={buttonClass} onClick={() => run(onRename)}>
              Rename tier
            </button>

            <ColorPicker
              inline
              label={`Color for ${label}`}
              color={color}
              onOpen={onColorOpen}
              onChange={onColorChange}
            />

            <button type="button" className={buttonClass} onClick={() => run(() => add(rank))}>
              Add tier above
            </button>

            <button
              type="button"
              className={buttonClass}
              onClick={() => run(() => add(ranks[index + 1]))}
            >
              Add tier below
            </button>

            <button
              type="button"
              className={buttonClass}
              disabled={locked || index <= 0}
              onClick={() => run(() => move({ rank, target: ranks[index - 1] }))}
            >
              Move tier up
            </button>

            <button
              type="button"
              className={buttonClass}
              disabled={locked || index >= ranks.length - 1}
              onClick={() => run(() => move({ rank, target: ranks[index + 1] }))}
            >
              Move tier down
            </button>

            <button
              type="button"
              className={buttonClass}
              disabled={ranks.length <= 1}
              onClick={() => run(onDelete)}
            >
              Delete tier
            </button>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
