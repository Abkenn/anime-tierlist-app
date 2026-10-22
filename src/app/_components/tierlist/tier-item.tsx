'use client';

import { cn } from 'cn';
import {
  cancelFrame,
  frame,
  motion,
  useAnimationControls,
  useReducedMotion,
} from 'motion/react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { type RefObject, useLayoutEffect, useRef, useState } from 'react';
import { TierCropControls } from '@/app/_components/tierlist/tier-crop-controls';
import { TierCropPreview } from '@/app/_components/tierlist/tier-crop-preview';
import { TierItemImage } from '@/app/_components/tierlist/tier-item-image';
import { TierItemMenu } from '@/app/_components/tierlist/tier-item-menu';
import type { TierItemPosition } from '@/app/_hooks/use-tier-items';
import { withKeyboardBehaviors } from '@/app/_lib/keybindings';
import type {
  TierCrop,
  TierImage,
  TierImageMode,
  TierKeyboardMove,
} from '@/app/_types/tierlist.types';

type TierItemProps = {
  label: string;
  rank: string;
  position: TierItemPosition;
  boardRef: RefObject<HTMLDivElement | null>;
  image?: TierImage;
  imageMode?: TierImageMode;
  editing?: boolean;
  crop?: TierCrop;
  rowHeightExpansion?: number;
  onEditingChange?: (editing: boolean) => void;
  onCropChange?: (crop: TierCrop) => void;
  onRowHeightExpansionChange?: (expansion: number) => void;
  onStart: (clientX: number, clientY: number) => void;
  onMove: (clientX: number, clientY: number) => void;
  onDrop: (clientX: number, clientY: number) => TierItemPosition | null;
  onCancel: () => void;
  onKeyboardMove: (move: TierKeyboardMove) => void;
  onKeyboardModeChange: (active: boolean) => void;
};
type DragSession = {
  pointerId: number;
  x: number;
  y: number;
  grabX: number;
  grabY: number;
  stopFrame: (() => void) | null;
};

const directionGroups = withKeyboardBehaviors({
  left: {
    crop: { x: -0.025, y: 0 },
    move: { axis: 'column', direction: -1 },
  },
  right: {
    crop: { x: 0.025, y: 0 },
    move: { axis: 'column', direction: 1 },
  },
  up: {
    crop: { x: 0, y: -0.025 },
    move: { axis: 'row', direction: -1 },
  },
  down: {
    crop: { x: 0, y: 0.025 },
    move: { axis: 'row', direction: 1 },
  },
});

export const TierItem = ({
  label,
  image,
  imageMode = 'contain',
  editing: controlledEditing,
  onEditingChange,
  crop = { x: 0.5, y: 0.5 },
  rowHeightExpansion = 0,
  onCropChange,
  onRowHeightExpansionChange,
  rank,
  position,
  boardRef,
  onStart,
  onMove,
  onDrop,
  onCancel,
  onKeyboardMove,
  onKeyboardModeChange,
}: TierItemProps) => {
  const controls = useAnimationControls();
  const reducedMotion = useReducedMotion();
  const session = useRef<DragSession | null>(null);
  const pointerOrigin = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [pointerFocus, setPointerFocus] = useState(false);
  const [localEditing, setLocalEditing] = useState(false);
  const [draftCrop, setDraftCrop] = useState(crop);
  const draftCropRef = useRef(crop);
  const itemRef = useRef<HTMLButtonElement>(null);
  const cropSession = useRef<{
    pointerId: number;
    x: number;
    y: number;
    crop: TierCrop;
  } | null>(null);

  const editing = controlledEditing ?? localEditing;

  const updateDraftCrop = (next: TierCrop) => {
    draftCropRef.current = next;
    setDraftCrop(next);
  };

  const beginEditing = () => {
    updateDraftCrop(crop);
    setLocalEditing(true);
    onEditingChange?.(true);
    pointerOrigin.current = false;
    setPointerFocus(false);
    itemRef.current?.focus({ preventScroll: true });
  };

  const finishEditing = (save: boolean) => {
    if (save) {
      onCropChange?.(draftCropRef.current);
    }

    cropSession.current = null;
    setLocalEditing(false);
    onEditingChange?.(false);
    pointerOrigin.current = true;
    setPointerFocus(true);
    itemRef.current?.focus({ preventScroll: true });
  };

  const settle = (target: TierItemPosition) =>
    controls.start({
      ...target,
      transition: reducedMotion
        ? { duration: 0 }
        : { type: 'spring', stiffness: 900, damping: 58, mass: 0.65 },
    });

  const stop = () => {
    const pointerId = session.current?.pointerId;

    session.current?.stopFrame?.();
    session.current = null;

    if (
      pointerId !== undefined &&
      itemRef.current?.hasPointerCapture(pointerId)
    ) {
      itemRef.current.releasePointerCapture(pointerId);
    }

    setDragging(false);
  };

  const cancel = () => {
    if (cropSession.current) {
      updateDraftCrop(cropSession.current.crop);
      cropSession.current = null;
    }

    if (!session.current) {
      return;
    }

    stop();
    onCancel();
    void settle(position);
  };

  const followPointer = () => {
    const active = session.current;
    const board = boardRef.current;

    if (!active || !board) {
      return;
    }

    const rem = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    const bounds = board.getBoundingClientRect();

    controls.set({
      x: `${String((active.x - bounds.left) / rem - active.grabX)}rem`,
      y: `${String((active.y - bounds.top) / rem - active.grabY)}rem`,
    });
    onMove(active.x, active.y);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0 || session.current) {
      return;
    }

    if (editing) {
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });
      event.currentTarget.setPointerCapture(event.pointerId);
      cropSession.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        crop: draftCropRef.current,
      };

      return;
    }

    event.preventDefault();
    pointerOrigin.current = true;
    setPointerFocus(true);
    onKeyboardModeChange(false);
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    controls.stop();

    const rect = event.currentTarget.getBoundingClientRect();
    const rem = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );

    session.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      grabX: (event.clientX - rect.left) / rem,
      grabY: (event.clientY - rect.top) / rem,
      stopFrame: null,
    };
    setDragging(true);
    onStart(event.clientX, event.clientY);

    const tick = ({ delta }: { delta: number }) => {
      const active = session.current;

      if (!active) {
        return;
      }

      const viewport = boardRef.current?.closest<HTMLElement>(
        '[data-slot="scroll-area-viewport"]',
      );

      if (viewport) {
        const bounds = viewport.getBoundingClientRect();
        const edge = rem * 3;
        const distance =
          active.y < bounds.top + edge
            ? active.y - bounds.top - edge
            : Math.max(0, active.y - bounds.bottom + edge);
        const elapsed = Math.min(delta, 32) / 1000;

        if (distance) {
          viewport.scrollTop +=
            Math.max(-rem * 24, Math.min(rem * 24, distance * 8)) * elapsed;
        }
      }

      const horizontal = boardRef.current?.closest<HTMLElement>(
        '[data-tier-viewport]',
      );

      if (horizontal && horizontal.scrollWidth > horizontal.clientWidth) {
        const bounds = horizontal.getBoundingClientRect();
        const edge = rem * 2;
        const distance =
          active.x < bounds.left + edge
            ? active.x - bounds.left - edge
            : Math.max(0, active.x - bounds.right + edge);

        horizontal.scrollLeft +=
          (Math.max(-rem * 20, Math.min(rem * 20, distance * 8)) *
            Math.min(delta, 32)) /
          1000;
      }

      followPointer();
    };

    session.current.stopFrame = () => cancelFrame(tick);
    frame.update(tick, true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const activeCrop = cropSession.current;

    if (activeCrop && image && activeCrop.pointerId === event.pointerId) {
      const width = event.currentTarget.clientWidth;
      const height = event.currentTarget.clientHeight;
      const scale = Math.max(width / image.width, height / image.height);
      const overflowX = image.width * scale - width;
      const overflowY = image.height * scale - height;

      updateDraftCrop({
        x:
          overflowX > 0.01
            ? Math.max(
                0,
                Math.min(
                  1,
                  activeCrop.crop.x -
                    (event.clientX - activeCrop.x) / overflowX,
                ),
              )
            : 0.5,
        y:
          overflowY > 0.01
            ? Math.max(
                0,
                Math.min(
                  1,
                  activeCrop.crop.y -
                    (event.clientY - activeCrop.y) / overflowY,
                ),
              )
            : 0.5,
      });

      return;
    }

    const active = session.current;

    if (!active || active.pointerId !== event.pointerId) {
      return;
    }

    active.x = event.clientX;
    active.y = event.clientY;
    followPointer();
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (cropSession.current?.pointerId === event.pointerId) {
      cropSession.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);

      return;
    }

    if (session.current?.pointerId !== event.pointerId) {
      return;
    }

    const target = onDrop(event.clientX, event.clientY);

    stop();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    void settle(target ?? position);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (
      event.code === 'ContextMenu' ||
      (event.shiftKey && event.code === 'F10')
    ) {
      event.preventDefault();

      const bounds = event.currentTarget.getBoundingClientRect();

      event.currentTarget.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          clientX: bounds.left + bounds.width / 2,
          clientY: bounds.top + bounds.height / 2,
        }),
      );

      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const direction = Object.values(directionGroups).find(({ codes }) =>
      codes.some((code) => code === event.code),
    );
    const confirm = event.code === 'Enter' || event.code === 'NumpadEnter';

    if (editing) {
      if (direction) {
        event.preventDefault();
        updateDraftCrop({
          x: Math.max(
            0,
            Math.min(1, draftCropRef.current.x + direction.crop.x),
          ),
          y: Math.max(
            0,
            Math.min(1, draftCropRef.current.y + direction.crop.y),
          ),
        });
      }

      if (confirm || event.code === 'Escape') {
        event.preventDefault();
        finishEditing(confirm);
      }

      return;
    }

    if (event.code === 'Escape') {
      event.preventDefault();
      cancel();
      event.currentTarget.blur();

      return;
    }

    if (confirm || event.code === 'Space') {
      event.preventDefault();
      pointerOrigin.current = false;
      setPointerFocus(false);
      onKeyboardModeChange(true);

      return;
    }

    if (pointerOrigin.current || session.current) {
      return;
    }

    if (direction) {
      event.preventDefault();
      onKeyboardModeChange(true);
      onKeyboardMove(direction.move);
    }
  };

  useLayoutEffect(() => {
    if (session.current) {
      return;
    }

    void controls.start({
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height,
      transition: reducedMotion
        ? { duration: 0 }
        : { type: 'spring', stiffness: 900, damping: 58, mass: 0.65 },
    });
  }, [
    controls,
    position.x,
    position.y,
    position.width,
    position.height,
    reducedMotion,
  ]);

  useLayoutEffect(() => () => session.current?.stopFrame?.(), []);

  useLayoutEffect(() => {
    if (imageMode !== 'cover' && editing) {
      setLocalEditing(false);
      onEditingChange?.(false);
      cropSession.current = null;
    }
  }, [imageMode, editing, onEditingChange]);

  return (
    <>
      <TierItemMenu
        finalFocus={itemRef}
        mode={imageMode}
        hasImage={Boolean(image)}
        fullHeightByDefault={Boolean(
          image && image.width > 0 && image.height >= image.width,
        )}
        editing={editing}
        rowHeightExpansion={rowHeightExpansion}
        onOpen={cancel}
        onEdit={beginEditing}
        onReset={() => onCropChange?.({ x: 0.5, y: 0.5 })}
        onRowHeightExpansion={(expansion) =>
          onRowHeightExpansionChange?.(expansion)
        }
        trigger={
          <motion.button
            ref={itemRef}
            type="button"
            aria-label={`Item ${label} in ${rank}`}
            aria-description={
              editing
                ? 'Crop editing. Drag the image or use arrows/WASD. Enter saves; Escape cancels.'
                : 'Tab to select, or press Enter after clicking. Up/Down or W/S move between tiers; Left/Right or A/D reorder within a tier. Shift+F10 opens image options. Escape exits keyboard mode or cancels a drag.'
            }
            data-image-mode={imageMode}
            data-crop-editing={editing || undefined}
            data-tier-item={label}
            className={cn(
              'pointer-events-auto absolute left-0 top-0 flex touch-none items-center justify-center border border-silver text-xs text-white select-none focus-visible:outline-white',
              dragging ? 'z-30 cursor-grabbing' : 'z-10 cursor-grab',
              editing && 'z-30 cursor-move ring-2 ring-white',
              image ? 'border-0 bg-transparent' : 'bg-gray',
              pointerFocus && 'focus-visible:outline-none!',
            )}
            initial={position}
            animate={controls}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={cancel}
            onLostPointerCapture={cancel}
            onKeyDown={handleKeyDown}
            onFocus={(event) => {
              if (
                !pointerOrigin.current &&
                event.currentTarget.matches(':focus-visible')
              ) {
                onKeyboardModeChange(true);
              }
            }}
            onBlur={() => {
              pointerOrigin.current = false;
              setPointerFocus(false);
              onKeyboardModeChange(false);
            }}
          >
            {image ? (
              <>
                {editing && <TierCropPreview image={image} crop={draftCrop} />}
                <span className="relative block size-full overflow-hidden">
                  <TierItemImage
                    image={image}
                    mode={imageMode}
                    crop={editing ? draftCrop : crop}
                  />
                </span>
              </>
            ) : (
              label
            )}
          </motion.button>
        }
      />
      {editing && (
        <TierCropControls
          anchor={itemRef}
          image={image}
          crop={draftCrop}
          label={label}
          onSave={() => finishEditing(true)}
          onCancel={() => finishEditing(false)}
          onReset={() => updateDraftCrop({ x: 0.5, y: 0.5 })}
        />
      )}
    </>
  );
};
