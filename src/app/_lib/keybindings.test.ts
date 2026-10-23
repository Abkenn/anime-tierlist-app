import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  keyboardBehaviors,
  matchesKeyboardBehavior,
  withKeyboardBehaviors,
} from './keybindings';

describe('keyboard behavior composition', () => {
  it('matches Find with Ctrl or Meta, but not a bare key or Alt shortcut', () => {
    const event = {
      code: 'KeyF',
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
    };

    expect(matchesKeyboardBehavior(event, keyboardBehaviors.find)).toBe(false);
    expect(
      matchesKeyboardBehavior(
        { ...event, ctrlKey: true },
        keyboardBehaviors.find,
      ),
    ).toBe(true);
    expect(
      matchesKeyboardBehavior(
        { ...event, metaKey: true },
        keyboardBehaviors.find,
      ),
    ).toBe(true);
    expect(
      matchesKeyboardBehavior(
        { ...event, ctrlKey: true, altKey: true },
        keyboardBehaviors.find,
      ),
    ).toBe(false);
  });

  it('inherits bindings from each group name and preserves feature behavior', () => {
    const groups = withKeyboardBehaviors({
      left: { crop: { x: -1, y: 0 } },
      up: { move: 'previous row' },
    });

    expect(groups.left).toEqual({
      behavior: 'left',
      codes: ['ArrowLeft', 'KeyA'],
      crop: { x: -1, y: 0 },
    });
    expect(groups.up).toEqual({
      behavior: 'up',
      codes: ['ArrowUp', 'KeyW'],
      move: 'previous row',
    });
    expect(Object.keys(groups)).toEqual(['left', 'up']);
    expectTypeOf(groups.left.crop.x).toEqualTypeOf<-1>();
    expectTypeOf(groups.up.move).toEqualTypeOf<'previous row'>();
  });

  it('allows a group to explicitly choose a different shared behavior', () => {
    const groups = withKeyboardBehaviors({
      left: { behavior: 'right', crop: { x: -1, y: 0 } },
    });

    expect(groups.left).toEqual({
      behavior: 'right',
      codes: ['ArrowRight', 'KeyD'],
      crop: { x: -1, y: 0 },
    });
  });
  it('allows explicit code overrides without changing shared defaults', () => {
    const groups = withKeyboardBehaviors({
      left: { behavior: 'right', codes: ['KeyJ'] },
      up: { codes: [] },
      down: { codes: undefined },
    });

    expect(groups.left.behavior).toBe('right');
    expect(groups.left.codes).toEqual(['KeyJ']);
    expect(groups.up.codes).toEqual([]);
    expect(groups.down.codes).toEqual(['ArrowDown', 'KeyS']);
    expect(keyboardBehaviors.right.codes).toEqual(['ArrowRight', 'KeyD']);
  });
});
