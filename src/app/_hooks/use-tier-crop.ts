import { type PointerEvent, useLayoutEffect, useRef, useState } from 'react';
import type {
  TierCrop,
  TierImage,
  TierImageMode,
} from '@/app/_types/tierlist.types';

type TierCropInput = {
  image?: TierImage;
  imageMode: TierImageMode;
  crop: TierCrop;
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  onCropChange?: (crop: TierCrop) => void;
};

export const useTierCrop = ({
  image,
  imageMode,
  crop,
  editing: controlledEditing,
  onEditingChange,
  onCropChange,
}: TierCropInput) => {
  const [localEditing, setLocalEditing] = useState(false);
  const [draftCrop, setDraftCrop] = useState(crop);
  const draftCropRef = useRef(crop);
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
  };

  const finishEditing = (save: boolean) => {
    if (save) {
      onCropChange?.(draftCropRef.current);
    }

    cropSession.current = null;
    setLocalEditing(false);
    onEditingChange?.(false);
  };

  const startPan = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    cropSession.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      crop: draftCropRef.current,
    };
  };

  const movePan = (event: PointerEvent<HTMLButtonElement>) => {
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

      return true;
    }

    return false;
  };

  const endPan = (event: PointerEvent<HTMLButtonElement>) => {
    if (cropSession.current?.pointerId === event.pointerId) {
      cropSession.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);

      return true;
    }

    return false;
  };

  const cancelPan = () => {
    if (cropSession.current) {
      updateDraftCrop(cropSession.current.crop);
      cropSession.current = null;
    }
  };

  const nudge = (offset: TierCrop) => {
    updateDraftCrop({
      x: Math.max(0, Math.min(1, draftCropRef.current.x + offset.x)),
      y: Math.max(0, Math.min(1, draftCropRef.current.y + offset.y)),
    });
  };

  useLayoutEffect(() => {
    if (imageMode !== 'cover' && editing) {
      setLocalEditing(false);
      onEditingChange?.(false);
      cropSession.current = null;
    }
  }, [imageMode, editing, onEditingChange]);

  return {
    editing,
    draftCrop,
    updateDraftCrop,
    beginEditing,
    finishEditing,
    startPan,
    movePan,
    endPan,
    cancelPan,
    nudge,
  };
};
