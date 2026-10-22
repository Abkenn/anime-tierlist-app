'use client';

import { ContextMenu as Primitive } from '@base-ui/react/context-menu';
import { cn } from 'cn';

export const ContextMenuTrigger = ({
  className,
  ...props
}: Primitive.Trigger.Props) => (
  <Primitive.Trigger
    data-slot="context-menu-trigger"
    className={cn('select-none', className)}
    {...props}
  />
);
