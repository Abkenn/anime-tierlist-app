'use client';

import { Menu } from '@base-ui/react/menu';
import { useAtomValue } from 'jotai';
import { Ellipsis } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { memo, useCallback, useContext, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { draggedRankAtom } from '@/app/_atoms/tierlist/layout.atoms';
import { imageModeAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { fullImageTrim } from '@/app/_lib/tier-image-trim';
import { TierItem, type TierItemProps } from './tier-item';
import { TierItemButton, type TierItemButtonProps } from './tier-item-button';
import { TierItemInteractionContext } from './tier-item-interaction-host';

const ItemController = memo(TierItem);

export const TierItemPassive = (props: TierItemProps) => {
  const triggerId = useId();
  const [open, setOpen] = useState(false);
  const imageMode = useAtomValue(imageModeAtom);
  const rowDragging = useAtomValue(draggedRankAtom) !== null;
  const host = useContext(TierItemInteractionContext);
  const itemRef = useRef<HTMLButtonElement>(null);
  const viewRef = useRef<TierItemButtonProps | null>(null);
  const [view, setView] = useState<TierItemButtonProps | null>(null);
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  const reducedMotion = useReducedMotion();
  // Handlers stay current without repainting when only callback identities change.
  const publish = useCallback((next: TierItemButtonProps) => {
    viewRef.current = next;
    setView((current) => {
      if (
        current &&
        current.label === next.label &&
        current.rank === next.rank &&
        current.image === next.image &&
        current.itemTitle === next.itemTitle &&
        current.priority === next.priority &&
        current.editing === next.editing &&
        current.dragging === next.dragging &&
        current.pointerFocus === next.pointerFocus &&
        current.positioning === next.positioning &&
        current.animate === next.animate &&
        current.className === next.className &&
        current.crop.x === next.crop.x &&
        current.crop.y === next.crop.y &&
        current.trim === next.trim
      ) {
        return current;
      }
      return next;
    });
  }, []);
  const release = useCallback(() => {
    activeRef.current = false;
    viewRef.current = null;
    setView(null);
    setActive(false);
  }, []);
  const activate = () => {
    if (activeRef.current) {
      return true;
    }
    if (!host?.claim(props.id, release)) {
      return false;
    }
    // Install controls before forwarding this event; never replace its button.
    flushSync(() => {
      activeRef.current = true;
      setActive(true);
    });
    return true;
  };
  const origin = (event: { clientX: number; clientY: number }) => {
    if (activate()) {
      host?.origin({ x: event.clientX, y: event.clientY });
      return true;
    }
    return false;
  };
  const editing = view?.editing ?? false;
  const dragging = view?.dragging ?? false;

  return (
    <>
      <div
        className="group/item contents"
        onPointerDownCapture={origin}
        onContextMenuCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (origin(event)) {
            host?.contextMenu({ x: event.clientX, y: event.clientY });
          }
        }}
        onTouchStart={(event) => host?.touchStart(event)}
        onTouchMove={(event) => host?.touchMove(event)}
        onTouchEnd={() => host?.touchEnd()}
        onTouchCancel={() => host?.touchEnd()}
      >
        <TierItemButton
          ref={itemRef}
          previewAnchor={itemRef}
          data-tier-item-id={props.id}
          aria-haspopup={imageMode === 'natural' ? 'dialog' : 'menu'}
          aria-expanded={open}
          label={props.label}
          rank={props.rank}
          image={props.image}
          itemTitle={props.title}
          crop={props.crop ?? { x: 0.5, y: 0.5 }}
          trim={props.trim ?? fullImageTrim}
          priority={props.priority}
          className={props.dimmed ? 'opacity-20' : undefined}
          editing={false}
          dragging={false}
          pointerFocus={false}
          initial={props.position}
          animate={props.position}
          transition={
            reducedMotion || rowDragging
              ? { duration: 0 }
              : { type: 'spring', stiffness: 900, damping: 58, mass: 0.65 }
          }
          {...(active ? view : null)}
          onPointerDown={(event) => {
            if (activate()) {
              viewRef.current?.onPointerDown?.(event);
            }
          }}
          onPointerMove={(event) => viewRef.current?.onPointerMove?.(event)}
          onPointerUp={(event) => viewRef.current?.onPointerUp?.(event)}
          onPointerCancel={(event) => {
            host?.touchEnd();
            viewRef.current?.onPointerCancel?.(event);
          }}
          onLostPointerCapture={(event) => {
            host?.touchEnd();
            viewRef.current?.onLostPointerCapture?.(event);
          }}
          onKeyDown={(event) => {
            if (activate()) {
              viewRef.current?.onKeyDown?.(event);
            }
          }}
          onFocus={(event) => {
            if (activate()) {
              viewRef.current?.onFocus?.(event);
            }
          }}
          onBlur={(event) => viewRef.current?.onBlur?.(event)}
        />
        {!editing && !dragging && (
          <motion.div
            initial={false}
            animate={props.position}
            className={`pointer-events-none absolute left-0 top-0 z-20 ${open ? 'visible' : 'invisible'} group-hover/item:visible group-has-focus-visible/item:visible pointer-coarse:visible`}
          >
            <Menu.Trigger
              id={triggerId}
              aria-label="Edit poster"
              tabIndex={-1}
              onContextMenu={(event) => {
                event.preventDefault();
                if (activate()) {
                  host?.show();
                }
              }}
              className="pointer-events-auto absolute right-1 top-1 flex size-7 cursor-pointer items-center justify-center border border-white/20 bg-black/65 text-white hover:bg-black/90 focus-visible:outline-2 focus-visible:outline-white"
            >
              <Ellipsis aria-hidden="true" className="size-4" />
            </Menu.Trigger>
          </motion.div>
        )}
      </div>
      {active && (
        <ItemController
          {...props}
          menuTriggerId={triggerId}
          onMenuOpenChange={setOpen}
          buttonRef={itemRef}
          onButtonChange={publish}
        />
      )}
    </>
  );
};
