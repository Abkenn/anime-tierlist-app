import type { ReactElement, RefObject } from 'react';
import { ContextMenu } from '@/app/_components/ui/context-menu';
import { ContextMenuContent } from '@/app/_components/ui/context-menu-content';
import { ContextMenuItem } from '@/app/_components/ui/context-menu-item';
import { ContextMenuTrigger } from '@/app/_components/ui/context-menu-trigger';
import { Slider } from '@/app/_components/ui/slider';
import type { TierImageMode } from '@/app/_types/tierlist.types';

const expansionLabel = (value: number) => {
  if (value === 0) {
    return 'Original ratio';
  }

  if (value === 100) {
    return 'Full row height';
  }

  return `${value}%`;
};

type TierItemMenuProps = {
  trigger: ReactElement;
  finalFocus?: RefObject<HTMLElement | null>;
  mode: TierImageMode;
  hasImage: boolean;
  fullHeightByDefault?: boolean;
  editing: boolean;
  rowHeightExpansion: number;
  onOpen: () => void;
  onEdit: () => void;
  onReset: () => void;
  onRowHeightExpansion: (expansion: number) => void;
};

export const TierItemMenu = ({
  trigger,
  finalFocus,
  mode,
  hasImage,
  fullHeightByDefault = false,
  editing,
  rowHeightExpansion,
  onOpen,
  onEdit,
  onReset,
  onRowHeightExpansion,
}: TierItemMenuProps) => (
  <ContextMenu
    onOpenChange={(open) => {
      if (open) {
        onOpen();
      }
    }}
  >
    <ContextMenuTrigger
      render={trigger}
      aria-haspopup={mode === 'natural' ? 'dialog' : 'menu'}
    />

    <ContextMenuContent
      finalFocus={finalFocus}
      className={
        mode === 'natural'
          ? 'max-w-[calc(100vw-2rem)] overflow-visible'
          : undefined
      }
      positionerProps={
        mode === 'natural' && finalFocus
          ? {
              anchor: finalFocus,
              side: 'bottom',
              align: 'start',
              alignOffset: 0,
              sideOffset: () =>
                Number.parseFloat(
                  getComputedStyle(document.documentElement).fontSize,
                ) * 0.5,
            }
          : undefined
      }
      role={mode === 'natural' ? 'dialog' : 'menu'}
      aria-label={mode === 'natural' ? 'Image size' : undefined}
    >
      {mode === 'cover' && (
        <>
          <ContextMenuItem disabled={!hasImage || editing} onClick={onEdit}>
            Edit crop
          </ContextMenuItem>

          <ContextMenuItem disabled={!hasImage || editing} onClick={onReset}>
            Reset crop
          </ContextMenuItem>
        </>
      )}

      {mode === 'natural' && (
        <div className="w-60 max-w-full px-3">
          <Slider
            thumbProps={{
              getAriaLabel: () => 'Row height expansion',
              getAriaValueText: (_formatted, value) => expansionLabel(value),
            }}
            thumbLabel={expansionLabel}
            min={0}
            max={100}
            step={1}
            value={[
              fullHeightByDefault ? 100 : Math.round(rowHeightExpansion * 100),
            ]}
            disabled={!hasImage || fullHeightByDefault}
            onValueChange={(values) =>
              onRowHeightExpansion(
                (Array.isArray(values) ? values[0] : values) / 100,
              )
            }
            onKeyDown={(event) => {
              if (event.code !== 'Escape' && event.code !== 'Tab') {
                event.stopPropagation();
              }
            }}
          />
        </div>
      )}

      {mode === 'contain' && (
        <ContextMenuItem disabled>Image centered in square</ContextMenuItem>
      )}
    </ContextMenuContent>
  </ContextMenu>
);
