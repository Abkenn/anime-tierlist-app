import type { KeyboardEventCode } from 'types-keyboardevent';

export type KeyboardBehavior = {
  readonly codes: readonly KeyboardEventCode[];
  readonly modifiers?: {
    readonly primary?: boolean;
    readonly alt?: boolean;
    readonly shift?: boolean;
  };
};

export const keyboardBehaviors = {
  left: { codes: ['ArrowLeft', 'KeyA'] },
  right: { codes: ['ArrowRight', 'KeyD'] },
  up: { codes: ['ArrowUp', 'KeyW'] },
  down: { codes: ['ArrowDown', 'KeyS'] },
  find: { codes: ['KeyF'], modifiers: { primary: true, alt: false } },
  save: {
    codes: ['KeyS'],
    modifiers: { primary: true, alt: false, shift: false },
  },
} as const satisfies Record<string, KeyboardBehavior>;

export type KeyboardBehaviorName = keyof typeof keyboardBehaviors;

type KeyboardBehaviorEvent = Pick<
  KeyboardEvent,
  'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'
>;

export const matchesKeyboardBehavior = (
  event: KeyboardBehaviorEvent,
  { codes, modifiers }: KeyboardBehavior,
) =>
  codes.some((code) => code === event.code) &&
  (modifiers?.primary === undefined ||
    (event.ctrlKey || event.metaKey) === modifiers.primary) &&
  (modifiers?.alt === undefined || event.altKey === modifiers.alt) &&
  (modifiers?.shift === undefined || event.shiftKey === modifiers.shift);

type KeyboardBehaviorConfig = {
  behavior?: KeyboardBehaviorName;
  codes?: readonly KeyboardEventCode[];
  [option: string]: unknown;
};

export const withKeyboardBehaviors = <
  const Groups extends Partial<
    Record<KeyboardBehaviorName, KeyboardBehaviorConfig>
  >,
>(
  groups: Groups & Record<Exclude<keyof Groups, KeyboardBehaviorName>, never>,
) =>
  Object.fromEntries(
    Object.entries(groups).map(([name, config]) => {
      const behavior = config.behavior ?? (name as KeyboardBehaviorName);

      const defaults = keyboardBehaviors[behavior];

      return [
        name,
        {
          ...defaults,
          ...config,
          behavior,
          codes: config.codes ?? defaults.codes,
        },
      ];
    }),
  ) as {
    [Name in keyof Groups]: Omit<Groups[Name], 'codes' | 'behavior'> &
      KeyboardBehavior & {
        behavior: KeyboardBehaviorName;
      };
  };
