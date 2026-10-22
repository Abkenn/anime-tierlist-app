'use client';

import { ContextMenu as Primitive } from '@base-ui/react/context-menu';
import { cn } from 'cn';

export const ContextMenuItem = ({
  className,
  ...props
}: Primitive.Item.Props) => (
  <Primitive.Item
    data-slot="context-menu-item"
    className={cn(
      'relative flex min-h-9 cursor-default items-center gap-1.5 rounded-md px-2 py-1 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
      className,
    )}
    {...props}
  />
);
