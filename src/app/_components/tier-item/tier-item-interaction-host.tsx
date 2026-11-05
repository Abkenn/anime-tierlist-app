'use client';

import { Menu } from '@base-ui/react/menu';
import { useSetAtom } from 'jotai';
import {
  createContext,
  type PropsWithChildren,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { renamingItemIdAtom } from '@/app/_atoms/tierlist/find.atoms';
import { menuItemIdAtom } from '@/app/_atoms/tierlist/interaction.atoms';
import { useTierBoardActions } from '@/app/_hooks/use-tier-board-actions';

type MenuSession = {
  id: string;
  triggerId?: string;
  changeOpen: (open: boolean) => void;
  origin: (point: { x: number; y: number }) => void;
  locked: () => boolean;
  setRootOpen: (open: boolean) => void;
};

type InteractionHost = {
  claim: (id: string, release: () => void) => boolean;
  register: (session: MenuSession) => () => void;
  open: (value: boolean) => void;
  highlight: (value: boolean) => void;
  show: () => void;
  close: () => void;
  origin: (point: { x: number; y: number }) => void;
  contextMenu: (point: { x: number; y: number }) => void;
  contextRelease: (event: ReactMouseEvent) => void;
  contextEnd: () => void;
  touchStart: (event: TouchEvent) => void;
  touchMove: (event: TouchEvent) => void;
  touchEnd: () => void;
};

export const TierItemInteractionContext = createContext<InteractionHost | null>(
  null,
);

export const TierItemInteractionHost = ({ children }: PropsWithChildren) => {
  const [triggerId, setTriggerId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(true);
  const touch = useRef<{
    x: number;
    y: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const contextPress = useRef<{
    x: number;
    y: number;
    started: number;
    abort: AbortController;
  } | null>(null);
  const endContext = () => {
    contextPress.current?.abort.abort();
    contextPress.current = null;
  };
  const { clearEditingItem, setEditingItem } = useTierBoardActions();
  const setMenuItem = useSetAtom(menuItemIdAtom);
  const setRenamingItem = useSetAtom(renamingItemIdAtom);
  const owner = useRef<{ id: string; release: () => void } | null>(null);
  const menu = useRef<MenuSession | null>(null);
  const [host] = useState<InteractionHost>(() => ({
    claim: (id, release) => {
      if (owner.current?.id === id) {
        owner.current.release = release;
        return true;
      }
      if (menu.current?.locked()) {
        return false;
      }
      clearEditingItem();
      owner.current?.release();
      owner.current = { id, release };
      return true;
    },
    register: (session) => {
      menu.current = session;
      setTriggerId(session.triggerId ?? null);
      return () => {
        if (menu.current === session) {
          menu.current = null;
          setMenuItem((current) => (current === session.id ? null : current));
          setRenamingItem((current) =>
            current === session.id ? null : current,
          );
          setEditingItem({ id: session.id, editing: false });
          if (owner.current?.id === session.id) {
            owner.current = null;
          }
          if (touch.current) {
            clearTimeout(touch.current.timer);
            touch.current = null;
          }
          endContext();
          setOpen(false);
          setTriggerId(null);
        }
      };
    },
    open: (value) => {
      if (!value) {
        endContext();
      }
      setOpen(value);
      menu.current?.setRootOpen(value);
    },
    highlight: setHighlight,
    show: () => menu.current?.changeOpen(true),
    close: () => menu.current?.changeOpen(false),
    origin: (point) => menu.current?.origin(point),
    contextEnd: endContext,
    contextMenu: (point) => {
      endContext();
      const press = {
        ...point,
        started: performance.now(),
        abort: new AbortController(),
      };
      contextPress.current = press;
      document.addEventListener(
        'mouseup',
        (event) => {
          const inside =
            event.target instanceof Element &&
            event.target.closest('[data-slot="context-menu-content"]');
          if (!inside) {
            endContext();
            if (performance.now() - press.started >= 500) {
              menu.current?.changeOpen(false);
            }
          }
        },
        { once: true, capture: true, signal: press.abort.signal },
      );
      menu.current?.origin(point);
      menu.current?.changeOpen(true);
    },
    contextRelease: (event) => {
      // Context menus do not use the standard Menu trigger's left-drag selection.
      event.stopPropagation();
      const press = contextPress.current;
      endContext();
      if (
        !press ||
        event.button !== 2 ||
        !/Macintosh|MacIntel/u.test(navigator.userAgent) ||
        (Math.abs(event.clientX - press.x) <= 1 &&
          Math.abs(event.clientY - press.y) <= 1)
      ) {
        return;
      }
      const item =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[role="menuitem"]')
          : null;
      if (item && item.getAttribute('aria-disabled') !== 'true') {
        item.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            detail: 1,
            clientX: event.clientX,
            clientY: event.clientY,
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
          }),
        );
      }
    },
    touchEnd: () => {
      if (touch.current) {
        clearTimeout(touch.current.timer);
      }
      touch.current = null;
    },
    touchStart: (event) => {
      if (touch.current) {
        clearTimeout(touch.current.timer);
      }
      touch.current = null;
      if (event.touches.length !== 1) {
        return;
      }
      event.stopPropagation();
      const point = event.touches[0];
      const x = point.clientX;
      const y = point.clientY;
      touch.current = {
        x,
        y,
        timer: setTimeout(() => {
          menu.current?.origin({ x, y });
          menu.current?.changeOpen(true);
        }, 500),
      };
    },
    touchMove: (event) => {
      const point = event.touches[0];
      if (
        touch.current &&
        (event.touches.length !== 1 ||
          Math.abs(point.clientX - touch.current.x) > 10 ||
          Math.abs(point.clientY - touch.current.y) > 10)
      ) {
        clearTimeout(touch.current.timer);
        touch.current = null;
      }
    },
  }));

  useEffect(
    () => () => {
      host.touchEnd();
      host.contextEnd();
    },
    [host],
  );

  return (
    <TierItemInteractionContext value={host}>
      <Menu.Root
        triggerId={triggerId}
        open={open}
        highlightItemOnHover={highlight}
        onOpenChange={(next) => menu.current?.changeOpen(next)}
      >
        {children}
      </Menu.Root>
    </TierItemInteractionContext>
  );
};
