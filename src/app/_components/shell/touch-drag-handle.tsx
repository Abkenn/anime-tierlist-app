import { GripVertical } from 'lucide-react';

export const TouchDragHandle = () => (
  <span
    data-touch-drag-handle=""
    aria-hidden="true"
    className="absolute right-0 top-0 z-40 hidden size-11 touch-none items-center justify-center bg-background/65 text-foreground pointer-coarse:flex"
  >
    <GripVertical className="pointer-events-none size-5" />
  </span>
);
