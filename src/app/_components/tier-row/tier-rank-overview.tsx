'use client';

import { cn } from 'cn';
import { useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import { useRef } from 'react';
import { rankDetailsAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { useTierLabelLayout } from '@/app/_hooks/use-tier-label-layout';
import { contrastingTextColor } from '@/app/_lib/text-contrast';
import { tierColorClasses, tierColors } from '@/app/_lib/tier-colors';
import type { TierRank } from '@/app/_types/tierlist.types';

export const TierRankOverview = ({ rank }: { rank: TierRank }) => {
  const details = useAtomValue(rankDetailsAtom);
  const ref = useRef<HTMLDivElement>(null);
  const label = details[rank]?.label ?? rank;
  const color = details[rank]?.color;
  const layout = useTierLabelLayout({ ref, label, editing: false });

  return (
    <motion.div
      ref={ref}
      animate={color ? { backgroundColor: color, color: contrastingTextColor(color) } : undefined}
      className={cn(
        'relative flex min-h-(--tier-size,5rem) self-stretch items-center justify-center border-r border-ink text-graphite text-sm',
        label.length > 4 && 'min-h-24',
        tierColorClasses[tierColors[rank] ?? 'stone'],
      )}
    >
      <div
        data-tier-label=""
        style={{ fontSize: layout.fontSize }}
        className="min-w-0 w-full text-center leading-tight"
      >
        {layout.lines.map((line, index) => (
          <span
            key={layout.lines.slice(0, index + 1).join(' ')}
            className="block whitespace-nowrap"
          >
            {line}
          </span>
        ))}
      </div>
    </motion.div>
  );
};
