export type TierBoardState = {
  keyboardMode: boolean;
  editingItemId: string | null;
};

export type TierBoardAction =
  | { type: 'keyboard-mode'; active: boolean }
  | { type: 'edit-item'; id: string; editing: boolean }
  | { type: 'clear-editing' };

export const tierBoardReducer = (
  state: TierBoardState,
  action: TierBoardAction,
): TierBoardState => {
  switch (action.type) {
    case 'keyboard-mode':
      return state.keyboardMode === action.active
        ? state
        : { ...state, keyboardMode: action.active };
    case 'edit-item': {
      if (action.editing) {
        return { ...state, editingItemId: action.id };
      }

      return state.editingItemId === action.id
        ? { ...state, editingItemId: null }
        : state;
    }
    case 'clear-editing':
      return state.editingItemId === null
        ? state
        : { ...state, editingItemId: null };
  }
};
