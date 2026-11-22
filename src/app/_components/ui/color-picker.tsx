'use client';

import { cn } from 'cn';
import { SwatchBook } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { ColorPickerProps } from './color-picker-editor';

const ColorPickerEditor = dynamic(() =>
  import('./color-picker-editor').then((module) => module.ColorPickerEditor),
);

export const ColorPicker = (props: ColorPickerProps) => {
  const [activated, setActivated] = useState(false);

  return activated ? (
    <ColorPickerEditor {...props} initialOpen />
  ) : (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      aria-haspopup="dialog"
      aria-expanded={false}
      onClick={() => {
        props.onOpen?.();
        setActivated(true);
      }}
      className={cn(
        'flex cursor-pointer items-center focus-visible:outline-2',
        props.inline
          ? 'min-h-11 w-full px-3 text-left text-sm hover:bg-muted'
          : 'absolute right-0 bottom-0 size-6 justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-60',
      )}
    >
      {props.inline ? (
        'Change color'
      ) : (
        <SwatchBook
          aria-hidden="true"
          className="size-[clamp(0.625rem,calc(var(--tier-size)*0.1),0.875rem)]"
        />
      )}
    </button>
  );
};
