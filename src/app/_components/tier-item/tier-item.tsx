'use client';

import { cn } from 'cn';
import { useAtomValue } from 'jotai';
import { type HTMLMotionProps, motion } from 'motion/react';
import {
  type PointerEvent,
  type ReactElement,
  type Ref,
  type RefObject,
  useRef,
} from 'react';
import { imageModeAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { useTierBoardActions } from '@/app/_hooks/use-tier-board-actions';
import { useTierCrop } from '@/app/_hooks/use-tier-crop';
import { useTierItemDrag } from '@/app/_hooks/use-tier-item-drag';
import { useTierItemKeyboard } from '@/app/_hooks/use-tier-item-keyboard';
import type { TierItemPosition } from '@/app/_hooks/use-tier-items';
import type {
  TierCrop,
  TierImage,
  TierKeyboardMove,
} from '@/app/_types/tierlist.types';
import { TierCropControls } from './tier-crop-controls';
import { TierCropPreview } from './tier-crop-preview';
import { TierItemImage } from './tier-item-image';
import { TierItemMenu } from './tier-item-menu';

type TierItemProps = {
  id: string;
  label: string;
  rank: string;
  position: TierItemPosition;
  boardRef: RefObject<HTMLDivElement | null>;
  image?: TierImage;
  editing?: boolean;
  crop?: TierCrop;
  sizingControl?: ReactElement;
  onCropChange?: (crop: TierCrop) => void;
  onStart: (clientX: number, clientY: number) => void;
  onMove: (clientX: number, clientY: number) => void;
  onDrop: (clientX: number, clientY: number) => TierItemPosition | null;
  onCancel: () => void;
  onKeyboardMove: (move: TierKeyboardMove) => void;
};

type TierItemTriggerProps = HTMLMotionProps<'button'> & {
  ref?: Ref<HTMLButtonElement>;
  label: string;
  rank: string;
  image?: TierImage;
  crop: TierCrop;
  editing: boolean;
  dragging: boolean;
  pointerFocus: boolean;
};

const TierItemTrigger = ({
  label,
  rank,
  image,
  crop,
  editing,
  dragging,
  pointerFocus,
  className,
  ...buttonProps
}: TierItemTriggerProps) => {
  const imageMode = useAtomValue(imageModeAtom);

  return (
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
};

export const TierItem = ({
  id,
  label,
  image,
  editing: controlledEditing,
  crop = { x: 0.5, y: 0.5 },
  sizingControl,
  onCropChange,
  rank,
  position,
  boardRef,
  onStart,
  onMove,
  onDrop,
  onCancel,
  onKeyboardMove,
}: TierItemProps) => {
  const itemRef = useRef<HTMLButtonElement>(null);
  const imageMode = useAtomValue(imageModeAtom);
  const { setEditingItem, setKeyboardMode } = useTierBoardActions();
  const cropEditor = useTierCrop({
    image,
    imageMode,
    crop,
    editing: controlledEditing,
    onEditingChange: (editing) => setEditingItem({ id, editing }),
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
    onKeyboardModeChange: setKeyboardMode,
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
        hasImage={Boolean(image)}
        editing={editing}
        sizingControl={sizingControl}
        onOpen={cancel}
        onEdit={beginEditing}
        onReset={() => onCropChange?.({ x: 0.5, y: 0.5 })}
        trigger={
          <TierItemTrigger
            ref={itemRef}
            label={label}
            rank={rank}
            image={image}
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
