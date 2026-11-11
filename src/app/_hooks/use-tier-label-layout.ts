'use client';

import { type RefObject, useLayoutEffect, useState } from 'react';
import { getTierLabelLayout } from '@/app/_lib/tier-label-layout';

type TierLabelInput = {
  ref: RefObject<HTMLElement | null>;
  label: string;
  editing: boolean;
};

export const useTierLabelLayout = ({ ref, label, editing }: TierLabelInput) => {
  const [layout, setLayout] = useState<{
    label: string;
    fontSize?: number;
    lines: string[];
  }>({ label, lines: [label] });
  useLayoutEffect(() => {
    const root = ref.current;
    const text = root?.querySelector<HTMLElement>('[data-tier-label]');
    if (!root || !text || editing) {
      return;
    }
    if (
      /^[A-FS][+−]?$/u.test(label) &&
      root.clientWidth >= Number.parseFloat(getComputedStyle(root).fontSize) * 3
    ) {
      return;
    }
    let active = true;
    let frame: number | undefined;
    const context = document.createElement('canvas').getContext('2d');
    const measure = () => {
      if (!active) {
        return;
      }
      const style = getComputedStyle(text);
      const parent = getComputedStyle(root);
      const width = Math.max(
        1,
        text.clientWidth -
          Number.parseFloat(style.paddingLeft) -
          Number.parseFloat(style.paddingRight),
      );
      const height = Math.max(
        1,
        root.clientHeight -
          Number.parseFloat(parent.paddingTop) -
          Number.parseFloat(parent.paddingBottom) -
          Number.parseFloat(style.paddingTop) -
          Number.parseFloat(style.paddingBottom),
      );
      if (context) {
        context.font = `${style.fontWeight} 100px ${style.fontFamily}`;
      }
      const next = getTierLabelLayout({
        text: label,
        width,
        height,
        fontSize: Number.parseFloat(parent.fontSize),
        measure: context
          ? (word) => context.measureText(word).width / 100
          : undefined,
      });
      setLayout((current) =>
        current.label === label &&
        current.fontSize === next.fontSize &&
        current.lines.join('\n') === next.lines.join('\n')
          ? current
          : { label, ...next },
      );
    };
    const scheduleMeasure = () => {
      if (active && frame === undefined) {
        frame = requestAnimationFrame(() => {
          frame = undefined;
          measure();
        });
      }
    };
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(root);
    observer.observe(text);
    document.fonts?.ready.then(scheduleMeasure);
    scheduleMeasure();
    return () => {
      active = false;
      observer.disconnect();
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    };
  }, [ref, label, editing]);
  return layout.label === label
    ? layout
    : { lines: [label], fontSize: undefined };
};
