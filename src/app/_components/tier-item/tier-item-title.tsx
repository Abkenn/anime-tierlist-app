'use client';

import { cn } from 'cn';
import { motion } from 'motion/react';
import { useTierTitleFrame } from '@/app/_hooks/use-tier-title-frame';
import { useTitleColors } from '@/app/_hooks/use-title-colors';
import { rankTextColor } from '@/app/_lib/rank-text-color';
import { getTierTitleLayout } from '@/app/_lib/tier-title-layout';
import type {
  TierItemTitle as ItemTitle,
  TierCrop,
  TierImage,
  TierImageMode,
  TierImageTrim,
} from '@/app/_types/tierlist.types';

type TierItemTitleProps = {
  title: ItemTitle;
  image?: TierImage;
  mode: TierImageMode;
  trim?: TierImageTrim;
  crop?: TierCrop;
};

export const TierItemTitle = ({
  title,
  image,
  mode,
  trim,
  crop,
}: TierItemTitleProps) => {
  const { ref, frame, width, height } = useTierTitleFrame({
    image,
    mode,
    trim,
  });
  const layout = getTierTitleLayout(title, width, height);
  const colors = useTitleColors(
    [{ id: 'title', label: title.text, rank: 'S+', image, trim, crop, title }],
    mode,
  );
  const color = colors.get('title') ?? title.color;
  const outline = rankTextColor(color);

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
          animate={{
            color,
            fontSize: layout.fontSize,
            textShadow: `0 1px 2px ${outline}, 0 0 2px ${outline}`,
          }}
          transition={{ duration: 0 }}
          className={cn(
            'absolute inset-x-0 px-1 text-center font-sans font-semibold [text-shadow:0_0.0625rem_0.125rem_var(--ink),0_0_0.125rem_var(--ink)]',
            'leading-tight',
            {
              'top-1': title.position === 'top',
              'top-1/2 -translate-y-1/2': title.position === 'middle',
              'bottom-1': title.position === 'bottom',
            },
          )}
        >
          <span className={cn('line-clamp-4 whitespace-pre')}>
            {layout.lines.join('\n')}
          </span>
        </motion.span>
      </motion.span>
    </span>
  );
};
