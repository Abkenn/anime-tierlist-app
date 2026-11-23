'use client';

import { useMachine } from '@xstate/react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useState } from 'react';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { SegmentedControl } from '@/app/_components/ui/segmented-control';
import type { ImportProvider } from '@/app/_lib/anime-import';
import { animeImportMachine } from '@/app/_lib/anime-import-machine';
import type { TierlistDocument } from '@/app/_lib/tierlist-sync';

type AnimeImportProps = {
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

export const AnimeImport = ({
  busy,
  seed,
  revision,
  hasItems,
  onApply,
  onApplied,
}: AnimeImportProps) => {
  const id = useId();
  const reducedMotion = useReducedMotion();
  const [state, send] = useMachine(animeImportMachine);
  const [provider, setProvider] = useState<ImportProvider>('mal');
  const [usernames, setUsernames] = useState({ mal: '', anilist: '' });
  const username = usernames[provider];
  const providerLabel = provider === 'mal' ? 'MAL' : 'AniList';
  const {
    progress,
    result: generated,
    resumeAvailable: resumable,
    error,
    applyError,
  } = state.context;
  const generating = state.hasTag('generating');
  const applying = state.hasTag('applying');
  const confirmed = state.matches({ reviewing: 'confirmed' });
  const disabled = busy || generating || applying;
  const generateLabel = resumable && !generated ? 'Resume import' : 'Generate tierlist';
  const generationError = !generating && state.context.request?.provider === provider ? error : '';

  const generate = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    send({ type: 'GENERATE', request: { seed, revision, provider, username }, busy });
  };

  const apply = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    send({
      type: 'APPLY',
      busy,
      hasItems,
      apply: (result) => onApply(result.document, result.expected),
      onApplied,
    });
  };

  useEffect(() => {
    let active = true;

    const restore = async () => {
      try {
        const { readLocalTierlist } = await import('@/app/_services/local-tierlist');
        const profile = await readLocalTierlist(seed);
        if (!active) {
          return;
        }

        const mal = profile.animeImports?.mal ?? profile.malImport;
        const anilist = profile.animeImports?.anilist;
        setUsernames((current) => ({
          mal: current.mal || mal?.username || '',
          anilist: current.anilist || anilist?.username || '',
        }));
        if (mal || anilist) {
          setProvider(anilist && (!mal || anilist.importedAt > mal.importedAt) ? 'anilist' : 'mal');
        }
      } catch {
        // History is optional; a fresh import still works without it.
      }
    };

    void restore();

    return () => {
      active = false;
    };
  }, [seed]);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      try {
        const { readAnimeImportCheckpoint } = await import(
          '@/app/_services/anime-import-checkpoint'
        );
        const saved = await readAnimeImportCheckpoint(seed, provider);
        if (active) {
          send({ type: 'RESUME_AVAILABLE', available: !!saved && !saved.complete });
          if (saved) {
            setUsernames((current) =>
              current[provider] ? current : { ...current, [provider]: saved.username },
            );
          }
        }
      } catch {
        // An unreadable checkpoint does not prevent a fresh import.
      }
    };

    void restore();

    return () => {
      active = false;
    };
  }, [seed, provider, send]);

  return (
    <section
      aria-label={provider === 'mal' ? 'Import from MyAnimeList' : 'Import from AniList'}
      className="mt-3 border-t border-divider pt-3"
    >
      <p className="font-medium">Generate a series tierlist</p>
      <div className="mt-3">
        <SegmentedControl<ImportProvider>
          label="Import provider"
          name="import-provider"
          value={provider}
          disabled={disabled}
          options={[
            { value: 'mal', label: 'MAL' },
            { value: 'anilist', label: 'AniList' },
          ]}
          onChange={(next) => {
            setProvider(next);
            send({ type: 'RESET' });
          }}
        />
      </div>

      <form onSubmit={generate} aria-label={`Generate from ${providerLabel}`} className="mt-3">
        <label htmlFor={id} className="mb-2 block">
          Public {providerLabel} username
        </label>

        <input
          id={id}
          name="username"
          required
          minLength={2}
          maxLength={provider === 'mal' ? 16 : 20}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={`Your ${providerLabel} username`}
          value={username}
          onChange={(event) =>
            setUsernames({
              ...usernames,
              [provider]: event.currentTarget.value,
            })
          }
          disabled={disabled}
          className="h-11 w-full border border-input bg-transparent px-3 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
        />

        <div className="mt-2 flex items-center gap-4">
          <button
            type="submit"
            disabled={disabled}
            aria-busy={generating}
            className="min-h-9 cursor-pointer border border-divider px-3 hover:bg-accent disabled:opacity-50"
          >
            {generating ? 'Generating...' : generateLabel}
          </button>
          {generating && (
            <button
              type="button"
              onClick={() => send({ type: 'CANCEL' })}
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
              {progress.queuePosition && `Queue #${progress.queuePosition}`}
              {!progress.queuePosition &&
                (progress.percent === null ? '...' : `${progress.percent}%`)}
            </span>
          </div>
          {progress.detail && <p className="mb-2 text-muted-foreground">{progress.detail}</p>}
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
      {generationError && (
        <p role="status" className="mt-2">
          <TerminalText text={generationError} pending={false} />
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
            {generated.document.ranks.map((rank) => (
              <div key={rank} className="contents">
                <dt>{rank}</dt>
                <dd>
                  {generated.document.items.filter((item) => item.rank === rank).length} series
                </dd>
              </div>
            ))}
          </dl>

          <form onSubmit={apply} aria-label="Apply generated tierlist" className="mt-3">
            {hasItems && (
              <label className="mb-3 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={disabled}
                  onChange={(event) =>
                    send({ type: event.currentTarget.checked ? 'CONFIRM' : 'UNCONFIRM' })
                  }
                  className="mt-1"
                />
                Replace my current tierlist with this generated starting point.
              </label>
            )}

            <button
              type="submit"
              disabled={disabled || state.matches('applied') || (hasItems && !confirmed)}
              aria-busy={applying}
              className="min-h-9 cursor-pointer border border-foreground px-3 hover:bg-accent disabled:opacity-50"
            >
              {applying ? 'Applying...' : 'Use generated tierlist'}
            </button>
          </form>
          {applyError && (
            <p role="status" className="mt-2">
              <TerminalText text={applyError} pending={false} />
            </p>
          )}
        </div>
      )}
    </section>
  );
};
