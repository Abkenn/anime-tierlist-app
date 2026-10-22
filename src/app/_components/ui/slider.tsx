import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import { cn } from 'cn';
import { useState } from 'react';

type SliderProps = SliderPrimitive.Root.Props & {
  thumbLabel?: (value: number) => string;
  thumbProps?: Omit<SliderPrimitive.Thumb.Props, 'index' | 'render'>;
};

export const Slider = ({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbLabel,
  thumbProps,
  ...props
}: SliderProps) => {
  const [hoveredThumb, setHoveredThumb] = useState<number | null>(null);
  const currentValue = value ?? defaultValue ?? min;
  const values = Array.isArray(currentValue) ? currentValue : [currentValue];
  const thumbs = Array.from(
    { length: values.length },
    (_, index) => `thumb-${index}`,
  );

  return (
    <SliderPrimitive.Root
      className={cn('data-horizontal:w-full data-vertical:h-full', className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex min-h-11 w-full touch-none items-center select-none data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-muted select-none data-disabled:opacity-50 data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {thumbs.map((thumb, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={thumb}
            index={index}
            className="group/thumb relative block size-4 shrink-0 cursor-default rounded-full border border-ring bg-white ring-ring/50 data-disabled:bg-white/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 focus-within:ring-3 focus-within:outline-hidden motion-reduce:transition-none"
            {...thumbProps}
            render={(thumbAttributes, state) => (
              <span
                {...thumbAttributes}
                onPointerEnter={(event) => {
                  thumbAttributes.onPointerEnter?.(event);
                  setHoveredThumb(index);
                }}
                onPointerLeave={(event) => {
                  thumbAttributes.onPointerLeave?.(event);
                  setHoveredThumb(null);
                }}
              >
                {thumbAttributes.children}
                {thumbLabel && (
                  <span
                    role="tooltip"
                    className={cn(
                      'pointer-events-none absolute bottom-full z-10 mb-2 w-max group-focus-within/thumb:block border border-divider bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm',
                      state.dragging || hoveredThumb === index
                        ? 'block'
                        : 'hidden',
                      {
                        'left-0': state.values[index] === min,
                        'right-0': state.values[index] === max,
                        'left-1/2 -translate-x-1/2':
                          state.values[index] !== min &&
                          state.values[index] !== max,
                      },
                    )}
                  >
                    {thumbLabel(state.values[index])}
                  </span>
                )}
              </span>
            )}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
};
