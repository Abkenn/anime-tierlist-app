import { cn } from 'cn';

type TierLetter = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
export type TierColor =
  | TierLetter
  | `${TierLetter}${'+' | '−'}`
  | 'Dropped'
  | 'Watching';

type TierRowProps = {
  rank: string;
  color: TierColor;
  active?: boolean;
  itemCount?: number;
};

export const TierRow = ({
  rank,
  color,
  active = false,
  itemCount = 0,
}: TierRowProps) => (
  <li
    className="grid min-h-16 grid-cols-[clamp(5rem,8vw,7rem)_minmax(0,1fr)] lg:min-h-9 border-[#111] not-first:border-t"
    data-tier-rank={rank}
    aria-label={
      itemCount ? `${rank} tier, ${itemCount} items` : `${rank} tier, empty`
    }
  >
    <div
      className={cn(
        'flex items-center justify-center border-r border-[#111] p-2 text-sm text-[#202020]',
        {
          'bg-[hsl(300_64%_73%)]': color === 'S+',
          'bg-[hsl(355_64%_73%)]': color === 'S',
          'bg-[hsl(12_64%_73%)]': color === 'S−',
          'bg-[hsl(28_64%_73%)]': color === 'A+',
          'bg-[hsl(40_64%_73%)]': color === 'A',
          'bg-[hsl(50_64%_73%)]': color === 'A−',
          'bg-[hsl(65_64%_73%)]': color === 'B+',
          'bg-[hsl(80_64%_73%)]': color === 'B',
          'bg-[hsl(95_64%_73%)]': color === 'B−',
          'bg-[hsl(112_64%_73%)]': color === 'C+',
          'bg-[hsl(130_64%_73%)]': color === 'C',
          'bg-[hsl(145_64%_73%)]': color === 'C−',
          'bg-[hsl(160_64%_73%)]': color === 'D+',
          'bg-[hsl(180_64%_73%)]': color === 'D',
          'bg-[hsl(195_64%_73%)]': color === 'D−',
          'bg-[hsl(210_64%_73%)]': color === 'F+',
          'bg-[hsl(225_64%_73%)]': color === 'F',
          'bg-[hsl(240_64%_73%)]': color === 'F−',
          'bg-[#a39bdf]': color === 'Dropped',
          'bg-[#aaa9a5]': color === 'Watching',
        },
      )}
    >
      {rank}
    </div>
    <div
      className={cn(
        'min-w-0 transition-colors duration-150 motion-reduce:transition-none',
        active && 'bg-white/10 ring-1 ring-inset ring-white/40',
      )}
    />
  </li>
);
