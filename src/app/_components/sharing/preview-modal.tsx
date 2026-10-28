'use client';

import { Dialog } from '@base-ui/react/dialog';
import { Maximize2, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type PropsWithChildren,
  Suspense,
  startTransition,
  use,
  useLayoutEffect,
  useState,
} from 'react';
import { usePreviewReturn } from '@/app/_hooks/use-preview-return';
import { previewLeaveEvent } from '@/app/_lib/tierlist-share-id';

type PreviewParams = Promise<{ shareId: string }>;

type MaximizePreviewProps = {
  params: PreviewParams;
  onMaximize: () => void;
};

const MaximizePreview = ({ params, onMaximize }: MaximizePreviewProps) => {
  const { shareId } = use(params);

  return (
    <Link
      href={`/preview/${shareId}`}
      prefetch={true}
      replace
      aria-label="Maximize preview"
      title="Open full page"
      onNavigate={onMaximize}
      className="flex size-9 items-center justify-center hover:bg-accent focus-visible:outline-2"
    >
      <Maximize2 aria-hidden="true" className="size-4" />
    </Link>
  );
};

export const PreviewModal = ({
  children,
  params,
}: PropsWithChildren<{ params: PreviewParams }>) => {
  const router = useRouter();
  const [visibility, setVisibility] = useState({
    navigation: router.bfcacheId,
    open: true,
  });
  const { returning: leaving, finishReturn } = usePreviewReturn(() => {
    setVisibility({ navigation: router.bfcacheId, open: false });
  });

  const reducedMotion = useReducedMotion();
  const open = visibility.navigation !== router.bfcacheId || visibility.open;

  // Next retains inactive routes; reopen before paint on a restored visit.
  useLayoutEffect(() => {
    setVisibility({ navigation: router.bfcacheId, open: true });
  }, [router.bfcacheId]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(open) => {
        if (leaving) {
          return;
        }
        setVisibility({ navigation: router.bfcacheId, open });
        if (!open) {
          router.back();
        }
      }}
    >
      {open && (
        <Dialog.Portal>
          <Dialog.Backdrop
            render={
              <motion.div
                animate={{ opacity: leaving ? 0 : 1 }}
                initial={false}
                transition={{ duration: reducedMotion ? 0 : 0.18 }}
              />
            }
            className="fixed inset-0 z-60 bg-background/75 backdrop-blur-xs"
          />

          <Dialog.Popup
            render={
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={
                  leaving
                    ? { opacity: 0, scale: 0.92, y: 12 }
                    : { opacity: 1, scale: 1, y: 0 }
                }
                transition={{
                  duration: reducedMotion ? 0 : 0.2,
                  ease: 'easeOut',
                }}
                onAnimationComplete={(definition) => {
                  if (
                    leaving &&
                    typeof definition === 'object' &&
                    'scale' in definition &&
                    definition.scale === 0.92
                  ) {
                    finishReturn();
                  }
                }}
              />
            }
            data-preview-modal=""
            className="fixed left-1/2 top-1/2 z-60 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-7xl -translate-1/2 flex-col border border-divider bg-popover p-4 text-popover-foreground shadow-md"
          >
            <div className="mb-3 flex shrink-0 items-center justify-between gap-4">
              <Dialog.Title className="text-sm font-medium">
                Tierlist preview
              </Dialog.Title>

              <div className="flex items-center gap-1">
                <Suspense
                  fallback={
                    <span
                      aria-hidden="true"
                      className="flex size-9 items-center justify-center opacity-40"
                    >
                      <Maximize2 className="size-4" />
                    </span>
                  }
                >
                  <MaximizePreview
                    params={params}
                    onMaximize={() => {
                      startTransition(() => {
                        setVisibility({
                          navigation: router.bfcacheId,
                          open: false,
                        });
                        window.dispatchEvent(new Event(previewLeaveEvent));
                      });
                    }}
                  />
                </Suspense>

                <Dialog.Close
                  aria-label="Close preview"
                  className="flex size-9 cursor-pointer items-center justify-center hover:bg-accent focus-visible:outline-2"
                >
                  <X className="size-4" />
                </Dialog.Close>
              </div>
            </div>

            <Dialog.Description className="sr-only">
              Read-only preview. Close to return to Share.
            </Dialog.Description>

            <div className="min-h-0 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
};
