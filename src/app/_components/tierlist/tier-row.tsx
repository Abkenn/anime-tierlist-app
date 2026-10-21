import { cn } from 'cn';

type TierLetter = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
export type TierColor =
  | TierLetter
  | `${TierLetter}${'+' | '−'}`
  | 'Dropped'
  | 'Watching';

type TierRowProps = { rank: string; color: TierColor };

export const TierRow = ({ rank, color }: TierRowProps) => (
  <li
    className="grid min-h-27 grid-cols-[clamp(5rem,12vw,7.5rem)_minmax(0,1fr)] border-[#111] not-first:border-t"
    aria-label={`${rank} tier, empty`}
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
    <div className="grid auto-rows-27 grid-cols-[repeat(auto-fill,4.5rem)] content-start" />
  </li>
);
