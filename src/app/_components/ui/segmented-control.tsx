'use client';

import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';

type SegmentedControlProps<Value extends string> = {
  label: string;
  name: string;
  value: Value;
  onChange: (value: Value) => void;
  options: readonly { value: Value; label: string; shortLabel?: string }[];
};

export const SegmentedControl = <Value extends string>({
  label,
  name,
  value,
  onChange,
  options,
}: SegmentedControlProps<Value>) => (
  <RadioGroup
    aria-label={label}
    name={name}
    value={value}
    onValueChange={onChange}
    className="inline-flex border border-divider p-0.5"
  >
    {options.map((option) => (
      <Radio.Root
        key={option.value}
        value={option.value}
        aria-label={option.label}
        render={<button type="button" />}
        nativeButton
        className="flex min-h-9 min-w-9 cursor-pointer items-center justify-center px-2 text-xs text-muted-foreground outline-none transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-checked:bg-muted data-checked:text-foreground data-checked:shadow-xs"
      >
        {option.shortLabel ? (
          <>
            <span className="sm:hidden">{option.shortLabel}</span>

            <span className="hidden sm:inline">{option.label}</span>
          </>
        ) : (
          option.label
        )}
      </Radio.Root>
    ))}
  </RadioGroup>
);
