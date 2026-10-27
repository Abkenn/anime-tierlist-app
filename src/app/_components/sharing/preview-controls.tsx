'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { SeedReplaceConfirmation } from '@/app/_components/home/seed-replace-confirmation';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { FormSubmitButton } from '@/app/_components/ui/form-submit-button';
import { toast } from '@/app/_components/ui/toast';
import { createUserSeed, type LocalTierlist } from '@/app/_lib/local-tierlist';
import { defaultTierRanks } from '@/app/_lib/tier-ranks';
import type { TierlistDocument } from '@/app/_lib/tierlist-sync';
import {
  adoptPublicTierlist,
  getDeviceTierlist,
  loadLocalTierlist,
} from '@/app/_services/local-tierlist';
import { copyPreviewPng } from '@/app/_services/preview-clipboard';
import { disconnectTierlist } from '@/app/_services/tierlist.actions';
import { copyShareSeed } from '@/app/_services/tierlist-share.actions';

export const PreviewControls = ({
  id,
  document,
  isOwner,
}: {
  id: string;
  document: TierlistDocument;
  isOwner: boolean;
}) => {
  const router = useRouter();
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
        await loadLocalTierlist({
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
  }, []);

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

  const adoptCopy = async () => {
    if (!local) {
      return;
    }
    try {
      await adoptPublicTierlist(document, local);
      try {
        await disconnectTierlist();
      } catch {
        /* Local copying also works without an online session. */
      }
      router.push('/?profile=local');
    } catch {
      setError(
        'Your local tierlist changed. Reopen this page before replacing it.',
      );
    }
  };
  const [copyError, copyAction, copying] = useActionState(async () => {
    await adoptCopy();
    return '';
  }, '');

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="border border-umber/50 bg-lemon-cream px-3 py-2 text-brown dark:bg-olive dark:text-lemon-cream">
        <span className="mr-3 font-medium">You’re in preview mode.</span>
        {isOwner ? (
          <Link
            href="/"
            className="inline-flex min-h-9 items-center underline underline-offset-4"
          >
            Go to edit mode
          </Link>
        ) : (
          <form action={copyAction} className="inline">
            <FormSubmitButton
              disabled={!local || copying}
              onClick={(event) => {
                if (local?.items.length) {
                  event.preventDefault();
                  setConfirm(true);
                }
              }}
              className="min-h-9 cursor-pointer underline underline-offset-4 disabled:opacity-50"
              pendingLabel="Opening..."
            >
              {local?.items.length
                ? 'Replace your local tierlist with this'
                : 'Go to edit mode'}
            </FormSubmitButton>
          </form>
        )}
      </div>

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
        target="device"
        busy={copying}
        onOpenChange={setConfirm}
        onConfirm={adoptCopy}
      />
    </div>
  );
};
