import { cn } from 'cn';

import type { TierColor } from '@/app/_types/tierlist.types';

type TierRowProps = {
  rank: string;
  color: TierColor;
  active?: boolean;
  itemCount?: number;
  columns?: number;
  lines?: number;
};

export const TierRow = ({
  rank,
  color,
  active = false,
  itemCount = 0,
  columns,
  lines = 1,
}: TierRowProps) => (
  <li
    className={cn(
      'grid min-h-16 border-ink not-first:border-t',
      columns
        ? 'grid-cols-[clamp(4.5rem,5vw,6rem)_max-content]'
        : 'grid-cols-[clamp(4.5rem,5vw,6rem)_minmax(0,1fr)] lg:min-h-9',
    )}
    data-tier-rank={rank}
    aria-label={
      itemCount ? `${rank} tier, ${itemCount} items` : `${rank} tier, empty`
    }
  >
    <div
      className={cn(
        'flex items-center justify-center border-r border-ink p-2 text-sm text-graphite',
        rank.length > 2 && 'px-1.5 text-xs',
        {
          'bg-orchid': color === 'orchid',
          'bg-rose': color === 'rose',
          'bg-salmon': color === 'salmon',
          'bg-apricot': color === 'apricot',
          'bg-gold': color === 'gold',
          'bg-yellow': color === 'yellow',
          'bg-citron': color === 'citron',
          'bg-chartreuse': color === 'chartreuse',
          'bg-lime': color === 'lime',
          'bg-leaf': color === 'leaf',
          'bg-mint': color === 'mint',
          'bg-jade': color === 'jade',
          'bg-seafoam': color === 'seafoam',
          'bg-aqua': color === 'aqua',
          'bg-sky': color === 'sky',
          'bg-azure': color === 'azure',
          'bg-periwinkle': color === 'periwinkle',
          'bg-lavender': color === 'lavender',
          'bg-wisteria': color === 'wisteria',
          'bg-stone': color === 'stone',
        },
      )}
    >
      {rank}
    </div>
    <div
      className={cn(
        'min-w-0 transition-colors duration-150 motion-reduce:transition-none',
        active && 'bg-white/10 ring-1 ring-inset ring-white/40',
        columns && 'grid grid-flow-col auto-cols-15 gap-0.5 p-0.5',
        columns &&
          (lines === 2
            ? 'grid-rows-[repeat(2,3.75rem)]'
            : 'grid-rows-[3.75rem]'),
      )}
    >
      {columns &&
        Array.from(
          { length: columns * lines },
          (_, index) => `slot-${index}`,
        ).map((slot) => <span key={slot} aria-hidden="true" />)}
    </div>
  </li>
);
