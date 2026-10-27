'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

const TooltipProvider = ({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) => (
  <TooltipPrimitive.Provider
    data-slot="tooltip-provider"
    delay={delay}
    {...props}
  />
);

export { TooltipProvider };
