import {
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
  useRef,
  useState,
} from 'react';
import { withKeyboardBehaviors } from '@/app/_lib/keybindings';
import type { TierCrop, TierKeyboardMove } from '@/app/_types/tierlist.types';

type TierItemKeyboardInput = {
  itemRef: RefObject<HTMLButtonElement | null>;
  editing: boolean;
  dragging: boolean;
  onNudgeCrop: (offset: TierCrop) => void;
  onFinishEditing: (save: boolean) => void;
  onCancel: () => void;
  onKeyboardMove: (move: TierKeyboardMove) => void;
  onKeyboardModeChange: (active: boolean) => void;
};

const directionGroups = withKeyboardBehaviors({
  left: {
    crop: { x: -0.025, y: 0 },
    move: { axis: 'column', direction: -1 },
  },
  right: {
    crop: { x: 0.025, y: 0 },
    move: { axis: 'column', direction: 1 },
  },
  up: {
    crop: { x: 0, y: -0.025 },
    move: { axis: 'row', direction: -1 },
  },
  down: {
    crop: { x: 0, y: 0.025 },
    move: { axis: 'row', direction: 1 },
  },
});

export const useTierItemKeyboard = ({
  itemRef,
  editing,
  dragging,
  onNudgeCrop,
  onFinishEditing,
  onCancel,
  onKeyboardMove,
  onKeyboardModeChange,
}: TierItemKeyboardInput) => {
  const pointerOrigin = useRef(false);
  const [pointerFocus, setPointerFocus] = useState(false);

  const focusPointer = () => {
    pointerOrigin.current = true;
    setPointerFocus(true);
    onKeyboardModeChange(false);
    itemRef.current?.focus({ preventScroll: true });
  };

  const focusKeyboard = () => {
    pointerOrigin.current = false;
    setPointerFocus(false);
    itemRef.current?.focus({ preventScroll: true });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (
      event.code === 'ContextMenu' ||
      (event.shiftKey && event.code === 'F10')
    ) {
      event.preventDefault();

      const bounds = event.currentTarget.getBoundingClientRect();

      event.currentTarget.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          clientX: bounds.left + bounds.width / 2,
          clientY: bounds.top + bounds.height / 2,
        }),
      );

      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const direction = Object.values(directionGroups).find(({ codes }) =>
      codes.some((code) => code === event.code),
    );
    const confirm = event.code === 'Enter' || event.code === 'NumpadEnter';

    if (editing) {
      if (direction) {
        event.preventDefault();
        onNudgeCrop(direction.crop);
      }

      if (confirm || event.code === 'Escape') {
        event.preventDefault();
        onFinishEditing(confirm);
        focusPointer();
      }

      return;
    }

    if (event.code === 'Escape') {
      event.preventDefault();
      onCancel();
      event.currentTarget.blur();

      return;
    }

    if (confirm || event.code === 'Space') {
      event.preventDefault();
      pointerOrigin.current = false;
      setPointerFocus(false);
      onKeyboardModeChange(true);

      return;
    }

    if (pointerOrigin.current || dragging) {
      return;
    }

    if (direction) {
      event.preventDefault();
      onKeyboardModeChange(true);
      onKeyboardMove(direction.move);
    }
  };

  const handleFocus = (event: FocusEvent<HTMLButtonElement>) => {
    if (
      !pointerOrigin.current &&
      event.currentTarget.matches(':focus-visible')
    ) {
      onKeyboardModeChange(true);
    }
  };

  const handleBlur = () => {
    pointerOrigin.current = false;
    setPointerFocus(false);
    onKeyboardModeChange(false);
  };

  return {
    pointerFocus,
    focusPointer,
    focusKeyboard,
    handleKeyDown,
    handleFocus,
    handleBlur,
  };
};
