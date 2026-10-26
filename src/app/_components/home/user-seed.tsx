'use client';

import { Popover } from '@base-ui/react/popover';
import { ArrowRight, Check, Copy } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { type RefObject, useActionState, useId, useRef, useState } from 'react';
import { FormSubmitButton } from '@/app/_components/ui/form-submit-button';
import { tierlistErrorMessage } from '@/app/_lib/tierlist-error';
import { userSeedSchema } from '@/app/_lib/tierlist-sync';
import { SeedReplaceConfirmation } from './seed-replace-confirmation';

type UserSeedProps = {
  seed: string;
  statusAnchor?: RefObject<HTMLElement | null>;
  imported: boolean;
  busy: boolean;
  error?: string;
  open: boolean;
  handle: ReturnType<typeof Popover.createHandle>;
  onOpenChange: (open: boolean) => void;
  onImport: (seed: string) => Promise<boolean>;
  onShare: () => Promise<string>;
  onUseDevice: () => Promise<unknown>;
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
  busy,
  error,
  open,
  handle,
  onOpenChange,
  onImport,
  onUseDevice,
  googleConnected,
  resolvingIdentity = false,
  canSignIn,
  onGoogleSignIn,
  onGoogleSignOut,
  onShare,
}: UserSeedProps) => {
  const desktopAnchor = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [importSeed, setImportSeed] = useState('');
  const [shareVisible, setShareVisible] = useState(false);
  const [shareState, shareAction, sharing] = useActionState(
    async () => {
      setShareVisible(true);
      try {
        const seed = await onShare();
        setCopied(false);

        return { seed, error: '' };
      } catch (failure) {
        return {
          seed: '',
          error: tierlistErrorMessage(
            failure,
            'Unable to create a share seed. Try again.',
          ),
        };
      }
    },
    { seed: '', error: '' },
  );
  const shareSeed = shareVisible && !sharing ? shareState.seed : '';
  const shareError = shareVisible && !sharing ? shareState.error : '';
  const [confirmReplace, setConfirmReplace] = useState(false);
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
        className="hidden min-h-9 cursor-pointer text-xs font-medium text-foreground underline decoration-current/70 underline-offset-4 transition-[color,text-decoration-color,opacity] hover:decoration-current active:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50 sm:inline-flex sm:items-center"
      >
        {googleConnected || resolvingIdentity
          ? 'Account & seed'
          : 'Sign in or export anonymously'}
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
            aria-label="Sign in and user seed"
            className="w-84 max-h-(--available-height) max-w-[calc(100vw-2rem)] origin-(--transform-origin) overflow-y-auto border border-divider bg-popover p-4 text-xs leading-relaxed text-popover-foreground shadow-md"
          >
            <button
              type="button"
              disabled={busy || (!googleConnected && !canSignIn)}
              title={
                !googleConnected && !canSignIn
                  ? 'Waiting for changes to save'
                  : undefined
              }
              onClick={() => {
                void (googleConnected ? onGoogleSignOut() : onGoogleSignIn());
              }}
              className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md border border-transparent bg-foreground px-4 font-sans text-sm font-medium text-background shadow-sm hover:bg-foreground/90 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-default disabled:opacity-60"
            >
              {googleConnected ? 'Sign out from Google' : 'Sign in with Google'}
            </button>

            <section
              aria-label="Anonymous seed"
              className="mt-4 border-t border-divider pt-3"
            >
              <p className="mb-2 font-medium">
                {googleConnected
                  ? 'Share seed'
                  : 'Or stay anonymous. Save your seed.'}
              </p>

              {googleConnected && !shareSeed ? (
                <form action={shareAction}>
                  <FormSubmitButton
                    disabled={busy || !canSignIn}
                    pendingLabel="Creating share seed..."
                    className="min-h-9 cursor-pointer underline underline-offset-4 hover:text-foreground disabled:opacity-50"
                  >
                    Create share seed
                  </FormSubmitButton>
                </form>
              ) : (
                <div className="group relative">
                  <input
                    aria-label={
                      googleConnected ? 'Share seed' : 'Your user seed'
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
                  ? 'Share a separate copy of your tierlist.'
                  : 'Keep it private. Save it to open this list on another device. Clearing browser data removes this device’s copy.'}
              </p>

              {shareError && (
                <p role="status" className="mt-2">
                  {shareError}
                </p>
              )}
            </section>

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
                  onChange={(event) => setImportSeed(event.currentTarget.value)}
                  className="h-11 w-full border border-input bg-transparent py-2 pl-3 pr-12 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
                />

                <FormSubmitButton
                  aria-label={busy ? 'Opening tierlist' : importLabel}
                  title={googleConnected ? 'Replace tierlist' : 'Import seed'}
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

            <SeedReplaceConfirmation
              open={confirmReplace}
              busy={busy}
              onOpenChange={setConfirmReplace}
              onConfirm={() => submitImport()}
            />

            {imported && !googleConnected && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onUseDevice()}
                className="mt-3 min-h-9 cursor-pointer underline underline-offset-4 hover:text-muted-foreground disabled:opacity-50"
              >
                Return to this device’s tierlist
              </button>
            )}

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
