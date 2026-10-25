'use client';

import { AlertDialog } from '@base-ui/react/alert-dialog';
import { useActionState } from 'react';
import { FormSubmitButton } from '@/app/_components/ui/form-submit-button';

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
}: SeedReplaceConfirmationProps) => {
  const [, confirmAction, pending] = useActionState(async () => {
    await onConfirm();

    return null;
  }, null);
  const submitting = busy || pending;

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!submitting) {
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

          <form action={confirmAction} className="mt-4 flex justify-end gap-4">
            <AlertDialog.Close
              disabled={submitting}
              className="min-h-9 cursor-pointer underline underline-offset-4 disabled:opacity-50"
            >
              Cancel
            </AlertDialog.Close>

            <FormSubmitButton
              pendingLabel="Replacing..."
              disabled={submitting}
              className="min-h-9 cursor-pointer border border-foreground px-3 hover:bg-accent disabled:opacity-50"
            >
              Replace tierlist
            </FormSubmitButton>
          </form>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};
