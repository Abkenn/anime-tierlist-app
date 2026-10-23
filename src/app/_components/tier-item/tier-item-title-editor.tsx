'use client';

import { Popover } from '@base-ui/react/popover';
import { type RefObject, useId, useRef, useState } from 'react';
import {
  limitTitleLines,
  normalizeTitleColor,
  titlePositions,
} from '@/app/_lib/tier-item-title';
import type { TierItemTitle } from '@/app/_types/tierlist.types';

const fieldClassName =
  'w-full border border-divider bg-background px-2 py-1.5 text-sm outline-none focus-visible:border-foreground';
const actionClassName =
  'min-h-10 cursor-pointer text-muted-foreground underline decoration-transparent underline-offset-4 hover:text-foreground hover:decoration-current active:opacity-60 disabled:cursor-default disabled:opacity-40';

type TierItemTitleEditorProps = {
  anchor: RefObject<HTMLElement | null>;
  title: TierItemTitle;
  existing: boolean;
  onChange: (title: TierItemTitle) => void;
  onSave: () => void;
  onCancel: () => void;
  onRemove: () => void;
};

export const TierItemTitleEditor = ({
  anchor,
  title,
  existing,
  onChange,
  onSave,
  onCancel,
  onRemove,
}: TierItemTitleEditorProps) => {
  const id = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [hex, setHex] = useState<string>(title.color);
  const validColor = normalizeTitleColor(hex);

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
          positionMethod="fixed"
          sideOffset={() =>
            Number.parseFloat(
              getComputedStyle(document.documentElement).fontSize,
            ) * 0.5
          }
          collisionPadding={16}
          className="z-50"
        >
          <Popover.Popup
            initialFocus={textRef}
            finalFocus={anchor}
            aria-label="Item text"
            className="pointer-events-auto w-72 max-h-(--available-height) max-w-[calc(100vw-2rem)] overflow-y-auto border border-divider bg-background p-3 text-xs text-foreground shadow-sm"
            onKeyDown={(event) => {
              if (event.code === 'Escape') {
                event.preventDefault();
                onCancel();
              }
            }}
          >
            <label htmlFor={`${id}-text`} className="mb-1 block">
              Title
            </label>

            <textarea
              ref={textRef}
              id={`${id}-text`}
              rows={4}
              value={title.text}
              placeholder="Add a title…"
              className={fieldClassName}
              onChange={(event) =>
                onChange({
                  ...title,
                  text: limitTitleLines(event.currentTarget.value),
                })
              }
            />

            <p className="mt-1 text-muted-foreground">Up to four lines.</p>

            <label className="mt-3 flex min-h-9 items-center gap-2">
              <input
                type="checkbox"
                checked={title.wrap}
                onChange={(event) =>
                  onChange({ ...title, wrap: event.currentTarget.checked })
                }
              />
              Wrap text
            </label>

            <label htmlFor={`${id}-position`} className="mt-2 mb-1 block">
              Position
            </label>

            <select
              id={`${id}-position`}
              value={title.position}
              className={fieldClassName}
              onChange={(event) =>
                onChange({
                  ...title,
                  position: event.currentTarget
                    .value as TierItemTitle['position'],
                })
              }
            >
              {titlePositions.map((position) => (
                <option key={position} value={position}>
                  {position[0].toUpperCase() + position.slice(1)}
                </option>
              ))}
            </select>

            <div className="mt-3 flex items-end gap-2">
              <label className="flex flex-col gap-1">
                Color
                <input
                  type="color"
                  aria-label="Title color"
                  value={title.color}
                  className="size-9 cursor-pointer border border-divider bg-transparent p-0.5"
                  onChange={(event) => {
                    setHex(event.currentTarget.value);
                    const color = normalizeTitleColor(
                      event.currentTarget.value,
                    );

                    if (color) {
                      onChange({ ...title, color });
                    }
                  }}
                />
              </label>

              <label htmlFor={`${id}-hex`} className="min-w-0 flex-1">
                Hex color
                <input
                  id={`${id}-hex`}
                  value={hex}
                  spellCheck={false}
                  aria-invalid={!validColor}
                  className={fieldClassName}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    const color = normalizeTitleColor(value);
                    setHex(value);

                    if (color) {
                      onChange({ ...title, color });
                    }
                  }}
                />
              </label>
            </div>

            {!validColor && (
              <p role="status" className="mt-1 text-muted-foreground">
                Use #RGB or #RRGGBB.
              </p>
            )}

            <div className="mt-2 flex items-center gap-4">
              <button
                type="button"
                className={actionClassName}
                disabled={!validColor}
                onClick={onSave}
              >
                Save
              </button>

              <button
                type="button"
                className={actionClassName}
                onClick={onCancel}
              >
                Cancel
              </button>

              {existing && (
                <button
                  type="button"
                  className={actionClassName}
                  onClick={onRemove}
                >
                  Remove text
                </button>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
