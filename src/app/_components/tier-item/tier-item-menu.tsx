'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { type ReactElement, type RefObject, useState } from 'react';
import { renamingItemIdAtom } from '@/app/_atoms/tierlist/find.atoms';
import { imageModeAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { ContextMenu } from '@/app/_components/ui/context-menu';
import { ContextMenuContent } from '@/app/_components/ui/context-menu-content';
import { ContextMenuItem } from '@/app/_components/ui/context-menu-item';
import { ContextMenuTrigger } from '@/app/_components/ui/context-menu-trigger';

type TierItemMenuProps = {
  itemId?: string;
  trigger: ReactElement;
  finalFocus?: RefObject<HTMLElement | null>;
  hasImage: boolean;
  squareImage?: boolean;
  editing: boolean;
  sizingControl?: ReactElement;
  onOpen: () => void;
  onEdit: () => void;
  canPosition?: boolean;
  onPosition?: () => void;
  onReset: () => void;
  hasTitle?: boolean;
  textEditorOpen?: boolean;
  onText?: () => void;
};

export const TierItemMenu = ({
  itemId,
  trigger,
  finalFocus,
  hasImage,
  squareImage = false,
  editing,
  sizingControl,
  onOpen,
  onEdit,
  canPosition = false,
  onPosition,
  onReset,
  hasTitle = false,
  textEditorOpen = false,
  onText,
}: TierItemMenuProps) => {
  const mode = useAtomValue(imageModeAtom);
  const rename = useSetAtom(renamingItemIdAtom);
  const [renaming, setRenaming] = useState(false);

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open) {
          setRenaming(false);
          onOpen();
        }
      }}
    >
      <ContextMenuTrigger
        render={trigger}
        aria-haspopup={mode === 'natural' ? 'dialog' : 'menu'}
      />

      <ContextMenuContent
        finalFocus={textEditorOpen || renaming ? false : finalFocus}
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
        {(mode === 'cover' || mode === 'natural') && (
          <div role="menu" aria-label="Image crop actions">
            <ContextMenuItem
              disabled={
                !hasImage || editing || (mode === 'cover' && squareImage)
              }
              onClick={onEdit}
            >
              {mode === 'natural' ? 'Edit trim' : 'Edit crop'}
            </ContextMenuItem>

            {mode === 'natural' && (
              <ContextMenuItem
                disabled={!hasImage || editing || !canPosition}
                onClick={onPosition}
              >
                Edit crop
              </ContextMenuItem>
            )}

            <ContextMenuItem
              disabled={
                !hasImage || editing || (mode === 'cover' && squareImage)
              }
              onClick={onReset}
            >
              {mode === 'natural' ? 'Reset trim' : 'Reset crop'}
            </ContextMenuItem>
          </div>
        )}

        <div role="menu" aria-label="Text actions">
          <ContextMenuItem
            disabled={!itemId || editing}
            onClick={() => {
              if (itemId) {
                setRenaming(true);
                rename(itemId);
              }
            }}
          >
            Rename Label
          </ContextMenuItem>

          <ContextMenuItem disabled={editing || !onText} onClick={onText}>
            {hasTitle ? 'Edit text' : 'Add text'}
          </ContextMenuItem>
        </div>

        {mode === 'natural' && sizingControl}

        {mode === 'contain' && (
          <ContextMenuItem disabled>Image centered in square</ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
