'use client';

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
      className="absolute right-0 bottom-0 flex size-6 cursor-pointer items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-60"
    >
      <SwatchBook
        aria-hidden="true"
        className="size-[clamp(0.625rem,calc(var(--tier-size)*0.1),0.875rem)]"
      />
    </button>
  );
};
