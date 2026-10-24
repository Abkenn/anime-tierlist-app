'use client';

import { AlertDialog } from '@base-ui/react/alert-dialog';

type SeedReplaceConfirmationProps = {
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
};

export const SeedReplaceConfirmation = ({
  open,
  busy,
  onOpenChange,
  onConfirm,
}: SeedReplaceConfirmationProps) => (
  <AlertDialog.Root
    open={open}
    onOpenChange={(next) => {
      if (!busy) {
        onOpenChange(next);
      }
    }}
  >
    <AlertDialog.Portal>
      <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-background/70" />

      <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-84 max-w-[calc(100vw-2rem)] -translate-1/2 border border-divider bg-popover p-4 text-sm text-popover-foreground shadow-md">
        <AlertDialog.Title className="font-medium">
          Replace your tierlist?
        </AlertDialog.Title>

        <AlertDialog.Description className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Your account’s current tierlist will be permanently replaced. This
          cannot be undone.
        </AlertDialog.Description>

        <div className="mt-4 flex justify-end gap-4">
          <AlertDialog.Close
            disabled={busy}
            className="min-h-9 cursor-pointer underline underline-offset-4 disabled:opacity-50"
          >
            Cancel
          </AlertDialog.Close>

          <button
            type="button"
            disabled={busy}
            onClick={() => void onConfirm()}
            className="min-h-9 cursor-pointer border border-foreground px-3 hover:bg-accent disabled:opacity-50"
          >
            {busy ? 'Replacing...' : 'Replace tierlist'}
          </button>
        </div>
      </AlertDialog.Popup>
    </AlertDialog.Portal>
  </AlertDialog.Root>
);
