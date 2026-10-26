'use client';

import { Menu } from '@base-ui/react/menu';
import { useAtomValue, useSetAtom } from 'jotai';
import { Ellipsis } from 'lucide-react';
import { motion } from 'motion/react';
import { type ReactElement, type RefObject, useState } from 'react';
import { renamingItemIdAtom } from '@/app/_atoms/tierlist/find.atoms';
import { menuItemIdAtom } from '@/app/_atoms/tierlist/interaction.atoms';
import { imageModeAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { ContextMenu } from '@/app/_components/ui/context-menu';
import { ContextMenuContent } from '@/app/_components/ui/context-menu-content';
import { ContextMenuItem } from '@/app/_components/ui/context-menu-item';
import { ContextMenuTrigger } from '@/app/_components/ui/context-menu-trigger';
import type { TierItemPosition } from '@/app/_lib/tier-board-geometry';

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
  position?: TierItemPosition;
  dragging?: boolean;
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
  position,
  dragging = false,
}: TierItemMenuProps) => {
  const mode = useAtomValue(imageModeAtom);
  const setMenuItem = useSetAtom(menuItemIdAtom);
  const rename = useSetAtom(renamingItemIdAtom);
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [menuOrigin, setMenuOrigin] = useState<{ x: number; y: number }>();

  const changeOpen = (next: boolean) => {
    setOpen(next);
    setMenuItem((current) => {
      if (next) {
        return itemId ?? null;
      }

      return current === itemId ? null : current;
    });
    if (next) {
      setRenaming(false);
      onOpen();
    }
  };

  return (
    <ContextMenu open={open} onOpenChange={changeOpen}>
      <div
        className="group/item contents"
        onPointerDownCapture={(event) =>
          setMenuOrigin({ x: event.clientX, y: event.clientY })
        }
        onContextMenuCapture={(event) =>
          setMenuOrigin({ x: event.clientX, y: event.clientY })
        }
      >
        <ContextMenuTrigger
          render={trigger}
          aria-haspopup={mode === 'natural' ? 'dialog' : 'menu'}
        />

        {position && !dragging && !editing && (
          <motion.div
            initial={false}
            animate={position}
            className={`pointer-events-none absolute left-0 top-0 z-20 ${open ? 'visible' : 'invisible'} group-hover/item:visible group-has-focus-visible/item:visible pointer-coarse:visible`}
          >
            <Menu.Trigger
              aria-label="Edit poster"
              tabIndex={-1}
              onContextMenu={(event) => {
                event.preventDefault();
                changeOpen(true);
              }}
              className="pointer-events-auto absolute right-1 top-1 flex size-7 cursor-pointer items-center justify-center border border-white/20 bg-black/65 text-white hover:bg-black/90 focus-visible:outline-2 focus-visible:outline-white"
            >
              <Ellipsis aria-hidden="true" className="size-4" />
            </Menu.Trigger>
          </motion.div>
        )}
      </div>

      <ContextMenuContent
        spawnFrom={menuOrigin}
        finalFocus={textEditorOpen || renaming ? false : finalFocus}
        className={
          mode === 'natural'
            ? 'max-w-[calc(100vw-2rem)] overflow-visible'
            : undefined
        }
        positionerProps={
          finalFocus
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
