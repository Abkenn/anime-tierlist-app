'use client';

import { Toast } from '@base-ui/react/toast';
import { X } from 'lucide-react';
import { motion, useAnimationControls, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { TerminalSequence } from '@/app/_components/shell/terminal-sequence';
import { TerminalText } from '@/app/_components/shell/terminal-text';

export const toast = Toast.createToastManager();

type ToastMessageProps = { item: Toast.Root.Props['toast']; paused: boolean };

const ToastMessage = ({ item, paused }: ToastMessageProps) => {
  const controls = useAnimationControls();
  const reducedMotion = useReducedMotion();
  const elapsed = useRef(0);
  const title = typeof item.title === 'string' ? item.title : '';
  const action =
    typeof item.actionProps?.children === 'string'
      ? item.actionProps.children
      : '';

  useEffect(() => {
    if (paused || reducedMotion) {
      controls.set({ opacity: 1 });

      return;
    }

    const started = performance.now();
    const remaining = Math.max(0, 6000 - elapsed.current);
    controls.set({ opacity: Math.min(1, remaining / 2000) });
    void controls.start({
      opacity: 0,
      transition: {
        delay: Math.max(0, 4000 - elapsed.current) / 1000,
        duration: Math.min(2000, remaining) / 1000,
        ease: 'linear',
      },
    });

    return () => {
      controls.stop();
      elapsed.current += performance.now() - started;
    };
  }, [paused, reducedMotion, controls]);

  return (
    <Toast.Root
      toast={item}
      render={<motion.div animate={controls} initial={{ opacity: 1 }} />}
      className="flex items-center gap-3 border border-divider/50 bg-background/75 px-3 py-1 text-xs text-foreground shadow-xs backdrop-blur-md data-limited:hidden"
    >
      <TerminalSequence lines={[title, action]}>
        <Toast.Content className="min-w-0 flex-1">
          <Toast.Title className="wrap-break-word">
            {typeof item.title === 'string' ? (
              <TerminalText text={item.title} pending={false} />
            ) : (
              item.title
            )}
          </Toast.Title>
        </Toast.Content>

        {item.actionProps && (
          <Toast.Action
            {...item.actionProps}
            className="min-h-10 shrink-0 cursor-pointer underline underline-offset-4 hover:opacity-80 active:opacity-60"
          >
            {action ? (
              <TerminalText text={action} line={1} pending={false} />
            ) : (
              item.actionProps.children
            )}
          </Toast.Action>
        )}
      </TerminalSequence>

      <Toast.Close
        aria-label="Dismiss notification"
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground active:opacity-60"
      >
        <X aria-hidden="true" className="size-4" />
      </Toast.Close>
    </Toast.Root>
  );
};

const ToastList = () => {
  const { toasts } = Toast.useToastManager();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <Toast.Portal>
      <Toast.Viewport
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setFocused(false);
          }
        }}
        className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-50 mx-auto flex max-w-md flex-col gap-2 outline-none"
      >
        {toasts.map((item) => (
          <ToastMessage key={item.id} item={item} paused={hovered || focused} />
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
};

export const Toaster = () => (
  <Toast.Provider toastManager={toast} timeout={6000} limit={3}>
    <ToastList />
  </Toast.Provider>
);
