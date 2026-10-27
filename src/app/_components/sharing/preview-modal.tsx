'use client';

import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import type { PropsWithChildren } from 'react';

export const PreviewModal = ({ children }: PropsWithChildren) => {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) {
          router.back();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-60 bg-background/75 backdrop-blur-xs" />

        <Dialog.Popup
          render={
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            />
          }
          className="fixed left-1/2 top-1/2 z-60 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-7xl -translate-1/2 flex-col border border-divider bg-popover p-4 text-popover-foreground shadow-md"
        >
          <div className="mb-3 flex shrink-0 items-center justify-between gap-4">
            <Dialog.Title className="text-sm font-medium">
              Tierlist preview
            </Dialog.Title>

            <Dialog.Close
              aria-label="Close preview"
              className="flex size-9 cursor-pointer items-center justify-center hover:bg-accent focus-visible:outline-2"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <Dialog.Description className="sr-only">
            Read-only preview. Close to return to Save &amp; Share.
          </Dialog.Description>

          <div className="min-h-0 overflow-y-auto overscroll-contain">
            {children}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
