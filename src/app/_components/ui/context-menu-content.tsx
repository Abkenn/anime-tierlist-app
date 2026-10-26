'use client';

import { ContextMenu as Primitive } from '@base-ui/react/context-menu';
import { cn } from 'cn';
import { animate, motion, useReducedMotion } from 'motion/react';
import { useCallback } from 'react';

type ContextMenuContentProps = Primitive.Popup.Props & {
  positionerProps?: Primitive.Positioner.Props;
  spawnFrom?: { x: number; y: number };
};

export const ContextMenuContent = ({
  className,
  positionerProps,
  spawnFrom,
  ...props
}: ContextMenuContentProps) => {
  const reducedMotion = useReducedMotion();
  const surface = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element || !spawnFrom || reducedMotion) {
        return;
      }

      const frame = requestAnimationFrame(() => {
        const bounds = element.getBoundingClientRect();
        void animate(
          element,
          {
            x: [spawnFrom.x - bounds.left, 0],
            y: [spawnFrom.y - bounds.top, 0],
            scale: [0.96, 1],
            opacity: [0, 1],
          },
          { duration: 0.18, ease: 'easeOut' },
        );
      });

      return () => cancelAnimationFrame(frame);
    },
    [spawnFrom, reducedMotion],
  );

  return (
    <Primitive.Portal>
      <Primitive.Positioner
        className="isolate z-50 outline-none"
        side="right"
        align="start"
        alignOffset={4}
        {...positionerProps}
      >
        <Primitive.Popup
          render={
            spawnFrom ? (
              <motion.div
                ref={surface}
                initial={{ opacity: reducedMotion ? 1 : 0 }}
              />
            ) : undefined
          }
          data-slot="context-menu-content"
          className={cn(
            'z-50 max-h-(--available-height) min-w-44 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-100 motion-reduce:animate-none',
            className,
            spawnFrom && 'animate-none',
          )}
          {...props}
        />
      </Primitive.Positioner>
    </Primitive.Portal>
  );
};
