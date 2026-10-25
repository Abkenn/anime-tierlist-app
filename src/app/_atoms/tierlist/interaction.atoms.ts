import { atom } from 'jotai/vanilla';

export const keyboardModeAtom = atom(false);
export const editingItemIdAtom = atom<string | null>(null);

type EditingChange = { id: string; editing: boolean };

export const setEditingItemAtom = atom(
  null,
  (get, set, { id, editing }: EditingChange) => {
    if (editing) {
      set(editingItemIdAtom, id);

      return;
    }

    if (get(editingItemIdAtom) === id) {
      set(editingItemIdAtom, null);
    }
  },
);

export const clearEditingItemAtom = atom(null, (_get, set) => {
  set(editingItemIdAtom, null);
});

export const tierDragRegionAtom = atom<'board' | 'discard' | null>(null);

export const menuItemIdAtom = atom<string | null>(null);
