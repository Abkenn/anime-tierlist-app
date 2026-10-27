'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';
import { useProjectDrop } from '@/app/_hooks/use-project-drop';

export const AppFrame = ({
  children,
  className,
}: PropsWithChildren<{ className: string }>) => {
  const draggingFile = useProjectDrop();
  const reducedMotion = useReducedMotion();

  return (
    <div className={className}>
      {children}

      {typeof window !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {draggingFile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.16 }}
                className="pointer-events-none fixed inset-0 z-100 flex items-center justify-center bg-background/75 p-4 backdrop-blur-xs"
              >
                <div
                  role="status"
                  className="flex size-full items-center justify-center border border-dashed border-foreground/40"
                >
                  <p className="bg-background/90 px-5 py-3 text-sm text-foreground shadow-sm">
                    Drop an .anime file to open your tierlist
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          window.document.body,
        )}
    </div>
  );
};
