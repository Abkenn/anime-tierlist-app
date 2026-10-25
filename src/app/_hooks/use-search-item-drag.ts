'use client';

import { useSetAtom } from 'jotai';
import {
  cancelFrame,
  frame,
  type HTMLMotionProps,
  useAnimationControls,
  useDragControls,
  useMotionValue,
} from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import {
  addTierItemAtom,
  dropSearchItemAtom,
  removeTierItemAtom,
} from '@/app/_atoms/tierlist/items.atoms';
import {
  draggedSearchItemAtom,
  searchDragPointAtom,
  searchDropSlotAtom,
} from '@/app/_atoms/tierlist/search.atoms';
import { toast } from '@/app/_components/ui/toast';
import { scrollTierDrag } from '@/app/_lib/scroll-tier-drag';
import type { TierItemData } from '@/app/_types/tierlist.types';

export const useSearchItemDrag = (item: TierItemData) => {
  const image = item.image;
  const [dragging, setDragging] = useState(false);
  const dragged = useRef(false);
  const active = useRef(false);
  const dragControls = useDragControls();
  const grab = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const preview = useAnimationControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const setDragged = useSetAtom(draggedSearchItemAtom);
  const setPoint = useSetAtom(searchDragPointAtom);
  const setSlot = useSetAtom(searchDropSlotAtom);
  const commitDrop = useSetAtom(dropSearchItemAtom);
  const importItem = useSetAtom(addTierItemAtom);
  const removeItem = useSetAtom(removeTierItemAtom);

  const cancel = () => {
    active.current = false;
    dragControls.cancel();
    setDragging(false);
    setDragged(null);
    setPoint(null);
    setSlot(null);
  };

  const triggerProps: HTMLMotionProps<'button'> = {
    dragControls,
    dragListener: false,
    onPointerDown: (event) => {
      dragged.current = false;

      if (!event.isPrimary || event.button !== 0) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      grab.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        width: rect.width,
        height: rect.height,
      };
      x.set(event.clientX - grab.current.x);
      y.set(event.clientY - grab.current.y);
      dragControls.start(event);
    },
    onClick: () => {
      if (!dragged.current && image) {
        const added = importItem(item);

        if (added) {
          const id = toast.add({
            title: `${added.label} added to ${added.rank}`,
            actionProps: {
              children: 'Undo',
              onClick: () => {
                removeItem(added.id);
                toast.close(id);
              },
            },
          });
        }
      }
    },
    onDragStart: () => {
      active.current = true;
      dragged.current = true;
      setDragging(true);
      setDragged(item);
    },
    onDrag: (_, info) => {
      if (!active.current) {
        return;
      }

      x.set(info.point.x - grab.current.x);
      y.set(info.point.y - grab.current.y);
      preview.set({ x: x.get(), y: y.get() });
      setPoint(info.point);
    },
    onDragEnd: () => {
      if (active.current) {
        commitDrop();
      }

      cancel();
    },
    onPointerCancel: cancel,
    onContextMenu: (event) => {
      if (dragging) {
        event.preventDefault();
      }
    },
  };

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const tick = ({ delta }: { delta: number }) => {
      const board = document.querySelector<HTMLElement>(
        '[aria-label="Anime tierlist"]',
      );

      if (active.current && board) {
        const scrolled = scrollTierDrag({
          board,
          x: x.get() + grab.current.x,
          y: y.get() + grab.current.y,
          delta,
        });

        if (scrolled) {
          setPoint({
            x: x.get() + grab.current.x,
            y: y.get() + grab.current.y,
          });
        }
      }
    };

    frame.update(tick, true);

    return () => cancelFrame(tick);
  }, [dragging, x, y, setPoint]);

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        active.current = false;
        dragControls.cancel();
        setDragging(false);
        setDragged(null);
        setPoint(null);
        setSlot(null);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => window.removeEventListener('keydown', handleEscape);
  }, [dragging, setDragged, setPoint, setSlot, dragControls]);

  return {
    dragging,
    triggerProps,
    preview,
    initialPreview: {
      x: x.get(),
      y: y.get(),
      width: grab.current.width,
      height: grab.current.height,
    },
  };
};
