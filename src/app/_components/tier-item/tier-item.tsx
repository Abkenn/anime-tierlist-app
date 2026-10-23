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
  useState,
} from 'react';
import { imageModeAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { TouchDragHandle } from '@/app/_components/shell/touch-drag-handle';
import { useTierBoardActions } from '@/app/_hooks/use-tier-board-actions';
import { useTierCrop } from '@/app/_hooks/use-tier-crop';
import { useTierItemDrag } from '@/app/_hooks/use-tier-item-drag';
import { useTierItemKeyboard } from '@/app/_hooks/use-tier-item-keyboard';
import type { TierItemPosition } from '@/app/_hooks/use-tier-items';
import { useTierTrimPosition } from '@/app/_hooks/use-tier-trim-position';
import { centerTierTrim, fullImageTrim } from '@/app/_lib/tier-image-trim';
import { defaultTierItemTitle } from '@/app/_lib/tier-item-title';
import type {
  TierItemTitle as ItemTitle,
  TierCrop,
  TierImage,
  TierImageTrim,
  TierKeyboardMove,
} from '@/app/_types/tierlist.types';
import { TierCropControls } from './tier-crop-controls';
import { TierCropPreview } from './tier-crop-preview';
import { TierImageTrimEditor } from './tier-image-trim-editor';
import { TierItemImage } from './tier-item-image';
import { TierItemMenu } from './tier-item-menu';
import { TierItemTitle } from './tier-item-title';
import { TierItemTitleEditor } from './tier-item-title-editor';

type TierItemProps = {
  dimmed?: boolean;
  id: string;
  label: string;
  rank: string;
  position: TierItemPosition;
  boardRef: RefObject<HTMLDivElement | null>;
  image?: TierImage;
  title?: ItemTitle;
  editing?: boolean;
  crop?: TierCrop;
  trim?: TierImageTrim;
  onTitleChange?: (title: ItemTitle | undefined) => void;
  onTrimChange?: (trim: TierImageTrim) => void;
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
  itemTitle?: ItemTitle;
  crop: TierCrop;
  trim?: TierImageTrim;
  editing: boolean;
  dragging: boolean;
  pointerFocus: boolean;
  positioning?: boolean;
  previewAnchor: RefObject<HTMLButtonElement | null>;
};

const TierItemTrigger = ({
  label,
  rank,
  image,
  itemTitle,
  crop,
  trim,
  editing,
  dragging,
  pointerFocus,
  positioning,
  previewAnchor,
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
      data-trim-positioning={positioning || undefined}
      data-tier-item={label}
      className={cn(
        'pointer-events-auto absolute left-0 top-0 flex items-center justify-center border border-silver text-xs text-white select-none focus-visible:outline-white',
        editing ? 'touch-none' : 'touch-auto',
        dragging ? 'z-30 cursor-grabbing' : 'z-10 cursor-grab',
        editing && 'z-30 cursor-move ring-2 ring-white',
        image ? 'border-0 bg-transparent' : 'bg-gray',
        pointerFocus && 'focus-visible:outline-none!',
        className,
      )}
      {...buttonProps}
    >
      {!editing && <TouchDragHandle />}

      {image ? (
        <>
          {editing && (imageMode === 'cover' || positioning) && (
            <TierCropPreview
              anchor={previewAnchor}
              image={image}
              crop={crop}
              trim={positioning ? trim : undefined}
            />
          )}

          <span className="relative block size-full overflow-hidden">
            <TierItemImage
              image={image}
              mode={imageMode}
              crop={crop}
              trim={trim}
            />
          </span>
        </>
      ) : (
        label
      )}

      {itemTitle?.text && (
        <TierItemTitle
          title={itemTitle}
          image={image}
          mode={imageMode}
          trim={trim}
        />
      )}
    </motion.button>
  );
};

export const TierItem = ({
  dimmed = false,
  id,
  label,
  image,
  title,
  onTitleChange,
  editing: controlledEditing,
  crop = { x: 0.5, y: 0.5 },
  sizingControl,
  trim = fullImageTrim,
  onTrimChange,
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
  const [titleDraft, setTitleDraft] = useState<ItemTitle | null>(null);
  const [localTrimEditing, setLocalTrimEditing] = useState(false);
  const [localPositioning, setLocalPositioning] = useState(false);
  const textEditing = titleDraft !== null && controlledEditing !== false;
  const imageMode = useAtomValue(imageModeAtom);
  const { setEditingItem, setKeyboardMode } = useTierBoardActions();
  const cropEditor = useTierCrop({
    image,
    imageMode,
    crop,
    editing: imageMode === 'cover' && !textEditing ? controlledEditing : false,
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
  const trimPosition = useTierTrimPosition({
    image,
    trim,
    onChange: onTrimChange,
  });
  const naturalEditing =
    imageMode === 'natural' &&
    !textEditing &&
    (controlledEditing ?? localTrimEditing);
  const positioning = naturalEditing && localPositioning;
  const trimEditing = naturalEditing && !localPositioning;
  const keyboard = useTierItemKeyboard({
    itemRef,
    editing: cropEditor.editing || positioning,
    dragging: drag.dragging,
    onNudgeCrop: positioning ? trimPosition.nudge : cropEditor.nudge,
    onFinishEditing: (save) => {
      if (positioning) {
        trimPosition.finish(save);
        finishTrimEditing();
      } else {
        cropEditor.finishEditing(save);
      }
    },
    onCancel: () => {
      cropEditor.cancelPan();
      trimPosition.cancelPan();
      drag.cancel();
    },
    onKeyboardMove,
    onKeyboardModeChange: setKeyboardMode,
  });
  const { draftCrop } = cropEditor;
  const editing = cropEditor.editing || naturalEditing || textEditing;
  const activeTrim = positioning ? trimPosition.draft : trim;
  const hasTrim = trim.right - trim.left < 1 || trim.bottom - trim.top < 1;

  const closeText = () => {
    setTitleDraft(null);
    setEditingItem({ id, editing: false });
    keyboard.focusPointer();
  };

  const beginText = () => {
    setTitleDraft(title ? { ...title } : { ...defaultTierItemTitle });
    setEditingItem({ id, editing: true });
  };

  const finishTrimEditing = () => {
    setLocalTrimEditing(false);
    setLocalPositioning(false);
    setEditingItem({ id, editing: false });
    keyboard.focusPointer();
  };

  const beginEditing = () => {
    if (imageMode === 'natural') {
      setLocalPositioning(false);
      setLocalTrimEditing(true);
      setEditingItem({ id, editing: true });

      return;
    }

    cropEditor.beginEditing();
    keyboard.focusKeyboard();
  };

  const beginPositioning = () => {
    trimPosition.begin();
    setLocalPositioning(true);
    setLocalTrimEditing(true);
    setEditingItem({ id, editing: true });
    keyboard.focusKeyboard();
  };

  const finishEditing = (save: boolean) => {
    if (positioning) {
      trimPosition.finish(save);
      finishTrimEditing();

      return;
    }

    cropEditor.finishEditing(save);
    keyboard.focusPointer();
  };

  const cancel = () => {
    cropEditor.cancelPan();
    trimPosition.cancelPan();
    drag.cancel();
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0 || drag.dragging) {
      return;
    }

    if (textEditing) {
      return;
    }

    if (
      !editing &&
      event.pointerType === 'touch' &&
      !(
        event.target instanceof Element &&
        event.target.closest('[data-touch-drag-handle]')
      )
    ) {
      return;
    }

    if (editing) {
      if (positioning) {
        trimPosition.startPan(event);
      } else if (!trimEditing) {
        cropEditor.startPan(event);
      }

      return;
    }

    keyboard.focusPointer();
    drag.start(event);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!trimPosition.movePan(event) && !cropEditor.movePan(event)) {
      drag.move(event);
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!trimPosition.endPan(event) && !cropEditor.endPan(event)) {
      drag.end(event);
    }
  };

  return (
    <>
      <TierItemMenu
        itemId={id}
        finalFocus={itemRef}
        hasImage={Boolean(image)}
        squareImage={Boolean(image && image.width === image.height)}
        editing={editing}
        sizingControl={sizingControl}
        onOpen={cancel}
        onEdit={beginEditing}
        hasTitle={Boolean(title?.text)}
        textEditorOpen={textEditing}
        onText={beginText}
        canPosition={hasTrim}
        onPosition={beginPositioning}
        onReset={() =>
          imageMode === 'natural'
            ? onTrimChange?.(fullImageTrim)
            : onCropChange?.({ x: 0.5, y: 0.5 })
        }
        trigger={
          <TierItemTrigger
            className={dimmed ? 'opacity-20' : undefined}
            ref={itemRef}
            previewAnchor={itemRef}
            label={label}
            rank={rank}
            image={image}
            itemTitle={textEditing ? (titleDraft ?? undefined) : title}
            crop={cropEditor.editing ? draftCrop : crop}
            trim={activeTrim}
            positioning={positioning}
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

      {(cropEditor.editing || positioning) && (
        <TierCropControls
          anchor={itemRef}
          image={image}
          crop={positioning ? undefined : draftCrop}
          trim={positioning ? trimPosition.draft : undefined}
          label={label}
          onSave={() => finishEditing(true)}
          onCancel={() => finishEditing(false)}
          onReset={() =>
            positioning
              ? trimPosition.update(centerTierTrim(trimPosition.draft))
              : cropEditor.updateDraftCrop({ x: 0.5, y: 0.5 })
          }
        />
      )}

      {textEditing && titleDraft && (
        <TierItemTitleEditor
          key={id}
          anchor={itemRef}
          title={titleDraft}
          existing={Boolean(title?.text)}
          onChange={setTitleDraft}
          onSave={() => {
            onTitleChange?.(titleDraft.text.trim() ? titleDraft : undefined);
            closeText();
          }}
          onCancel={closeText}
          onRemove={() => {
            onTitleChange?.(undefined);
            closeText();
          }}
        />
      )}

      {trimEditing && image && (
        <TierImageTrimEditor
          anchor={itemRef}
          image={image}
          trim={trim}
          onSave={(next) => {
            onTrimChange?.(next);
            finishTrimEditing();
          }}
          onCancel={finishTrimEditing}
        />
      )}
    </>
  );
};
