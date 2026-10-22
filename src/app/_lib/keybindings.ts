import type { KeyboardEventCode } from 'types-keyboardevent';

export type KeyboardBehavior = {
  readonly codes: readonly KeyboardEventCode[];
};

export const keyboardBehaviors = {
  left: { codes: ['ArrowLeft', 'KeyA'] },
  right: { codes: ['ArrowRight', 'KeyD'] },
  up: { codes: ['ArrowUp', 'KeyW'] },
  down: { codes: ['ArrowDown', 'KeyS'] },
} as const satisfies Record<string, KeyboardBehavior>;

export type KeyboardBehaviorName = keyof typeof keyboardBehaviors;

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
