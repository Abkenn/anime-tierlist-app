'use client';

import { ContextMenu as Primitive } from '@base-ui/react/context-menu';
import { cn } from 'cn';
import { CheckIcon } from 'lucide-react';

export const ContextMenuCheckboxItem = ({
  className,
  children,
  ...props
}: Primitive.CheckboxItem.Props) => (
  <Primitive.CheckboxItem
    data-slot="context-menu-checkbox-item"
    className={cn(
      'relative flex min-h-9 cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="pointer-events-none absolute right-2">
      <Primitive.CheckboxItemIndicator>
        <CheckIcon className="size-4" />
      </Primitive.CheckboxItemIndicator>
    </span>

    {children}
  </Primitive.CheckboxItem>
);
