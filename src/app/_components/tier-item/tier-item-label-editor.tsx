'use client';

import { Dialog } from '@base-ui/react/dialog';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';
import { renamingItemIdAtom } from '@/app/_atoms/tierlist/find.atoms';
import { tierItemsAtom } from '@/app/_atoms/tierlist/items.atoms';
import { getTierItemLabel } from '@/app/_lib/tier-item-label';
import type { TierItemData } from '@/app/_types/tierlist.types';

const LabelForm = ({
  item,
  close,
}: {
  item: TierItemData;
  close: () => void;
}) => {
  const [label, setLabel] = useState(getTierItemLabel(item));
  const setItems = useSetAtom(tierItemsAtom);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setItems((items) =>
          items.map((existing) =>
            existing.id === item.id
              ? { ...existing, label: label.trim() || 'Unknown' }
              : existing,
          ),
        );
        close();
      }}
    >
      <Dialog.Title className="mb-3 text-sm">Rename Label</Dialog.Title>

      <input
        aria-label="Item label"
        value={label}
        maxLength={300}
        onChange={(event) => setLabel(event.currentTarget.value)}
        className="w-full border border-divider bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
      />

      <p className="mt-2 text-xs text-muted-foreground">
        Used to find this item. Leave blank to use poster text or Unknown.
      </p>

      <div className="mt-3 flex gap-5 text-sm">
        <button
          type="submit"
          className="cursor-pointer underline underline-offset-4 hover:opacity-70"
        >
          Save
        </button>

        <button
          type="button"
          onClick={close}
          className="cursor-pointer hover:underline underline-offset-4"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export const TierItemLabelEditor = () => {
  const [id, setId] = useAtom(renamingItemIdAtom);
  const items = useAtomValue(tierItemsAtom);
  const item = items.find((candidate) => candidate.id === id);

  return (
    <Dialog.Root
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open) {
          setId(null);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-background/40" />

        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-80 max-w-[calc(100vw-2rem)] -translate-1/2 border border-divider bg-background p-4 text-foreground shadow-sm">
          {item && (
            <LabelForm key={item.id} item={item} close={() => setId(null)} />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
