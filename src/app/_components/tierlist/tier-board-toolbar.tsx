import type { TierImageMode } from '@/app/_types/tierlist.types';

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
}: TierBoardToolbarProps) => (
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
    <label className="mb-2 flex w-fit items-center gap-2 text-xs text-muted-foreground">
      Images
      <select
        aria-label="Image sizing"
        value={imageMode}
        className="min-h-9 border border-divider bg-background px-2 text-foreground"
        onChange={(event) =>
          onImageModeChange(event.currentTarget.value as TierImageMode)
        }
      >
        <option value="contain">Fit squares</option>
        <option value="cover">Fill squares</option>
        <option value="natural">Original ratio</option>
      </select>
    </label>
  </>
);
