'use client';

import { cn } from 'cn';
import { type HTMLMotionProps, motion } from 'motion/react';
import { type PointerEvent, type Ref, type RefObject, useRef } from 'react';
import { TierCropControls } from '@/app/_components/tierlist/tier-crop-controls';
import { TierCropPreview } from '@/app/_components/tierlist/tier-crop-preview';
import { TierItemImage } from '@/app/_components/tierlist/tier-item-image';
import { TierItemMenu } from '@/app/_components/tierlist/tier-item-menu';
import { useTierCrop } from '@/app/_hooks/use-tier-crop';
import { useTierItemDrag } from '@/app/_hooks/use-tier-item-drag';
import { useTierItemKeyboard } from '@/app/_hooks/use-tier-item-keyboard';
import type { TierItemPosition } from '@/app/_hooks/use-tier-items';
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

type TierItemTriggerProps = HTMLMotionProps<'button'> & {
  ref?: Ref<HTMLButtonElement>;
  label: string;
  rank: string;
  image?: TierImage;
  imageMode: TierImageMode;
  crop: TierCrop;
  editing: boolean;
  dragging: boolean;
  pointerFocus: boolean;
};

const TierItemTrigger = ({
  label,
  rank,
  image,
  imageMode,
  crop,
  editing,
  dragging,
  pointerFocus,
  className,
  ...buttonProps
}: TierItemTriggerProps) => (
  <motion.button
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
      className,
    )}
    {...buttonProps}
  >
    {image ? (
      <>
        {editing && <TierCropPreview image={image} crop={crop} />}

        <span className="relative block size-full overflow-hidden">
          <TierItemImage image={image} mode={imageMode} crop={crop} />
        </span>
      </>
    ) : (
      label
    )}
  </motion.button>
);

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
  const itemRef = useRef<HTMLButtonElement>(null);
  const cropEditor = useTierCrop({
    image,
    imageMode,
    crop,
    editing: controlledEditing,
    onEditingChange,
    onCropChange,
  });
  const drag = useTierItemDrag({
    itemRef,
    boardRef,
    position,
    onStart,
    onMove,
    onDrop,
    onCancel,
  });
  const keyboard = useTierItemKeyboard({
    itemRef,
    editing: cropEditor.editing,
    dragging: drag.dragging,
    onNudgeCrop: cropEditor.nudge,
    onFinishEditing: cropEditor.finishEditing,
    onCancel: () => {
      cropEditor.cancelPan();
      drag.cancel();
    },
    onKeyboardMove,
    onKeyboardModeChange,
  });
  const { editing, draftCrop } = cropEditor;

  const beginEditing = () => {
    cropEditor.beginEditing();
    keyboard.focusKeyboard();
  };

  const finishEditing = (save: boolean) => {
    cropEditor.finishEditing(save);
    keyboard.focusPointer();
  };

  const cancel = () => {
    cropEditor.cancelPan();
    drag.cancel();
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0 || drag.dragging) {
      return;
    }

    if (editing) {
      cropEditor.startPan(event);

      return;
    }

    keyboard.focusPointer();
    drag.start(event);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!cropEditor.movePan(event)) {
      drag.move(event);
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!cropEditor.endPan(event)) {
      drag.end(event);
    }
  };

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
          <TierItemTrigger
            ref={itemRef}
            label={label}
            rank={rank}
            image={image}
            imageMode={imageMode}
            crop={editing ? draftCrop : crop}
            editing={editing}
            dragging={drag.dragging}
            pointerFocus={keyboard.pointerFocus}
            initial={position}
            animate={drag.controls}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={cancel}
            onLostPointerCapture={cancel}
            onKeyDown={keyboard.handleKeyDown}
            onFocus={keyboard.handleFocus}
            onBlur={keyboard.handleBlur}
          />
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
          onReset={() => cropEditor.updateDraftCrop({ x: 0.5, y: 0.5 })}
        />
      )}
    </>
  );
};
