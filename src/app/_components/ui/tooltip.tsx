'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

const Tooltip = ({ ...props }: TooltipPrimitive.Root.Props) => (
  <TooltipPrimitive.Root data-slot="tooltip" {...props} />
);

export { Tooltip };
