import { Skeleton } from '@/app/_components/ui/skeleton';

export const AnimeSearchSkeleton = () => (
  <div
    aria-hidden="true"
    className="grid grid-cols-3 justify-items-center gap-x-0.5 gap-y-2 pb-2"
  >
    {[1, 2, 3, 4, 5, 6].map((id) => (
      <Skeleton key={id} className="aspect-2/3 h-24 max-w-full" />
    ))}
  </div>
);
