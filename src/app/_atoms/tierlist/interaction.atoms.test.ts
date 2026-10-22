import { createStore } from 'jotai/vanilla';
import { describe, expect, it, vi } from 'vitest';
import {
  clearEditingItemAtom,
  editingItemIdAtom,
  keyboardModeAtom,
  setEditingItemAtom,
} from './interaction.atoms';

describe('tier board atoms', () => {
  it('keeps one edited item and ignores an older item closing', () => {
    const store = createStore();

    store.set(setEditingItemAtom, { id: 'first', editing: true });
    store.set(setEditingItemAtom, { id: 'second', editing: true });
    store.set(setEditingItemAtom, { id: 'first', editing: false });
    expect(store.get(editingItemIdAtom)).toBe('second');
    store.set(setEditingItemAtom, { id: 'second', editing: false });
    expect(store.get(editingItemIdAtom)).toBeNull();
  });

  it('isolates board state between stores', () => {
    const first = createStore();
    const second = createStore();

    first.set(keyboardModeAtom, true);
    first.set(setEditingItemAtom, { id: 'first', editing: true });
    expect(second.get(keyboardModeAtom)).toBe(false);
    expect(second.get(editingItemIdAtom)).toBeNull();
    expect(first.get(editingItemIdAtom)).toBe('first');
  });

  it('does not notify keyboard subscribers when the edited item changes', () => {
    const store = createStore();
    const listener = vi.fn();
    const unsubscribe = store.sub(keyboardModeAtom, listener);

    store.set(setEditingItemAtom, { id: 'first', editing: true });
    store.set(clearEditingItemAtom);
    expect(listener).not.toHaveBeenCalled();
    store.set(keyboardModeAtom, true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
