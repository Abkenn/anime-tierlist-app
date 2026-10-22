import { describe, expect, it } from 'vitest';
import { type TierBoardState, tierBoardReducer } from './tier-board-state';

const initial: TierBoardState = { keyboardMode: false, editingItemId: null };

describe('tier board UI state', () => {
  it('allows one edited item and ignores an older item closing', () => {
    const first = tierBoardReducer(initial, {
      type: 'edit-item',
      id: 'first',
      editing: true,
    });
    const second = tierBoardReducer(first, {
      type: 'edit-item',
      id: 'second',
      editing: true,
    });

    expect(second.editingItemId).toBe('second');
    expect(
      tierBoardReducer(second, {
        type: 'edit-item',
        id: 'first',
        editing: false,
      }),
    ).toBe(second);
    expect(
      tierBoardReducer(second, {
        type: 'edit-item',
        id: 'second',
        editing: false,
      }).editingItemId,
    ).toBeNull();
  });

  it('changes keyboard mode independently from the crop selection', () => {
    const editing = { ...initial, editingItemId: 'first' };
    const keyboard = tierBoardReducer(editing, {
      type: 'keyboard-mode',
      active: true,
    });

    expect(keyboard).toEqual({ keyboardMode: true, editingItemId: 'first' });
    expect(tierBoardReducer(keyboard, { type: 'clear-editing' })).toEqual({
      keyboardMode: true,
      editingItemId: null,
    });
  });
});
