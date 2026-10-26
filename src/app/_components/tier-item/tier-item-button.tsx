'use client';

import { cn } from 'cn';
import { useAtomValue } from 'jotai';
import { type HTMLMotionProps, motion } from 'motion/react';
import type { Ref, RefObject } from 'react';
import { imageModeAtom } from '@/app/_atoms/tierlist/settings.atoms';
import type {
  TierItemTitle as ItemTitle,
  TierCrop,
  TierImage,
  TierImageTrim,
} from '@/app/_types/tierlist.types';
import { TierCropPreview } from './tier-crop-preview';
import { TierItemImage } from './tier-item-image';
import { TierItemTitle } from './tier-item-title';

type TierItemButtonProps = HTMLMotionProps<'button'> & {
  ref?: Ref<HTMLButtonElement>;
  label: string;
  rank: string;
  image?: TierImage;
  priority?: boolean;
  itemTitle?: ItemTitle;
  crop: TierCrop;
  trim?: TierImageTrim;
  editing: boolean;
  dragging: boolean;
  pointerFocus: boolean;
  positioning?: boolean;
  previewAnchor: RefObject<HTMLButtonElement | null>;
};

export const TierItemButton = ({
  label,
  rank,
  image,
  priority = false,
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
}: TierItemButtonProps) => {
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
        'touch-none',
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
              priority={priority}
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
