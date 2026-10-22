'use client';

import { Popover } from '@base-ui/react/popover';
import { cn } from 'cn';
import { type HTMLAttributes, type RefObject, useId, useState } from 'react';
import { useTierImageTrim } from '@/app/_hooks/use-tier-image-trim';
import { keyboardBehaviors } from '@/app/_lib/keybindings';
import { fullImageTrim, type TierTrimEdge } from '@/app/_lib/tier-image-trim';
import type { TierImage, TierImageTrim } from '@/app/_types/tierlist.types';

const edges: TierTrimEdge[] = ['left', 'top', 'right', 'bottom'];
const corners = [
  { name: 'top left', x: 'left', y: 'top' },
  { name: 'top right', x: 'right', y: 'top' },
  { name: 'bottom left', x: 'left', y: 'bottom' },
  { name: 'bottom right', x: 'right', y: 'bottom' },
] as const;
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
  const [hoveredEdges, setHoveredEdges] = useState<readonly TierTrimEdge[]>([]);
  const editor = useTierImageTrim({ trim });
  const { draft } = editor;
  const highlightedEdges = editor.activeEdges.length
    ? editor.activeEdges
    : hoveredEdges;
  const handles = [
    ...edges.map((edge) => {
      const horizontal = edge === 'left' || edge === 'right';

      return {
        name: `${edge} crop edge`,
        edges: [edge],
        corner: false,
        horizontal,
        x: horizontal ? draft[edge] - 0.018 : draft.left,
        y: horizontal ? draft.top : draft[edge] - 0.018,
        width: horizontal ? 0.036 : draft.right - draft.left,
        height: horizontal ? draft.bottom - draft.top : 0.036,
      };
    }),
    ...corners.map((corner) => ({
      name: `${corner.name} crop corner`,
      edges: [corner.x, corner.y],
      corner: true,
      horizontal: false,
      x: draft[corner.x] - 0.035,
      y: draft[corner.y] - 0.035,
      width: 0.07,
      height: 0.07,
    })),
  ];
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
                (event.target as Element).hasAttribute('data-trim-handle')
              ) {
                event.preventDefault();
                onSave(draft);
              }
            }}
          >
            <p className="mb-3">
              Drag edges or corners · Enter saves · Esc cancels
            </p>

            <fieldset aria-label="Image crop edges">
              <svg
                data-trim-viewport=""
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
                    const vertical = edge === 'left' || edge === 'right';

                    return (
                      <line
                        key={edge}
                        data-crop-border={edge}
                        x1={vertical ? draft[edge] : draft.left}
                        y1={vertical ? draft.top : draft[edge]}
                        x2={vertical ? draft[edge] : draft.right}
                        y2={vertical ? draft.bottom : draft[edge]}
                        className={cn(
                          'pointer-events-none stroke-white',
                          highlightedEdges.includes(edge)
                            ? 'opacity-100'
                            : 'opacity-0',
                        )}
                        strokeWidth="0.014"
                      />
                    );
                  })}
                </svg>

                {handles.map((handle) => {
                  const handleProps: HTMLAttributes<
                    SVGRectElement | HTMLButtonElement
                  > & {
                    'data-trim-handle': string;
                  } = {
                    'data-trim-handle': '',
                    tabIndex: 0,
                    'aria-label': handle.name,
                    className: cn(
                      'border-0 bg-transparent p-0 fill-transparent outline-none',
                      handle.corner ? 'cursor-move' : 'cursor-crosshair',
                    ),
                    onPointerEnter: () => setHoveredEdges(handle.edges),
                    onPointerLeave: () => setHoveredEdges([]),
                    onFocus: () => setHoveredEdges(handle.edges),
                    onBlur: () => setHoveredEdges([]),
                    onPointerDown: (event) => editor.start(event, handle.edges),
                    onPointerMove: editor.move,
                    onPointerUp: editor.end,
                    onPointerCancel: editor.cancel,
                    onLostPointerCapture: editor.cancel,
                    onKeyDown: (event) => {
                      const direction = Object.entries(keyboardBehaviors).find(
                        ([, behavior]) =>
                          behavior.codes.some((code) => code === event.code),
                      )?.[0];
                      const horizontal =
                        direction === 'left' || direction === 'right';
                      const edge = handle.edges.find(
                        (candidate) =>
                          horizontal ===
                          (candidate === 'left' || candidate === 'right'),
                      );

                      if (direction && edge) {
                        event.preventDefault();
                        const sign =
                          direction === 'left' || direction === 'up' ? -1 : 1;
                        editor.nudge(
                          edge,
                          sign * (event.shiftKey ? 0.1 : 0.01),
                        );
                      }
                    },
                  };

                  return handle.corner ? (
                    <foreignObject
                      key={handle.name}
                      x={handle.x * image.width}
                      y={handle.y * image.height}
                      width={handle.width * image.width}
                      height={handle.height * image.height}
                    >
                      <button
                        {...handleProps}
                        type="button"
                        className={cn(handleProps.className, 'block size-full')}
                      />
                    </foreignObject>
                  ) : (
                    <rect
                      key={handle.name}
                      {...handleProps}
                      x={handle.x * image.width}
                      y={handle.y * image.height}
                      width={handle.width * image.width}
                      height={handle.height * image.height}
                      role="slider"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(draft[handle.edges[0]] * 100)}
                      aria-orientation={
                        handle.horizontal ? 'horizontal' : 'vertical'
                      }
                    />
                  );
                })}
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
