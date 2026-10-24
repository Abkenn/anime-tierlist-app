'use client';

import { Popover } from '@base-ui/react/popover';
import { useState } from 'react';

type UserSeedProps = {
  seed: string;
  imported: boolean;
  busy: boolean;
  error?: string;
  onImport: (seed: string) => Promise<void>;
  onUseDevice: () => Promise<void>;
};

export const UserSeed = ({
  seed,
  imported,
  busy,
  error,
  onImport,
  onUseDevice,
}: UserSeedProps) => {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [importSeed, setImportSeed] = useState('');

  const copySeed = async () => {
    try {
      await navigator.clipboard.writeText(seed);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <Popover.Root
      onOpenChange={() => {
        setCopied(false);
        setCopyFailed(false);
      }}
    >
      <Popover.Trigger className="cursor-pointer text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
        User seed
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          positionMethod="fixed"
          sideOffset={8}
          collisionPadding={16}
          className="z-50"
        >
          <Popover.Popup
            aria-label="User seed"
            className="w-96 max-h-(--available-height) max-w-[calc(100vw-2rem)] overflow-y-auto border border-divider bg-background p-3 text-xs text-muted-foreground shadow-sm"
          >
            <p className="mb-2">
              This seed belongs to your tierlist. Import it on another device to
              open the same list.
            </p>

            <input
              aria-label="Your user seed"
              readOnly
              value={seed}
              onFocus={(event) => event.currentTarget.select()}
              className="w-full border border-divider bg-transparent p-2 text-foreground"
            />

            <button
              type="button"
              onClick={copySeed}
              className="mt-2 cursor-pointer underline underline-offset-4 hover:text-foreground"
            >
              {copied ? 'Copied' : 'Copy seed'}
            </button>

            {copyFailed && (
              <p role="status" className="mt-2">
                Select the seed above and copy it manually.
              </p>
            )}

            <p className="mt-2">
              Keep it private. Please save a copy somewhere safe. Clearing
              browser data removes the local copy. Only changes saved online can
              be recovered with your seed.
            </p>

            <form
              className="mt-4 border-t border-divider pt-3"
              onSubmit={(event) => {
                event.preventDefault();
                void onImport(importSeed).then(() => setImportSeed(''));
              }}
            >
              <label className="block">
                Import a seed
                <input
                  aria-label="Seed to import"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={importSeed}
                  maxLength={64}
                  disabled={busy}
                  onChange={(event) => setImportSeed(event.currentTarget.value)}
                  className="mt-2 w-full border border-divider bg-transparent p-2 text-foreground"
                />
              </label>

              <p className="mt-2">
                Your current tierlist stays on this device. You can switch back
                anytime.
              </p>

              <button
                type="submit"
                disabled={busy || !importSeed.trim()}
                className="mt-2 cursor-pointer underline underline-offset-4 hover:text-foreground disabled:cursor-default disabled:opacity-50"
              >
                {busy ? 'Opening...' : 'Import seed'}
              </button>
            </form>

            {imported && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void onUseDevice();
                }}
                className="mt-3 cursor-pointer underline underline-offset-4 hover:text-foreground disabled:opacity-50"
              >
                Return to this device’s tierlist
              </button>
            )}

            {error && (
              <p role="status" className="mt-2">
                {error}
              </p>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
