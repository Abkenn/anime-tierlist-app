import { createStore } from 'jotai/vanilla';
import { describe, expect, it } from 'vitest';
import { editingItemIdAtom, setEditingItemAtom } from './interaction.atoms';
import { changeImageModeAtom, imageModeAtom } from './settings.atoms';

describe('tierlist settings', () => {
  it('closes the current crop when switching image mode', () => {
    const store = createStore();

    store.set(setEditingItemAtom, { id: 'poster', editing: true });
    store.set(changeImageModeAtom, 'cover');
    expect(store.get(imageModeAtom)).toBe('cover');
    expect(store.get(editingItemIdAtom)).toBeNull();
  });

  it('keeps image preferences isolated between boards', () => {
    const first = createStore();
    const second = createStore();

    first.set(changeImageModeAtom, 'natural');
    expect(first.get(imageModeAtom)).toBe('natural');
    expect(second.get(imageModeAtom)).toBe('contain');
  });
});
