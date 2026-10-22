'use client';

import { Popover } from '@base-ui/react/popover';
import { cn } from 'cn';
import { type RefObject, useMemo } from 'react';
import type { TierCrop, TierImage } from '@/app/_types/tierlist.types';

const actionClassName =
  'min-h-11 cursor-pointer text-muted-foreground underline decoration-transparent underline-offset-4 transition-colors duration-150 hover:text-foreground hover:decoration-current active:decoration-2 active:opacity-60 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none';

type TierCropControlsProps = {
  anchor: RefObject<HTMLElement | null>;
  image?: TierImage;
  crop?: TierCrop;
  label: string;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
};

export const TierCropControls = ({
  anchor,
  image,
  crop,
  label,
  onSave,
  onCancel,
  onReset,
}: TierCropControlsProps) => {
  const centered = (crop?.x ?? 0.5) === 0.5 && (crop?.y ?? 0.5) === 0.5;

  const imageAnchor = useMemo(
    () => ({
      contextElement: anchor.current ?? undefined,
      getBoundingClientRect: () => {
        const bounds = anchor.current?.getBoundingClientRect() ?? new DOMRect();
        const ratio =
          image && image.width > 0 && image.height > 0
            ? image.width / image.height
            : 1;
        const width = bounds.width * Math.max(1, ratio);
        const height = bounds.height * Math.max(1, 1 / ratio);

        return new DOMRect(
          bounds.x - (width - bounds.width) * (crop?.x ?? 0.5),
          bounds.y - (height - bounds.height) * (crop?.y ?? 0.5),
          width,
          height,
        );
      },
    }),
    [anchor, image, crop],
  );

  return (
    <Popover.Root open modal={false}>
      <Popover.Portal>
        <Popover.Positioner
          anchor={imageAnchor}
          side="bottom"
          align="start"
          positionMethod="fixed"
          sideOffset={() =>
            Number.parseFloat(
              getComputedStyle(document.documentElement).fontSize,
            ) * 0.5
          }
          className="z-50"
        >
          <Popover.Popup
            initialFocus={false}
            finalFocus={false}
            aria-label={`Edit crop for item ${label}`}
          >
            <fieldset
              className="pointer-events-auto w-max max-w-[calc(100vw-2rem)] border border-divider bg-background px-3 py-2 text-xs text-foreground shadow-sm"
              aria-label={`Crop controls for item ${label}`}
              onKeyDown={(event) => {
                if (event.code === 'Escape') {
                  event.preventDefault();
                  onCancel();
                }
              }}
            >
              <p>Drag image · Enter saves · Esc cancels</p>

              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  className={cn(
                    actionClassName,
                    'text-foreground decoration-foreground/60',
                  )}
                  onClick={onSave}
                >
                  Done
                </button>

                <button
                  type="button"
                  className={actionClassName}
                  onClick={onCancel}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={cn(
                    actionClassName,
                    'disabled:pointer-events-none disabled:opacity-40',
                  )}
                  disabled={centered}
                  onClick={onReset}
                >
                  Center
                </button>
              </div>
            </fieldset>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
