'use client';

import { type PropsWithChildren, type Ref, useCallback, useState } from 'react';
import { ScrollArea } from '@/app/_components/ui/scroll-area';
import { useTierOverview } from '@/app/_hooks/use-tier-overview';
import { TierScrollOverview } from './tier-scroll-overview';

type TierViewportProps = PropsWithChildren<{
  ref?: Ref<HTMLElement>;
  scrollable: boolean;
}>;

export const TierViewport = ({
  children,
  ref,
  scrollable,
}: TierViewportProps) => {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const overview = useTierOverview(viewport);
  const bindViewport = useCallback(
    (element: HTMLElement | null) => {
      setViewport(element);
      if (typeof ref === 'function') {
        return ref(element);
      }
      if (ref) {
        ref.current = element;
      }
    },
    [ref],
  );

  if (!scrollable) {
    return (
      <section
        ref={ref}
        data-tier-viewport=""
        className="min-w-0"
        aria-label="Tierlist board viewport"
      >
        {children}
      </section>
    );
  }

  return (
    <div className="relative min-h-0 min-w-0 flex-1">
      <ScrollArea
        orientation="both"
        className="h-full min-h-0 min-w-0"
        viewportProps={{
          render: (
            <section
              ref={bindViewport}
              data-tier-viewport=""
              aria-label="Tierlist board scroll"
            />
          ),
          className: 'overscroll-contain',
          tabIndex: 0,
        }}
      >
        {children}
      </ScrollArea>

      <TierScrollOverview overview={overview} />
    </div>
  );
};
