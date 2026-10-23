'use client';

import { cn } from 'cn';
import { motion } from 'motion/react';
import { useTierTitleFrame } from '@/app/_hooks/use-tier-title-frame';
import type {
  TierItemTitle as ItemTitle,
  TierImage,
  TierImageMode,
  TierImageTrim,
} from '@/app/_types/tierlist.types';

const fontSizes = [
  'text-[clamp(0.25rem,min(24cqi,calc((100cqb-0.5rem)/1.25)),0.875rem)]',
  'text-[clamp(0.25rem,min(24cqi,calc((100cqb-0.5rem)/2.5)),0.875rem)]',
  'text-[clamp(0.25rem,min(24cqi,calc((100cqb-0.5rem)/3.75)),0.875rem)]',
  'text-[clamp(0.25rem,min(24cqi,calc((100cqb-0.5rem)/5)),0.875rem)]',
];

type TierItemTitleProps = {
  title: ItemTitle;
  image?: TierImage;
  mode: TierImageMode;
  trim?: TierImageTrim;
};

export const TierItemTitle = ({
  title,
  image,
  mode,
  trim,
}: TierItemTitleProps) => {
  const { ref, frame } = useTierTitleFrame({ image, mode, trim });
  const lines = title.wrap ? 4 : Math.min(4, title.text.split('\n').length);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-tier-title=""
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      <motion.span
        initial={false}
        animate={frame}
        transition={{ duration: 0 }}
        className="@container-size relative block overflow-hidden"
      >
        <motion.span
          initial={false}
          animate={{ color: title.color }}
          transition={{ duration: 0 }}
          className={cn(
            'absolute inset-x-0 px-1 text-center font-sans font-semibold [text-shadow:0_0.0625rem_0.125rem_var(--ink),0_0_0.125rem_var(--ink)]',
            fontSizes[lines - 1],
            'leading-tight',
            {
              'top-1': title.position === 'top',
              'top-1/2 -translate-y-1/2': title.position === 'middle',
              'bottom-1': title.position === 'bottom',
            },
          )}
        >
          <span
            className={cn(
              'line-clamp-4',
              title.wrap
                ? 'whitespace-pre-wrap wrap-anywhere'
                : 'whitespace-pre',
            )}
          >
            {title.text}
          </span>
        </motion.span>
      </motion.span>
    </span>
  );
};
