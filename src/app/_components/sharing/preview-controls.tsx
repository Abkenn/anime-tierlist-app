'use client';

import { motion, useAnimationControls, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useEffectEvent, useState } from 'react';
import { SeedReplaceConfirmation } from '@/app/_components/home/seed-replace-confirmation';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { FormSubmitButton } from '@/app/_components/ui/form-submit-button';
import { toast } from '@/app/_components/ui/toast';
import { createUserSeed, type LocalTierlist } from '@/app/_lib/local-tierlist';
import { defaultTierRanks } from '@/app/_lib/tier-ranks';
import {
  previewDragEndedEvent,
  previewReturnEvent,
} from '@/app/_lib/tierlist-share-id';
import type { TierlistDocument } from '@/app/_lib/tierlist-sync';
import {
  getTierlistDocument,
  sameTierlistDocument,
} from '@/app/_lib/tierlist-sync';
import {
  getDeviceTierlist,
  loadLocalTierlist,
  readLocalTierlist,
} from '@/app/_services/local-tierlist';
import { copyPreviewPng } from '@/app/_services/preview-clipboard';
import {
  adoptPreviewTemplate,
  type PreviewAccount,
} from '@/app/_services/preview-template';
import { copyShareSeed } from '@/app/_services/tierlist-share.actions';

export const PreviewControls = ({
  id,
  document,
  isOwner,
  account,
}: {
  id: string;
  document: TierlistDocument;
  isOwner: boolean;
  account?: PreviewAccount;
}) => {
  const router = useRouter();
  const notice = useAnimationControls();
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState<LocalTierlist>();
  const [local, setLocal] = useState<LocalTierlist>();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [copyingPng, setCopyingPng] = useState(false);
  const [message, download, downloading] = useActionState(
    async (_previous: string, form: FormData) => {
      try {
        const { downloadTierlistProject } = await import(
          '@/app/_services/tierlist-download'
        );
        if (form.get('format') === 'project') {
          const result = await copyShareSeed(id);
          if (!result.ok) {
            throw new Error(result.message);
          }
          downloadTierlistProject(result.value);

          return '';
        }
        return '';
      } catch {
        return 'Unable to export this tierlist on this device.';
      }
    },
    '',
  );

  useEffect(() => {
    let active = true;
    const readLocal = async () => {
      try {
        const profile = await loadLocalTierlist({
          version: 1,
          seed: createUserSeed(),
          revision: 0,
          items: [],
          ranks: defaultTierRanks,
          imageMode: 'natural',
        });
        const snapshot = await getDeviceTierlist();
        if (active) {
          setLocal(snapshot);
          const accountProfile = account
            ? await readLocalTierlist(account.profileKey).catch(() => undefined)
            : undefined;
          if (active) {
            setActive(accountProfile ?? profile);
          }
        }
      } catch {
        if (active) {
          setError('Local storage is unavailable.');
        }
      }
    };
    void readLocal();

    return () => {
      active = false;
    };
  }, [account]);

  const nudge = useEffectEvent((event: Event) => {
    if (
      event instanceof CustomEvent &&
      event.detail === id.split('.')[0] &&
      !reducedMotion
    ) {
      void notice.start({
        x: [0, -10, 10, -8, 8, -4, 4, 0],
        transition: { duration: 0.48 },
      });
    }
  });

  useEffect(() => {
    window.addEventListener(previewDragEndedEvent, nudge);

    return () => window.removeEventListener(previewDragEndedEvent, nudge);
  }, []);

  const replacingExisting = account
    ? account.hasItems ||
      (active?.accountOwnerId === account.ownerId && active.items.length > 0)
    : Boolean(local?.items.length);

  const copyPng = async () => {
    setCopyingPng(true);
    try {
      await copyPreviewPng(id);
      toast.add({ title: 'PNG copied to clipboard', timeout: 5000 });
    } catch (error) {
      toast.add({
        title:
          error instanceof Error ? error.message : 'Unable to copy the PNG.',
        timeout: 5000,
      });
    } finally {
      setCopyingPng(false);
    }
  };

  const requestReturn = (destination: string) =>
    !window.dispatchEvent(
      new CustomEvent(previewReturnEvent, {
        cancelable: true,
        detail: destination,
      }),
    );

  const adoptCopy = async () => {
    if (!local) {
      return;
    }
    try {
      const destination = await adoptPreviewTemplate({
        id,
        document,
        local,
        active,
        account,
      });
      if (!requestReturn(destination)) {
        router.push(destination);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to open this template.',
      );
    }
  };
  const [copyError, copyAction, copying] = useActionState(async () => {
    await adoptCopy();
    return '';
  }, '');

  return (
    <div className="sticky top-0 z-20 mb-3 flex flex-wrap items-center justify-between gap-3 bg-background py-2 text-xs">
      <motion.div
        animate={notice}
        className="border border-umber/50 bg-lemon-cream px-3 py-2 text-brown dark:bg-olive dark:text-lemon-cream"
        data-preview-notice=""
      >
        <span className="mr-3 font-medium">You’re in preview mode.</span>
        {isOwner ||
        (active?.items.length &&
          sameTierlistDocument(getTierlistDocument(active), document)) ? (
          <Link
            href="/"
            onNavigate={(event) => {
              if (requestReturn('/')) {
                event.preventDefault();
              }
            }}
            className="inline-flex min-h-9 items-center underline underline-offset-4"
          >
            Go to edit mode
          </Link>
        ) : (
          <form
            action={copyAction}
            className="inline-flex flex-wrap items-center gap-x-4"
          >
            <Link
              href="/"
              onNavigate={(event) => {
                if (requestReturn('/')) {
                  event.preventDefault();
                }
              }}
              className="inline-flex min-h-9 items-center underline underline-offset-4"
            >
              {active?.items.length || account
                ? 'Back to your tierlist'
                : 'Create your own tierlist'}
            </Link>

            <FormSubmitButton
              disabled={!local || copying}
              onClick={(event) => {
                if (replacingExisting) {
                  event.preventDefault();
                  setConfirm(true);
                }
              }}
              className="min-h-9 cursor-pointer underline underline-offset-4 disabled:opacity-50"
              pendingLabel="Opening..."
            >
              Use as a template
            </FormSubmitButton>
          </form>
        )}
      </motion.div>

      <form
        action={download}
        className="flex flex-wrap items-center gap-x-4 gap-y-1"
      >
        <FormSubmitButton
          name="format"
          value="project"
          disabled={downloading}
          pendingLabel="Saving..."
          className="min-h-9 cursor-pointer underline underline-offset-4"
        >
          Save project
        </FormSubmitButton>

        <button
          type="button"
          disabled={copyingPng}
          onClick={() => void copyPng()}
          className="min-h-9 cursor-pointer underline underline-offset-4 disabled:opacity-50"
        >
          {copyingPng ? 'Copying PNG...' : 'Copy PNG'}
        </button>

        <a
          href={`/api/tierlist-preview/${id}/image?download=1`}
          download="tierlist.png"
          className="inline-flex min-h-9 items-center underline underline-offset-4"
        >
          Download as PNG
        </a>
      </form>

      {(error || message || copyError) && (
        <p role="status" className="w-full">
          <TerminalText text={error || message || copyError} />
        </p>
      )}

      <SeedReplaceConfirmation
        open={confirm}
        target={account ? 'account' : 'device'}
        busy={copying}
        onOpenChange={setConfirm}
        onConfirm={adoptCopy}
      />
    </div>
  );
};
