'use client';

import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { useId } from 'react';

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
}: SegmentedControlProps<Value>) => {
  const id = useId();
  const reducedMotion = useReducedMotion();

  return (
    <LayoutGroup id={id}>
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
            className="relative isolate flex min-h-9 min-w-9 cursor-pointer items-center justify-center px-2 text-xs text-muted-foreground outline-none transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-checked:text-foreground"
          >
            {option.value === value && (
              <motion.span
                aria-hidden="true"
                layoutId="selection"
                data-segment-selection=""
                initial={false}
                className="pointer-events-none absolute inset-0 -z-10 bg-muted shadow-xs"
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 550, damping: 40 }
                }
              />
            )}
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
    </LayoutGroup>
  );
};
