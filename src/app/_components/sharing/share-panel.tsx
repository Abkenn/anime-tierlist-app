'use client';

import { Dialog } from '@base-ui/react/dialog';
import { useMachine } from '@xstate/react';
import { Share2, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Link, { useLinkStatus } from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useActionState, useEffect, useEffectEvent, useLayoutEffect, useState } from 'react';
import { TerminalPending } from '@/app/_components/shell/terminal-pending';
import { FormSubmitButton } from '@/app/_components/ui/form-submit-button';
import { isError } from '@/app/_lib/is-error';
import { keyboardBehaviors, matchesKeyboardBehavior } from '@/app/_lib/keybindings';
import { copyPendingPreviewLink, copyPreviewLink } from '@/app/_lib/preview-clipboard';
import { sharePreviewMachine } from '@/app/_lib/share-preview-machine';
import { createSharingCache } from '@/app/_lib/sharing-cache';
import { previewLeaveEvent } from '@/app/_lib/tierlist-share-id';
import type { TierlistDocument } from '@/app/_lib/tierlist-sync';

export type SaveShareProps = {
  document?: TierlistDocument;
  disabled: boolean;
  revision?: number;
  onPublish: () => Promise<string>;
  onFindPreview?: () => Promise<string | null>;
  initialOpen?: boolean;
};

export const SharePanel = ({
  document,
  disabled,
  revision = 0,
  onPublish,
  onFindPreview,
  initialOpen = false,
}: SaveShareProps) => {
  const [open, setOpen] = useState(initialOpen);
  const [cache] = useState(createSharingCache);
  const router = useRouter();
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const input = { revision, onPublish, onFindPreview };
  const [preview, send] = useMachine(
    sharePreviewMachine.provide({
      actions: { openPreview: (_args, url) => router.push(url, { scroll: false }) },
    }),
  );
  const current = preview.context.revision === revision;
  const publishedUrl = current ? preview.context.url : '';
  const generating = current && preview.matches('generating');
  const opening = current && preview.matches('opening');
  const busy = generating || opening;

  const syncPreview = useEffectEvent((isOpen: boolean, revision: number) => {
    if (isOpen) {
      send({ type: 'lookup', revision, task: () => cache.find({ ...input, revision }) });
    } else {
      send({ type: 'close' });
    }
  });

  useLayoutEffect(() => {
    syncPreview(open, revision);
  }, [open, revision]);

  useEffect(() => {
    if (pathname !== '/') {
      send({ type: 'arrived' });
    }

    const close = () => setOpen(false);
    window.addEventListener(previewLeaveEvent, close);

    return () => window.removeEventListener(previewLeaveEvent, close);
  }, [pathname, send]);

  const openPreview = () => {
    const pending = cache.preview(input);
    void copyPendingPreviewLink(pending);
    send({ type: 'generate', task: () => pending });
  };

  const [download, downloadAction, downloading] = useActionState(async () => {
    try {
      const { downloadTierlistPng } = await import('@/app/_services/tierlist-download');
      if (!document) {
        throw new Error('Wait for your tierlist to load.');
      }
      const missing = await downloadTierlistPng(document);

      return missing
        ? `${missing} posters could not be exported. Their labels are included instead.`
        : '';
    } catch (error) {
      return isError(error) ? error.message : 'Unable to download.';
    }
  }, '');

  const changeOpen = (value: boolean) => {
    if (downloading && !value) {
      return;
    }
    setOpen(value);
  };

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger
        disabled={disabled}
        className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-2 border border-foreground/40 px-3 font-medium text-foreground hover:bg-accent active:opacity-70 disabled:opacity-50"
      >
        <Share2 aria-hidden="true" className="size-3.5" />
        Share
      </Dialog.Trigger>

      {open && (
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-background/60" />

          <Dialog.Popup
            onKeyDown={(event) => {
              if (matchesKeyboardBehavior(event, keyboardBehaviors.save)) {
                setOpen(false);
              }
            }}
            className="fixed left-1/2 top-1/2 z-50 w-96 max-w-[calc(100vw-2rem)] -translate-1/2 border border-divider bg-popover p-4 text-xs text-popover-foreground shadow-md"
          >
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <Dialog.Title className="text-sm font-medium">Share tierlist</Dialog.Title>

                <Dialog.Close
                  disabled={downloading}
                  aria-label="Close sharing"
                  className="flex size-9 cursor-pointer items-center justify-center hover:bg-accent disabled:opacity-50"
                >
                  <X className="size-4" />
                </Dialog.Close>
              </div>

              <Dialog.Description className="mb-3 text-muted-foreground">
                Share a read-only preview or PNG.
              </Dialog.Description>

              {current && preview.context.error && <p role="status">{preview.context.error}</p>}

              <div className="mt-4 border-t border-divider pt-3">
                {publishedUrl && !busy ? (
                  <Link
                    href={publishedUrl}
                    prefetch={true}
                    scroll={false}
                    onClick={(event) => {
                      void copyPreviewLink(
                        publishedUrl,
                        !(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey),
                      );
                    }}
                    onAuxClick={(event) => {
                      if (event.button === 1) {
                        void copyPreviewLink(publishedUrl, false);
                      }
                    }}
                    className="inline-flex min-h-9 items-center underline underline-offset-4 hover:text-muted-foreground"
                  >
                    <PreviewLinkLabel />
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={openPreview}
                    className="inline-flex min-h-9 cursor-pointer items-center underline underline-offset-4 disabled:cursor-wait disabled:opacity-70"
                  >
                    {busy ? (
                      <TerminalPending text={opening ? 'Opening preview' : 'Generating preview'} />
                    ) : (
                      'Open Preview'
                    )}
                  </button>
                )}
              </div>

              <form
                action={downloadAction}
                className="mt-4 flex flex-wrap gap-4 border-t border-divider pt-3"
              >
                {publishedUrl ? (
                  <a
                    href={`/api/tierlist-preview/${new URL(publishedUrl).pathname.slice(1)}/image?download=1`}
                    download="tierlist.png"
                    className="inline-flex min-h-9 items-center underline underline-offset-4"
                  >
                    Download as PNG
                  </a>
                ) : (
                  <FormSubmitButton
                    name="format"
                    value="png"
                    disabled={!document || downloading}
                    pendingLabel="Exporting..."
                    className="min-h-9 cursor-pointer underline underline-offset-4 disabled:opacity-50"
                  >
                    Download as PNG
                  </FormSubmitButton>
                )}
              </form>

              {download && (
                <p role="status" className="mt-2 text-muted-foreground">
                  {download}
                </p>
              )}
            </motion.div>
          </Dialog.Popup>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
};

const PreviewLinkLabel = () => {
  const { pending } = useLinkStatus();

  return pending ? <TerminalPending text="Opening preview" /> : 'Open Preview';
};
