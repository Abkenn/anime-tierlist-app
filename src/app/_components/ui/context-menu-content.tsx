'use client';

import { ContextMenu as Primitive } from '@base-ui/react/context-menu';
import { cn } from 'cn';

type ContextMenuContentProps = Primitive.Popup.Props & {
  positionerProps?: Primitive.Positioner.Props;
};

export const ContextMenuContent = ({
  className,
  positionerProps,
  ...props
}: ContextMenuContentProps) => (
  <Primitive.Portal>
    <Primitive.Positioner
      className="isolate z-50 outline-none"
      side="right"
      align="start"
      alignOffset={4}
      {...positionerProps}
    >
      <Primitive.Popup
        data-slot="context-menu-content"
        className={cn(
          'z-50 max-h-(--available-height) min-w-44 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-100 motion-reduce:animate-none',
          className,
        )}
        {...props}
      />
    </Primitive.Positioner>
  </Primitive.Portal>
);
