'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { FormSubmitButton } from '@/app/_components/ui/form-submit-button';
import { malImportRanks, malUsernameSchema } from '@/app/_lib/mal-import';
import { tierlistErrorMessage } from '@/app/_lib/tierlist-error';
import type { TierlistDocument } from '@/app/_lib/tierlist-sync';
import type {
  generateMalTierlist,
  MalImportProgress,
} from '@/app/_services/generate-mal-tierlist';

type MalImportProps = {
  busy: boolean;
  seed: string;
  revision: number;
  hasItems: boolean;
  onApply: (
    document: TierlistDocument,
    expected: { seed: string; revision: number },
  ) => Promise<void>;
  onApplied: () => void;
};
type Generated = Awaited<ReturnType<typeof generateMalTierlist>> & {
  expected: { seed: string; revision: number };
};

export const MalImport = ({
  busy,
  seed,
  revision,
  hasItems,
  onApply,
  onApplied,
}: MalImportProps) => {
  const id = useId();
  const reducedMotion = useReducedMotion();
  const controller = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState<MalImportProgress | null>(null);
  const [username, setUsername] = useState('');
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, generate, generating] = useActionState(
    async (_previous: string, form: FormData) => {
      const parsed = malUsernameSchema.safeParse(form.get('username'));
      if (!parsed.success) {
        return 'Enter a valid MAL username (2–16 letters, numbers, underscores or hyphens).';
      }
      const request = new AbortController();
      controller.current = request;
      const expected = { seed, revision };
      setGenerated(null);
      setConfirmed(false);
      try {
        const { generateMalTierlist } = await import(
          '@/app/_services/generate-mal-tierlist'
        );
        const { readLocalTierlist } = await import(
          '@/app/_services/local-tierlist'
        );
        const profile = await readLocalTierlist(seed);
        const result = await generateMalTierlist({
          history: profile.malImport,
          username: parsed.data,
          signal: request.signal,
          onProgress: setProgress,
        });
        setGenerated({ ...result, expected });

        return '';
      } catch (failure) {
        return request.signal.aborted
          ? 'Generation cancelled. Your tierlist is unchanged.'
          : tierlistErrorMessage(
              failure,
              'Unable to generate this tierlist. Try again.',
            );
      } finally {
        setProgress(null);
        controller.current = null;
      }
    },
    '',
  );
  const [applyError, apply, applying] = useActionState(async () => {
    if (!generated || (hasItems && !confirmed)) {
      return '';
    }
    try {
      await onApply(generated.document, generated.expected);
      onApplied();

      return '';
    } catch (failure) {
      return tierlistErrorMessage(
        failure,
        'Your tierlist changed. Generate again before applying.',
      );
    }
  }, '');
  const disabled = busy || generating || applying;

  useEffect(() => () => controller.current?.abort(), []);

  return (
    <section
      aria-label="Import from MyAnimeList"
      className="mt-3 border-t border-divider pt-3"
    >
      <p className="font-medium">Generate a series tierlist from MAL</p>
      <form action={generate} className="mt-3">
        <label htmlFor={id} className="mb-2 block">
          Public MAL username
        </label>
        <input
          id={id}
          name="username"
          required
          minLength={2}
          maxLength={16}
          autoComplete="off"
          spellCheck={false}
          placeholder="Your MAL username"
          value={username}
          onChange={(event) => setUsername(event.currentTarget.value)}
          disabled={disabled}
          className="h-11 w-full border border-input bg-transparent px-3 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        <div className="mt-2 flex items-center gap-4">
          <FormSubmitButton
            disabled={disabled}
            pendingLabel="Generating..."
            className="min-h-9 cursor-pointer border border-divider px-3 hover:bg-accent disabled:opacity-50"
          >
            Generate tierlist
          </FormSubmitButton>
          {generating && (
            <button
              type="button"
              onClick={() => controller.current?.abort()}
              className="min-h-9 cursor-pointer underline underline-offset-4"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      {generating && progress && (
        <div className="mt-3">
          <div className="mb-2 flex justify-between gap-3 text-muted-foreground">
            <span>{progress.phase}</span>
            <span className="tabular-nums">
              {progress.percent === null ? '...' : `${progress.percent}%`}
            </span>
          </div>
          {progress.percent === null ? (
            <progress
              aria-label={progress.phase}
              max={100}
              className="block h-1 w-full appearance-none overflow-hidden bg-foreground/15 [&::-moz-progress-bar]:bg-foreground [&::-webkit-progress-bar]:bg-foreground/15 [&::-webkit-progress-value]:bg-foreground"
            />
          ) : (
            <div
              role="progressbar"
              aria-label={progress.phase}
              aria-valuenow={progress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1 w-full overflow-hidden bg-foreground/15"
            >
              <motion.div
                key={progress.phase}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: progress.percent / 100 }}
                transition={{
                  duration: reducedMotion ? 0 : 0.25,
                  ease: 'easeOut',
                }}
                className="size-full origin-left bg-foreground"
              />
            </div>
          )}
        </div>
      )}
      {!generating && error && (
        <p role="status" className="mt-2">
          <TerminalText text={error} />
        </p>
      )}
      {!generating && generated && (
        <div className="mt-3 border-t border-divider pt-3">
          {generated.unavailablePosters > 0 && (
            <p role="status" className="mt-2 text-muted-foreground">
              {generated.unavailablePosters} posters unavailable.
            </p>
          )}
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            {malImportRanks.map((rank) => (
              <div key={rank} className="contents">
                <dt>{rank}</dt>
                <dd>
                  {
                    generated.document.items.filter(
                      (item) => item.rank === rank,
                    ).length
                  }{' '}
                  series
                </dd>
              </div>
            ))}
          </dl>
          <form action={apply} className="mt-3">
            {hasItems && (
              <label className="mb-3 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={disabled}
                  onChange={(event) =>
                    setConfirmed(event.currentTarget.checked)
                  }
                  className="mt-1"
                />
                Replace my current tierlist with this generated starting point.
              </label>
            )}
            <FormSubmitButton
              disabled={disabled || (hasItems && !confirmed)}
              pendingLabel="Applying..."
              className="min-h-9 cursor-pointer border border-foreground px-3 hover:bg-accent disabled:opacity-50"
            >
              Use generated tierlist
            </FormSubmitButton>
          </form>
          {applyError && (
            <p role="status" className="mt-2">
              <TerminalText text={applyError} />
            </p>
          )}
        </div>
      )}
    </section>
  );
};
