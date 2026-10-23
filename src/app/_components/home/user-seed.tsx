'use client';

import { Popover } from '@base-ui/react/popover';
import { useState } from 'react';

export const UserSeed = ({ seed }: { seed: string }) => {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

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
            <p className="mb-2">This seed belongs to your local tierlist.</p>

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
              browser data removes this local tierlist.
            </p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
