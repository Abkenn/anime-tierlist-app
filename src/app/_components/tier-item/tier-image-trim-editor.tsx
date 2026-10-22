'use client';

import { Popover } from '@base-ui/react/popover';
import { type RefObject, useId } from 'react';
import { useTierImageTrim } from '@/app/_hooks/use-tier-image-trim';
import { keyboardBehaviors } from '@/app/_lib/keybindings';
import { fullImageTrim, type TierTrimEdge } from '@/app/_lib/tier-image-trim';
import type { TierImage, TierImageTrim } from '@/app/_types/tierlist.types';

const edges: TierTrimEdge[] = ['left', 'top', 'right', 'bottom'];
const actionClassName =
  'min-h-11 cursor-pointer px-2 text-muted-foreground underline decoration-transparent underline-offset-4 transition-colors hover:text-foreground hover:decoration-current active:decoration-2 active:opacity-60 focus-visible:outline-1 focus-visible:outline-foreground motion-reduce:transition-none';

type TierImageTrimEditorProps = {
  anchor: RefObject<HTMLElement | null>;
  image: TierImage;
  trim: TierImageTrim;
  onSave: (trim: TierImageTrim) => void;
  onCancel: () => void;
};

export const TierImageTrimEditor = ({
  anchor,
  image,
  trim,
  onSave,
  onCancel,
}: TierImageTrimEditorProps) => {
  const maskId = useId();
  const editor = useTierImageTrim({ trim });
  const { draft } = editor;
  const width = Math.min(400, (280 * image.width) / image.height);
  const height = (width * image.height) / image.width;

  return (
    <Popover.Root
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <Popover.Portal>
        <Popover.Positioner
          anchor={anchor}
          side="bottom"
          align="start"
          sideOffset={() =>
            Number.parseFloat(
              getComputedStyle(document.documentElement).fontSize,
            ) * 0.5
          }
          collisionPadding={16}
          positionMethod="fixed"
          className="z-50"
        >
          <Popover.Popup
            finalFocus={anchor}
            aria-label="Edit custom ratio crop"
            className="pointer-events-auto max-w-[calc(100vw-2rem)] border border-divider bg-background p-3 text-xs text-foreground shadow-sm"
            onKeyDown={(event) => {
              if (event.code === 'Escape') {
                event.preventDefault();
                onCancel();
              }

              if (
                event.code === 'Enter' &&
                (event.target as Element).getAttribute('role') === 'slider'
              ) {
                event.preventDefault();
                onSave(draft);
              }
            }}
          >
            <p className="mb-3">Drag edges · Enter saves · Esc cancels</p>

            <fieldset aria-label="Image crop edges">
              <svg
                viewBox={`0 0 ${image.width} ${image.height}`}
                width={width}
                height={height}
                preserveAspectRatio="none"
                className="mx-auto block max-h-[60dvh] size-auto max-w-full touch-none overflow-visible"
              >
                <title>Drag each border to trim the image</title>

                <svg
                  viewBox="0 0 1 1"
                  width={image.width}
                  height={image.height}
                  preserveAspectRatio="none"
                >
                  <title>Crop selection and edge handles</title>

                  <defs>
                    <mask id={maskId}>
                      <rect width="1" height="1" fill="white" />

                      <rect
                        x={draft.left}
                        y={draft.top}
                        width={draft.right - draft.left}
                        height={draft.bottom - draft.top}
                        fill="black"
                      />
                    </mask>
                  </defs>

                  <image
                    href={image.src}
                    width="1"
                    height="1"
                    preserveAspectRatio="none"
                  />

                  <rect
                    width="1"
                    height="1"
                    mask={`url(#${maskId})`}
                    className="fill-black/65"
                  />

                  <rect
                    x={draft.left}
                    y={draft.top}
                    width={draft.right - draft.left}
                    height={draft.bottom - draft.top}
                    fill="none"
                    className="stroke-white"
                    strokeWidth="0.005"
                  />

                  {edges.map((edge) => {
                    const horizontal = edge === 'left' || edge === 'right';
                    const x = horizontal ? draft[edge] - 0.018 : draft.left;
                    const y = horizontal ? draft.top : draft[edge] - 0.018;

                    return (
                      <rect
                        key={edge}
                        x={x}
                        y={y}
                        width={horizontal ? 0.036 : draft.right - draft.left}
                        height={horizontal ? draft.bottom - draft.top : 0.036}
                        role="slider"
                        tabIndex={0}
                        aria-label={`${edge} crop edge`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(draft[edge] * 100)}
                        aria-orientation={
                          horizontal ? 'horizontal' : 'vertical'
                        }
                        className="cursor-crosshair fill-transparent outline-none focus-visible:fill-white/15"
                        onPointerDown={(event) => editor.start(event, edge)}
                        onPointerMove={editor.move}
                        onPointerUp={editor.end}
                        onPointerCancel={editor.cancel}
                        onLostPointerCapture={editor.cancel}
                        onKeyDown={(event) => {
                          const negative = horizontal
                            ? keyboardBehaviors.left.codes
                            : keyboardBehaviors.up.codes;
                          const positive = horizontal
                            ? keyboardBehaviors.right.codes
                            : keyboardBehaviors.down.codes;
                          const direction =
                            Number(
                              positive.some((code) => code === event.code),
                            ) -
                            Number(
                              negative.some((code) => code === event.code),
                            );

                          if (direction) {
                            event.preventDefault();
                            editor.nudge(
                              edge,
                              direction * (event.shiftKey ? 0.1 : 0.01),
                            );
                          }
                        }}
                      />
                    );
                  })}
                </svg>
              </svg>
            </fieldset>

            <div className="mt-2 flex justify-center gap-2">
              <button
                type="button"
                className={actionClassName}
                onClick={() => onSave(draft)}
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
                className={actionClassName}
                onClick={() => editor.setDraft(fullImageTrim)}
              >
                Reset
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
