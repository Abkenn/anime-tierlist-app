'use client';

import { cn } from 'cn';
import { useAtom } from 'jotai';
import { posterSizeAtom } from '@/app/_atoms/tierlist/settings.atoms';
import type { PosterSize, TierImageMode } from '@/app/_types/tierlist.types';

type TierBoardToolbarProps = {
  rankCount: number;
  itemCount: number;
  keyboardMode: boolean;
  settingsOpen: boolean;
  optionsId: string;
  imageMode: TierImageMode;
  onToggleOptions: () => void;
  onImageModeChange: (mode: TierImageMode) => void;
};

export const TierBoardToolbar = ({
  rankCount,
  itemCount,
  keyboardMode,
  settingsOpen,
  optionsId,
  imageMode,
  onToggleOptions,
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
            {keyboardMode
              ? 'Keyboard mode · ↑↓ / W S tier · ←→ / A D order · Esc exit'
              : 'Drag to rank · Tab to select · Enter after click'}
          </p>
        </div>

        <button
          type="button"
          className="min-h-11 underline underline-offset-4"
          aria-expanded={settingsOpen}
          aria-controls={optionsId}
          onClick={onToggleOptions}
        >
          {settingsOpen ? 'close options' : 'tier options'}
        </button>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-2 text-muted-foreground">
          Images
          <select
            name="imageMode"
            aria-label="Image sizing"
            value={imageMode === 'natural' ? 'natural' : 'cover'}
            className="min-h-9 border border-divider bg-background px-2 text-foreground"
            onChange={(event) =>
              onImageModeChange(
                event.currentTarget.value === 'natural' ? 'natural' : 'cover',
              )
            }
          >
            <option value="natural">Custom ratio</option>

            <option value="cover">Square cells</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-muted-foreground">
          Size
          <select
            name="posterSize"
            aria-label="Poster size"
            value={posterSize}
            onChange={(event) =>
              setPosterSize(event.target.value as PosterSize)
            }
            className="min-h-9 border border-divider bg-background px-2 text-foreground"
          >
            <option value="dynamic">Dynamic</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>

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
