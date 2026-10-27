'use client';

import { Dialog } from '@base-ui/react/dialog';
import { Copy, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import {
  startTransition,
  useActionState,
  useEffect,
  useEffectEvent,
  useState,
} from 'react';
import { preload } from 'react-dom';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { FormSubmitButton } from '@/app/_components/ui/form-submit-button';
import { Skeleton } from '@/app/_components/ui/skeleton';
import {
  keyboardBehaviors,
  matchesKeyboardBehavior,
} from '@/app/_lib/keybindings';
import { copyPreviewLink } from '@/app/_lib/preview-clipboard';
import type { TierlistDocument } from '@/app/_lib/tierlist-sync';

type PreparedShare = {
  seed: string;
  ownerId: string;
  revision: number;
};
type SaveShareProps = {
  document?: TierlistDocument;
  disabled: boolean;
  onPrepare: () => Promise<PreparedShare>;
  onPublish: (share: PreparedShare) => Promise<string>;
};

export const SaveShare = ({
  document,
  disabled,
  onPrepare,
  onPublish,
}: SaveShareProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const reducedMotion = useReducedMotion();
  const [prepared, prepare, preparing] = useActionState(
    async () => {
      let share: PreparedShare | null = null;
      try {
        share = await onPrepare();
        const url = await onPublish(share);

        return { share, url, error: '' };
      } catch (error) {
        return {
          share,
          url: '',
          error:
            error instanceof Error
              ? error.message
              : 'Unable to prepare sharing.',
        };
      }
    },
    { share: null as PreparedShare | null, url: '', error: '' },
  );
  const [download, downloadAction, downloading] = useActionState(
    async (_previous: string, form: FormData) => {
      try {
        const { downloadTierlistPng, downloadTierlistProject } = await import(
          '@/app/_services/tierlist-download'
        );
        if (form.get('format') === 'project') {
          if (!prepared.share || preparing) {
            throw new Error('Wait for your seed to be ready.');
          }
          downloadTierlistProject(prepared.share.seed);

          return '';
        }
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
    },
    '',
  );

  if (prepared.url && !preparing) {
    preload(
      `/api/tierlist-preview/${new URL(prepared.url).pathname.slice(1)}/image`,
      { as: 'image', fetchPriority: 'high' },
    );
  }

  const changeOpen = (value: boolean) => {
    if (downloading && !value) {
      return;
    }
    setOpen(value);
    if (value && !open) {
      setCopied('');
      startTransition(prepare);
    }
  };
  const handleShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (matchesKeyboardBehavior(event, keyboardBehaviors.save)) {
      event.preventDefault();
      if (!disabled) {
        changeOpen(true);
      }
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', handleShortcut);

    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${label} copied`);
    } catch {
      setCopied('Select the text to copy it.');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger
        disabled={disabled}
        className="min-h-9 cursor-pointer font-medium text-foreground underline decoration-current/70 underline-offset-4 hover:decoration-current disabled:opacity-50"
      >
        Save &amp; Share
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-background/60" />

        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-96 max-w-[calc(100vw-2rem)] -translate-1/2 border border-divider bg-popover p-4 text-xs text-popover-foreground shadow-md">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <Dialog.Title className="text-sm font-medium">
                Save &amp; Share
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
              Keep your seed, or share a read-only link.
            </Dialog.Description>

            {preparing && (
              <div aria-busy="true" className="space-y-2">
                <p>Seed</p>
                <Skeleton className="h-11 w-full" />
              </div>
            )}

            {!preparing && prepared.share && (
              <label className="block space-y-2">
                Seed
                <span className="relative block">
                  <input
                    name="tierlist-seed"
                    aria-label="Tierlist seed"
                    readOnly
                    value={prepared.share.seed}
                    className="h-11 w-full border border-input bg-transparent px-3 pr-10"
                  />
                  <button
                    type="button"
                    aria-label="Copy tierlist seed"
                    onClick={() =>
                      void copy(prepared.share?.seed ?? '', 'Seed')
                    }
                    className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center hover:bg-accent"
                  >
                    <Copy className="size-4" />
                  </button>
                </span>
              </label>
            )}

            {!preparing && prepared.error && (
              <p role="status">{prepared.error}</p>
            )}

            <div className="mt-4 border-t border-divider pt-3">
              {!preparing && prepared.url ? (
                <Link
                  href={prepared.url}
                  prefetch={true}
                  scroll={false}
                  onClick={(event) =>
                    void copyPreviewLink(
                      prepared.url,
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
                      void copyPreviewLink(prepared.url, false);
                    }
                  }}
                  className="inline-flex min-h-9 items-center underline underline-offset-4 hover:text-muted-foreground"
                >
                  Open Preview
                </Link>
              ) : null}

              {preparing && (
                <p
                  role="status"
                  className="flex min-h-9 items-center text-muted-foreground"
                >
                  <TerminalText text="Preparing preview..." />
                </p>
              )}
            </div>

            <form
              action={downloadAction}
              className="mt-4 flex flex-wrap gap-4 border-t border-divider pt-3"
            >
              <FormSubmitButton
                name="format"
                value="project"
                disabled={!prepared.share || preparing || downloading}
                pendingLabel="Saving..."
                className="min-h-9 cursor-pointer underline underline-offset-4 disabled:opacity-50"
              >
                Save project
              </FormSubmitButton>

              {prepared.url && !preparing ? (
                <a
                  href={`/api/tierlist-preview/${new URL(prepared.url).pathname.slice(1)}/image?download=1`}
                  download="tierlist.png"
                  className="inline-flex min-h-9 items-center underline underline-offset-4"
                >
                  Download as PNG
                </a>
              ) : (
                <FormSubmitButton
                  name="format"
                  value="png"
                  disabled={!document || preparing || downloading}
                  pendingLabel="Exporting..."
                  className="min-h-9 cursor-pointer underline underline-offset-4 disabled:opacity-50"
                >
                  Download as PNG
                </FormSubmitButton>
              )}
            </form>

            {(download || copied) && (
              <p role="status" className="mt-2 text-muted-foreground">
                {download || copied}
              </p>
            )}
          </motion.div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
