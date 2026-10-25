'use client';

import { cn } from 'cn';
import { type HTMLMotionProps, motion, useReducedMotion } from 'motion/react';

export const Skeleton = ({ className, ...props }: HTMLMotionProps<'div'>) => {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      {...props}
      aria-hidden="true"
      data-slot="skeleton"
      className={cn('rounded-xs bg-muted', className)}
      animate={{ opacity: reducedMotion ? 1 : [0.5, 1, 0.5] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
};
