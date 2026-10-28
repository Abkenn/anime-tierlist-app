'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { PropsWithChildren } from 'react';
import { usePreviewReturn } from '@/app/_hooks/use-preview-return';

export const PreviewPageFrame = ({ children }: PropsWithChildren) => {
  const { returning, finishReturn } = usePreviewReturn();
  const reducedMotion = useReducedMotion();

  return (
    <motion.main
      data-preview-page=""
      className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-8 lg:px-6"
      initial={false}
      animate={
        returning
          ? { opacity: 0, scale: 0.99, y: 4 }
          : { opacity: 1, scale: 1, y: 0 }
      }
      transition={{ duration: reducedMotion ? 0 : 0.18, ease: 'easeOut' }}
      onAnimationComplete={(definition) => {
        if (
          returning &&
          typeof definition === 'object' &&
          'scale' in definition &&
          definition.scale === 0.99
        ) {
          finishReturn();
        }
      }}
    >
      {children}
    </motion.main>
  );
};
