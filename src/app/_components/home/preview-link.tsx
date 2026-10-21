import { cn } from 'cn';
import Link from 'next/link';
import { NavigationStatus } from '@/app/_components/shell/navigation-status';
import { buttonVariants } from '@/app/_components/ui/button';
import type { PreviewLinkProps } from '@/app/_types/home.types';

export const PreviewLink = ({ expanded }: PreviewLinkProps) => (
  <Link
    href={expanded ? '/' : '/?preview=tiers'}
    scroll={false}
    className={cn(
      buttonVariants({ variant: 'link' }),
      'h-10 justify-start rounded-none px-0 font-normal underline-offset-8',
    )}
    aria-label={expanded ? 'Close preview' : 'Explore the tiers'}
    aria-expanded={expanded}
    aria-controls="tier-preview"
  >
    <span aria-hidden="true" className="mr-2 text-muted-foreground">
      &gt;
    </span>
    {expanded ? 'close preview' : 'explore tiers'}
    <NavigationStatus />
  </Link>
);
