'use client';

import { Dialog } from '@base-ui/react/dialog';
import { Share2, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useActionState, useEffect, useState } from 'react';
import { preload } from 'react-dom';
import { TerminalPending } from '@/app/_components/shell/terminal-pending';
import { FormSubmitButton } from '@/app/_components/ui/form-submit-button';
import {
  keyboardBehaviors,
  matchesKeyboardBehavior,
} from '@/app/_lib/keybindings';
import {
  copyPendingPreviewLink,
  copyPreviewLink,
} from '@/app/_lib/preview-clipboard';
import { createSharingCache } from '@/app/_lib/sharing-cache';
import { previewMaximizeEvent } from '@/app/_lib/tierlist-share-id';
import type { TierlistDocument } from '@/app/_lib/tierlist-sync';

type SaveShareProps = {
  document?: TierlistDocument;
  disabled: boolean;
  revision?: number;
  onPublish: () => Promise<string>;
};

export const SaveShare = ({
  document,
  disabled,
  revision = 0,
  onPublish,
}: SaveShareProps) => {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [cache] = useState(createSharingCache);
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const input = { revision, onPublish };
  const [prepared, prepare, preparing] = useActionState(
    async () => {
      try {
        return { url: await cache.preview(input), error: '', revision };
      } catch (error) {
        return {
          url: '',
          revision,
          error:
            error instanceof Error
              ? error.message
              : 'Unable to prepare sharing.',
        };
      }
    },
    { url: '', error: '', revision: -1 },
  );
  const current = prepared.revision === revision;
  const publishedUrl = current ? prepared.url : '';

  useEffect(() => {
    if (open && opening && publishedUrl) {
      setOpening(false);
      router.push(publishedUrl, { scroll: false });
    } else if (opening && !preparing && prepared.error) {
      setOpening(false);
    }
  }, [open, opening, publishedUrl, preparing, prepared.error, router]);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener(previewMaximizeEvent, close);

    return () => window.removeEventListener(previewMaximizeEvent, close);
  }, []);

  const openPreview = () => {
    setOpening(true);
    void copyPendingPreviewLink(cache.preview(input));
    startTransition(() => prepare());
  };

  const [download, downloadAction, downloading] = useActionState(async () => {
    try {
      const { downloadTierlistPng } = await import(
        '@/app/_services/tierlist-download'
      );
      if (!document) {
        throw new Error('Wait for your tierlist to load.');
      }
      const missing = await downloadTierlistPng(document);

      return missing
        ? `${missing} posters could not be exported. Their labels are included instead.`
        : '';
    } catch (error) {
      return error instanceof Error ? error.message : 'Unable to download.';
    }
  }, '');

  if (publishedUrl) {
    preload(
      `/api/tierlist-preview/${new URL(publishedUrl).pathname.slice(1)}/image`,
      { as: 'image', fetchPriority: 'high' },
    );
  }

  const changeOpen = (value: boolean) => {
    if (downloading && !value) {
      return;
    }
    setOpen(value);
    if (!value) {
      setOpening(false);
    }
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
                <Dialog.Title className="text-sm font-medium">
                  Share tierlist
                </Dialog.Title>

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

              {current && prepared.error && (
                <p role="status">{prepared.error}</p>
              )}

              <div className="mt-4 border-t border-divider pt-3">
                {publishedUrl ? (
                  <Link
                    href={publishedUrl}
                    prefetch={true}
                    scroll={false}
                    onClick={(event) =>
                      void copyPreviewLink(
                        publishedUrl,
                        !(
                          event.ctrlKey ||
                          event.metaKey ||
                          event.shiftKey ||
                          event.altKey
                        ),
                      )
                    }
                    onAuxClick={(event) => {
                      if (event.button === 1) {
                        void copyPreviewLink(publishedUrl, false);
                      }
                    }}
                    className="inline-flex min-h-9 items-center underline underline-offset-4 hover:text-muted-foreground"
                  >
                    Open Preview
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={opening}
                    onClick={openPreview}
                    className="inline-flex min-h-9 cursor-pointer items-center underline underline-offset-4 disabled:cursor-wait disabled:opacity-70"
                  >
                    {opening ? (
                      <TerminalPending text="Opening preview" />
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
