'use client';

import { useAtomValue } from 'jotai';
import type { ReactElement, RefObject } from 'react';
import { imageModeAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { ContextMenu } from '@/app/_components/ui/context-menu';
import { ContextMenuContent } from '@/app/_components/ui/context-menu-content';
import { ContextMenuItem } from '@/app/_components/ui/context-menu-item';
import { ContextMenuTrigger } from '@/app/_components/ui/context-menu-trigger';

type TierItemMenuProps = {
  trigger: ReactElement;
  finalFocus?: RefObject<HTMLElement | null>;
  hasImage: boolean;
  editing: boolean;
  sizingControl?: ReactElement;
  onOpen: () => void;
  onEdit: () => void;
  onReset: () => void;
};

export const TierItemMenu = ({
  trigger,
  finalFocus,
  hasImage,
  editing,
  sizingControl,
  onOpen,
  onEdit,
  onReset,
}: TierItemMenuProps) => {
  const mode = useAtomValue(imageModeAtom);

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open) {
          onOpen();
        }
      }}
    >
      <ContextMenuTrigger
        render={trigger}
        aria-haspopup={mode === 'natural' ? 'dialog' : 'menu'}
      />

      <ContextMenuContent
        finalFocus={finalFocus}
        className={
          mode === 'natural'
            ? 'max-w-[calc(100vw-2rem)] overflow-visible'
            : undefined
        }
        positionerProps={
          mode === 'natural' && finalFocus
            ? {
                anchor: finalFocus,
                side: 'bottom',
                align: 'start',
                alignOffset: 0,
                sideOffset: () =>
                  Number.parseFloat(
                    getComputedStyle(document.documentElement).fontSize,
                  ) * 0.5,
              }
            : undefined
        }
        role={mode === 'natural' ? 'dialog' : 'menu'}
        aria-label={mode === 'natural' ? 'Image size' : undefined}
      >
        {mode === 'cover' && (
          <>
            <ContextMenuItem disabled={!hasImage || editing} onClick={onEdit}>
              Edit crop
            </ContextMenuItem>

            <ContextMenuItem disabled={!hasImage || editing} onClick={onReset}>
              Reset crop
            </ContextMenuItem>
          </>
        )}

        {mode === 'natural' && sizingControl}

        {mode === 'contain' && (
          <ContextMenuItem disabled>Image centered in square</ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
