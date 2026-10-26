'use client';

import { cn } from 'cn';
import { useAtom } from 'jotai';
import { posterSizeAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { SegmentedControl } from '@/app/_components/ui/segmented-control';
import type { PosterSize, TierImageMode } from '@/app/_types/tierlist.types';

type TierBoardToolbarProps = {
  rankCount: number;
  itemCount: number;
  keyboardMode: boolean;
  imageMode: TierImageMode;
  onImageModeChange: (mode: TierImageMode) => void;
};

export const TierBoardToolbar = ({
  rankCount,
  itemCount,
  keyboardMode,
  imageMode,
  onImageModeChange,
}: TierBoardToolbarProps) => {
  const [posterSize, setPosterSize] = useAtom(posterSizeAtom);

  return (
    <>
      <div className="mb-1 flex items-center justify-between gap-4 text-xs">
        <div className="text-muted-foreground">
          <p>
            {rankCount} tiers · {itemCount} items
          </p>

          <p role="status" className="mt-1 text-xs">
            {keyboardMode ? (
              'Keyboard mode · ↑↓ / W S tier · ←→ / A D order · Esc exit'
            ) : (
              <>
                <span className="hidden pointer-fine:inline">
                  Drag to arrange · Right-click to edit
                </span>

                <span className="pointer-fine:hidden">
                  Drag to arrange · Tap ⋯ to edit
                </span>
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

        {imageMode !== 'natural' && (
          <fieldset
            aria-label="Square image fit"
            className="flex border border-divider"
          >
            {(['cover', 'contain'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={imageMode === mode}
                className={cn(
                  'min-h-9 min-w-11 cursor-pointer px-2 underline-offset-4 transition-colors hover:text-foreground active:opacity-60',
                  imageMode === mode
                    ? 'bg-muted text-foreground underline'
                    : 'text-muted-foreground',
                )}
                onClick={() => onImageModeChange(mode)}
              >
                {mode === 'cover' ? 'Fill' : 'Fit'}
              </button>
            ))}
          </fieldset>
        )}
      </div>
    </>
  );
};
