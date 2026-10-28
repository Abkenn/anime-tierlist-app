'use client';

import { Popover } from '@base-ui/react/popover';
import { Tabs } from '@base-ui/react/tabs';
import { ArrowRight, Check, ChevronDown, Copy } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  type RefObject,
  useActionState,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from 'react';
import { FormSubmitButton } from '@/app/_components/ui/form-submit-button';
import {
  keyboardBehaviors,
  matchesKeyboardBehavior,
} from '@/app/_lib/keybindings';
import { tierlistErrorMessage } from '@/app/_lib/tierlist-error';
import { userSeedSchema } from '@/app/_lib/tierlist-sync';
import { ProjectFileImport } from './project-file-import';
import { SeedReplaceConfirmation } from './seed-replace-confirmation';

type UserSeedProps = {
  seed: string;
  statusAnchor?: RefObject<HTMLElement | null>;
  imported: boolean;
  projectReturn?: 'account' | 'device';
  busy: boolean;
  error?: string;
  open: boolean;
  handle: ReturnType<typeof Popover.createHandle>;
  onOpenChange: (open: boolean) => void;
  onImport: (seed: string) => Promise<boolean>;
  onBackup: () => Promise<string>;
  onUseDevice: () => Promise<unknown>;
  onReplaceDevice: () => Promise<boolean>;
  googleConnected: boolean;
  resolvingIdentity?: boolean;
  canSignIn: boolean;
  onGoogleSignIn: () => Promise<unknown>;
  onGoogleSignOut: () => Promise<unknown>;
};

export const UserSeed = ({
  seed,
  statusAnchor,
  imported,
  projectReturn,
  busy,
  error,
  open,
  handle,
  onOpenChange,
  onImport,
  onUseDevice,
  onReplaceDevice,
  googleConnected,
  resolvingIdentity = false,
  canSignIn,
  onGoogleSignIn,
  onGoogleSignOut,
  onBackup,
}: UserSeedProps) => {
  const desktopAnchor = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const [tab, setTab] = useState('save');
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [importSeed, setImportSeed] = useState('');
  const [shareVisible, setShareVisible] = useState(false);
  const [shareState, shareAction, sharing] = useActionState(
    async () => {
      setShareVisible(true);
      try {
        const seed = await onBackup();
        setCopied(false);

        return { seed, error: '' };
      } catch (failure) {
        return {
          seed: '',
          error: tierlistErrorMessage(
            failure,
            'Unable to prepare a backup. Try again.',
          ),
        };
      }
    },
    { seed: '', error: '' },
  );
  const shareSeed = shareVisible && !sharing ? shareState.seed : '';
  const shareError = shareVisible && !sharing ? shareState.error : '';
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmLocalReplace, setConfirmLocalReplace] = useState(false);
  const importId = useId();
  const validSeed = userSeedSchema.safeParse(importSeed).success;
  const validationMessage =
    importSeed && !validSeed ? 'Enter a valid 64-character seed.' : '';
  const [importError, importAction, importPending] = useActionState(
    async (_previous: string, data: FormData) => {
      const parsed = userSeedSchema.safeParse(data.get('seed'));
      if (!parsed.success) {
        return 'Enter a valid 64-character seed.';
      }

      if (busy || sharing || (googleConnected && !canSignIn)) {
        return '';
      }

      if (googleConnected) {
        setConfirmReplace(true);
      } else {
        await submitImport(parsed.data);
      }

      return '';
    },
    '',
  );
  const displayedSeed = googleConnected ? shareSeed : seed;
  const anonymousHeading = projectReturn ? 'Project seed' : 'Save anonymously';
  const importLabel = googleConnected ? 'Replace tierlist' : 'Import seed';

  const submitImport = async (value = importSeed) => {
    const parsed = userSeedSchema.safeParse(value);
    if (!parsed.success) {
      setConfirmReplace(false);

      return;
    }

    if (await onImport(parsed.data)) {
      setImportSeed('');
      setShareVisible(false);
    }

    setConfirmReplace(false);
  };

  const [projectMessage, saveProject, savingProject] = useActionState(
    async () => {
      try {
        const projectSeed = displayedSeed || (await onBackup());
        const { downloadTierlistProject } = await import(
          '@/app/_services/tierlist-download'
        );
        downloadTierlistProject(projectSeed);
        return '';
      } catch (failure) {
        return tierlistErrorMessage(
          failure,
          'Unable to save the project. Try again.',
        );
      }
    },
    '',
  );

  const saveShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (matchesKeyboardBehavior(event, keyboardBehaviors.save)) {
      event.preventDefault();
      if (!busy) {
        setTab('save');
        onOpenChange(true);
      }
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', saveShortcut);

    return () => window.removeEventListener('keydown', saveShortcut);
  }, []);

  const copySeed = async () => {
    try {
      await navigator.clipboard.writeText(displayedSeed);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <Popover.Root
      open={open}
      handle={handle}
      onOpenChange={(next) => {
        onOpenChange(next);
        setCopied(false);
        setCopyFailed(false);
        setShareVisible(false);
      }}
    >
      <Popover.Trigger
        ref={desktopAnchor}
        disabled={busy}
        className="inline-flex min-h-9 items-center gap-1 cursor-pointer text-xs font-medium text-foreground underline decoration-current/70 underline-offset-4 transition-[color,text-decoration-color,opacity] hover:decoration-current active:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50"
      >
        Save &amp; import
        <ChevronDown aria-hidden="true" className="size-3" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          anchor={() =>
            desktopAnchor.current?.getClientRects().length
              ? desktopAnchor.current
              : (statusAnchor?.current ?? null)
          }
          side="bottom"
          align="end"
          positionMethod="fixed"
          sideOffset={8}
          collisionPadding={16}
          className="z-50"
        >
          <Popover.Popup
            render={
              <motion.div
                initial={
                  reducedMotion ? false : { opacity: 0, y: -4, scale: 0.98 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: reducedMotion ? 0 : 0.16,
                  ease: 'easeOut',
                }}
              />
            }
            aria-label="Save and import tierlist"
            className="w-84 max-h-(--available-height) max-w-[calc(100vw-2rem)] origin-(--transform-origin) overflow-y-auto border border-divider bg-popover p-4 text-xs leading-relaxed text-popover-foreground shadow-md"
          >
            <p className="mb-3 font-medium">Save &amp; import</p>
            {!projectReturn && !googleConnected && (
              <>
                <button
                  type="button"
                  disabled={busy || !canSignIn || resolvingIdentity}
                  onClick={() => void onGoogleSignIn()}
                  className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md border border-transparent bg-foreground px-4 font-sans text-sm font-medium text-background shadow-sm hover:bg-foreground/90 active:opacity-80 disabled:opacity-60"
                >
                  Sign in with Google
                </button>

                <p className="mt-2 text-muted-foreground">
                  Save or restore your list with Google.
                </p>
              </>
            )}
            {googleConnected && (
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Google account</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onGoogleSignOut()}
                  className="min-h-9 cursor-pointer underline underline-offset-4 hover:text-muted-foreground disabled:opacity-50"
                >
                  Sign out
                </button>
              </div>
            )}

            <Tabs.Root
              value={tab}
              onValueChange={(value) => setTab(String(value))}
            >
              <Tabs.List
                className="relative mt-3 flex gap-4 border-b border-divider"
                aria-label="Save or import a tierlist"
              >
                {(['save', 'import'] as const).map((value) => (
                  <Tabs.Tab
                    key={value}
                    value={value}
                    className="relative min-h-9 cursor-pointer px-1 font-medium text-muted-foreground data-active:text-foreground"
                  >
                    {value === 'save' ? 'Save for later' : 'Import'}
                    {tab === value && (
                      <motion.span
                        layoutId={`${importId}-tab`}
                        className="absolute inset-x-0 bottom-0 h-px bg-foreground"
                        transition={{ duration: reducedMotion ? 0 : 0.16 }}
                      />
                    )}
                  </Tabs.Tab>
                ))}
              </Tabs.List>

              <Tabs.Panel value="save">
                <section aria-label="Anonymous seed" className="pt-3">
                  <p className="mb-2 font-medium">
                    {googleConnected
                      ? 'Save an anonymous copy'
                      : anonymousHeading}
                  </p>

                  {googleConnected && !shareSeed ? (
                    <form action={shareAction}>
                      <FormSubmitButton
                        disabled={busy || !canSignIn}
                        pendingLabel="Preparing copy..."
                        className="min-h-9 cursor-pointer underline underline-offset-4 hover:text-foreground disabled:opacity-50"
                      >
                        Show copy seed
                      </FormSubmitButton>
                    </form>
                  ) : (
                    <div className="group relative">
                      <input
                        aria-label={
                          googleConnected ? 'Backup seed' : 'Your user seed'
                        }
                        readOnly
                        value={displayedSeed}
                        spellCheck={false}
                        onFocus={(event) => event.currentTarget.select()}
                        className="h-11 w-full border border-input bg-transparent py-2 pl-3 pr-12 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
                      />

                      <button
                        type="button"
                        aria-label={copied ? 'Seed copied' : 'Copy seed'}
                        title={copied ? 'Copied' : 'Copy seed'}
                        onClick={() => void copySeed()}
                        className="absolute inset-y-1 right-1 flex w-9 cursor-pointer items-center justify-center bg-popover opacity-0 hover:bg-accent focus-visible:opacity-100 focus-visible:outline-2 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100"
                      >
                        {copied ? (
                          <Check className="size-4" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                    </div>
                  )}

                  <span role="status" className="sr-only">
                    {copied ? 'Seed copied to clipboard.' : ''}
                  </span>

                  {copyFailed && (
                    <p role="status" className="mt-2">
                      Select the seed and copy it manually.
                    </p>
                  )}

                  <p className="mt-2 text-muted-foreground">
                    {googleConnected
                      ? 'A separate copy. Your Google list stays yours.'
                      : 'Keep your seed or project file to restore this list. Keep your seed private.'}
                  </p>

                  {shareError && (
                    <p role="status" className="mt-2">
                      {shareError}
                    </p>
                  )}
                </section>

                <form action={saveProject} className="mt-3">
                  <FormSubmitButton
                    disabled={busy || savingProject}
                    pendingLabel="Saving project..."
                    className="min-h-9 cursor-pointer border border-divider px-3 hover:bg-accent disabled:opacity-50"
                  >
                    Save project file
                  </FormSubmitButton>
                </form>
                {projectMessage && (
                  <p role="status" className="mt-2">
                    {projectMessage}
                  </p>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="import">
                <form className="mt-4" action={importAction}>
                  <label htmlFor={importId} className="mb-2 block">
                    {googleConnected
                      ? 'Replace tierlist from a seed'
                      : 'Import a seed'}
                  </label>

                  <div className="relative">
                    <input
                      id={importId}
                      name="seed"
                      aria-invalid={Boolean(validationMessage)}
                      aria-describedby={`${importId}-error`}
                      aria-label="Seed to import"
                      placeholder="Paste your seed"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={importSeed}
                      maxLength={64}
                      disabled={
                        busy || importPending || (googleConnected && !canSignIn)
                      }
                      onChange={(event) =>
                        setImportSeed(event.currentTarget.value)
                      }
                      className="h-11 w-full border border-input bg-transparent py-2 pl-3 pr-12 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
                    />

                    <FormSubmitButton
                      aria-label={busy ? 'Opening tierlist' : importLabel}
                      title={
                        googleConnected ? 'Replace tierlist' : 'Import seed'
                      }
                      disabled={
                        busy ||
                        sharing ||
                        importPending ||
                        !validSeed ||
                        (googleConnected && !canSignIn)
                      }
                      className="absolute inset-y-1 right-1 flex w-9 cursor-pointer items-center justify-center hover:bg-accent focus-visible:outline-2 disabled:cursor-default disabled:opacity-40"
                    >
                      <ArrowRight className="size-4" />
                    </FormSubmitButton>
                  </div>
                  <p id={`${importId}-error`} role="status" className="mt-2">
                    {validationMessage || (!validSeed ? importError : '')}
                  </p>
                </form>

                <ProjectFileImport
                  busy={busy}
                  onOpened={() => onOpenChange(false)}
                />
              </Tabs.Panel>
            </Tabs.Root>

            <SeedReplaceConfirmation
              open={confirmReplace}
              busy={busy}
              onOpenChange={setConfirmReplace}
              onConfirm={() => submitImport()}
            />

            {(imported || projectReturn) && !googleConnected && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onUseDevice()}
                  className="min-h-9 cursor-pointer underline underline-offset-4 hover:text-muted-foreground disabled:opacity-50"
                >
                  {projectReturn === 'account'
                    ? 'Go back to Google tierlist'
                    : 'Go back to local'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmLocalReplace(true)}
                  className="min-h-9 cursor-pointer underline underline-offset-4 hover:text-muted-foreground disabled:opacity-50"
                >
                  {projectReturn === 'account'
                    ? 'Replace my tierlist with this'
                    : 'Replace local with this'}
                </button>
              </div>
            )}

            <SeedReplaceConfirmation
              open={confirmLocalReplace}
              target={projectReturn === 'account' ? 'account' : 'device'}
              busy={busy}
              onOpenChange={setConfirmLocalReplace}
              onConfirm={async () => {
                if (await onReplaceDevice()) {
                  setConfirmLocalReplace(false);
                }
              }}
            />

            {error && (
              <p role="status" className="mt-3">
                {error}
              </p>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
