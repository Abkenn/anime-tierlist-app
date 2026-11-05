'use client';

import { Menu } from '@base-ui/react/menu';
import { useAtomValue, useSetAtom } from 'jotai';
import { Ellipsis, Pencil } from 'lucide-react';
import { motion } from 'motion/react';
import {
  type ReactElement,
  type RefObject,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { renamingItemIdAtom } from '@/app/_atoms/tierlist/find.atoms';
import { menuItemIdAtom } from '@/app/_atoms/tierlist/interaction.atoms';
import { imageModeAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { ContextMenu } from '@/app/_components/ui/context-menu';
import { ContextMenuContent } from '@/app/_components/ui/context-menu-content';
import { ContextMenuItem } from '@/app/_components/ui/context-menu-item';
import { ContextMenuTrigger } from '@/app/_components/ui/context-menu-trigger';
import type { TierItemPosition } from '@/app/_lib/tier-board-geometry';
import { TierItemInteractionContext } from './tier-item-interaction-host';

type TierItemMenuProps = {
  menuTriggerId?: string;
  onMenuOpenChange?: (value: boolean) => void;
  itemId?: string;
  label?: string;
  onLabelChange?: (label: string) => void;
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
  menuTriggerId,
  onMenuOpenChange,
  itemId,
  label = 'Unknown',
  onLabelChange,
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
  const host = useContext(TierItemInteractionContext);
  const focusedPopup = useRef<HTMLDivElement | null>(null);
  const focusPopup = useCallback((element: HTMLDivElement | null) => {
    if (element && focusedPopup.current !== element) {
      focusedPopup.current = element;
      element.focus({ preventScroll: true });
    }
  }, []);
  const mode = useAtomValue(imageModeAtom);
  const setMenuItem = useSetAtom(menuItemIdAtom);
  const setRenamingItem = useSetAtom(renamingItemIdAtom);
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const labelInput = useRef<HTMLInputElement>(null);
  const labelAction = useRef<HTMLDivElement>(null);
  const activeRename = useRef(false);
  const [menuOrigin, setMenuOrigin] = useState<{ x: number; y: number }>();

  const finishRename = (save: boolean) => {
    if (!activeRename.current) {
      return;
    }

    activeRename.current = false;
    setRenamingItem((current) => (current === itemId ? null : current));
    const value = labelInput.current?.value.trim();
    if (save && value && value !== label) {
      onLabelChange?.(value);
    }

    setRenaming(false);
  };

  const changeOpen = (next: boolean) => {
    if (!next) {
      finishRename(true);
    }

    setOpen(next);
    host?.open(next);
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

  const menuState = useRef({ changeOpen, open, dragging });

  useLayoutEffect(() => {
    menuState.current = { changeOpen, open, dragging };
  });

  useLayoutEffect(() => {
    host?.highlight(!renaming);
  }, [host, renaming]);

  useLayoutEffect(
    () =>
      host?.register({
        id: itemId ?? '',
        triggerId: menuTriggerId,
        changeOpen: (value) => menuState.current.changeOpen(value),
        origin: setMenuOrigin,
        setRootOpen: (value) => onMenuOpenChange?.(value),
        locked: () => menuState.current.open || menuState.current.dragging,
      }),
    [host, itemId, menuTriggerId, onMenuOpenChange],
  );

  const content = (
    <>
      {host ? (
        trigger
      ) : (
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
      )}

      <ContextMenuContent
        menu={!!host}
        onMouseUpCapture={host?.contextRelease}
        ref={focusPopup}
        spawnFrom={menuOrigin}
        finalFocus={textEditorOpen ? false : finalFocus}
        className="w-72 max-w-[calc(100vw-2rem)]"
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
        <div className="mb-1 border-b border-divider pb-1">
          {renaming ? (
            <input
              ref={(element) => {
                labelInput.current = element;
                element?.focus();
                element?.select();
              }}
              aria-label="Item label"
              defaultValue={label}
              maxLength={300}
              enterKeyHint="done"
              className="min-h-11 w-full border border-foreground bg-background px-2 text-base outline-none"
              onClick={(event) => event.stopPropagation()}
              onBlur={() => finishRename(true)}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Enter' || event.key === 'Escape') {
                  if (event.nativeEvent.isComposing) {
                    return;
                  }

                  event.preventDefault();
                  finishRename(event.key === 'Enter');
                  requestAnimationFrame(() => labelAction.current?.focus());
                }
              }}
            />
          ) : (
            <ContextMenuItem
              ref={labelAction}
              closeOnClick={false}
              disabled={editing || !onLabelChange}
              aria-label={`Edit label: ${label}`}
              className="group/label min-h-11 items-start justify-between gap-3 whitespace-normal py-3"
              onClick={() => {
                activeRename.current = true;
                setRenamingItem(itemId ?? null);
                setRenaming(true);
              }}
            >
              <span className="min-w-0 wrap-anywhere">{label}</span>

              <Pencil
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 group-hover/label:opacity-100 group-focus/label:opacity-100 pointer-coarse:opacity-100"
              />
            </ContextMenuItem>
          )}
        </div>

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
          <ContextMenuItem disabled={editing || !onText} onClick={onText}>
            {hasTitle ? 'Edit text' : 'Add text'}
          </ContextMenuItem>
        </div>

        {mode === 'natural' && sizingControl}

        {mode === 'contain' && (
          <ContextMenuItem disabled>Image centered in square</ContextMenuItem>
        )}
      </ContextMenuContent>
    </>
  );
  return host ? (
    content
  ) : (
    <ContextMenu
      open={open}
      onOpenChange={changeOpen}
      highlightItemOnHover={!renaming}
    >
      {content}
    </ContextMenu>
  );
};
