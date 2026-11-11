'use client';

import { AlertDialog } from '@base-ui/react/alert-dialog';

type TierRankDeleteDialogProps = {
  label: string;
  rankCount: number;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
};

export const TierRankDeleteDialog = ({
  label,
  rankCount,
  onOpenChange,
  onDelete,
}: TierRankDeleteDialogProps) => (
  <AlertDialog.Root open onOpenChange={onOpenChange}>
    <AlertDialog.Portal>
      <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-background/50" />

      <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-80 -translate-1/2 border border-divider bg-popover p-4 text-sm text-popover-foreground shadow-md">
        <AlertDialog.Title>Delete {label}?</AlertDialog.Title>

        <AlertDialog.Description className="my-3 text-xs text-muted-foreground">
          {rankCount === 1
            ? 'Keep at least one tier.'
            : 'Its posters move to the adjacent tier.'}
        </AlertDialog.Description>

        <div className="flex gap-5">
          <button
            type="button"
            disabled={rankCount === 1}
            onClick={onDelete}
            className="cursor-pointer underline disabled:opacity-40"
          >
            Delete tier
          </button>

          <AlertDialog.Close className="cursor-pointer underline">
            Cancel
          </AlertDialog.Close>
        </div>
      </AlertDialog.Popup>
    </AlertDialog.Portal>
  </AlertDialog.Root>
);
