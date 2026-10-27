'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

const TooltipTrigger = ({ ...props }: TooltipPrimitive.Trigger.Props) => (
  <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
);

export { TooltipTrigger };
