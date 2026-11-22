'use client';

import { useAtom } from 'jotai';
import { LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { lockFeedbackAtom, positionsLockedAtom } from '@/app/_atoms/tierlist/interaction.atoms';
import { posterSizeAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { SegmentedControl } from '@/app/_components/ui/segmented-control';
import type { PosterSize, TierImageMode } from '@/app/_types/tierlist.types';

type TierBoardToolbarProps = {
  rankCount: number;
  itemCount: number;
  restoring?: boolean;
  keyboardMode: boolean;
  imageMode: TierImageMode;
  onImageModeChange: (mode: TierImageMode) => void;
};

export const TierBoardToolbar = ({
  rankCount,
  itemCount,
  restoring = false,
  keyboardMode,
  imageMode,
  onImageModeChange,
}: TierBoardToolbarProps) => {
  const [posterSize, setPosterSize] = useAtom(posterSizeAtom);
  const [locked, setLocked] = useAtom(positionsLockedAtom);
  const [feedback] = useAtom(lockFeedbackAtom);
  const lockRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const interactionHint = locked
    ? 'Positions locked · Unlock to arrange'
    : 'Keyboard · Arrows/WASD · Esc exit';

  useEffect(() => {
    if (
      !feedback ||
      !locked ||
      reducedMotion ||
      !matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      return;
    }

    const element = lockRef.current;
    if (!element) {
      return;
    }
    const animation = animate(element, { x: [0, -3, 3, -2, 0] }, { duration: 0.22 });

    return () => {
      animation.stop();
    };
  }, [feedback, locked, reducedMotion]);

  return (
    <>
      <div className="mb-1 flex items-center justify-between gap-4 text-xs">
        <div className="text-muted-foreground">
          <p>{restoring ? 'Restoring tierlist...' : `${rankCount} tiers · ${itemCount} items`}</p>

          <p role="status" className="mt-1 text-xs">
            {locked || keyboardMode ? (
              interactionHint
            ) : (
              <>
                <span className="hidden pointer-fine:inline">
                  Drag to arrange · Right-click to edit
                </span>

                <span className="pointer-fine:hidden">Drag to arrange · Tap ⋯ to edit</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <SegmentedControl
          name="imageMode"
          label="Image sizing"
          value={imageMode === 'natural' ? 'natural' : 'cover'}
          onChange={onImageModeChange}
          options={[
            { value: 'natural', label: 'Custom ratio', shortLabel: 'Custom' },
            { value: 'cover', label: 'Square cells', shortLabel: 'Square' },
          ]}
        />

        <SegmentedControl<PosterSize>
          name="posterSize"
          label="Poster size"
          value={posterSize}
          onChange={setPosterSize}
          options={[
            { value: 'dynamic', label: 'Auto' },
            { value: 'small', label: 'Small', shortLabel: 'S' },
            { value: 'medium', label: 'Medium', shortLabel: 'M' },
            { value: 'large', label: 'Large', shortLabel: 'L' },
          ]}
        />

        <AnimatePresence initial={false}>
          {imageMode !== 'natural' && (
            <motion.div
              key="square-fit"
              className="flex"
              initial={reducedMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -4 }}
              transition={{
                duration: reducedMotion ? 0 : 0.18,
                ease: 'easeOut',
              }}
            >
              <SegmentedControl
                name="squareFit"
                label="Square image fit"
                value={imageMode}
                onChange={onImageModeChange}
                options={[
                  { value: 'cover', label: 'Fill' },
                  { value: 'contain', label: 'Fit' },
                ]}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          ref={lockRef}
          type="button"
          aria-label="Lock positions"
          aria-pressed={locked}
          title={locked ? 'Unlock to arrange anime and tiers' : 'Lock positions for scrolling'}
          onClick={() => setLocked((current) => !current)}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 border border-border px-2 text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          {locked ? (
            <LockKeyhole aria-hidden="true" className="size-3.5" />
          ) : (
            <LockKeyholeOpen aria-hidden="true" className="size-3.5" />
          )}
          {locked ? 'Locked' : 'Unlocked'}
        </button>
      </div>
    </>
  );
};
