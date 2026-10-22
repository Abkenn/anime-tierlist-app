import type { PropsWithChildren, RefObject } from 'react';
import { ScrollArea } from '@/app/_components/ui/scroll-area';

type TierViewportProps = PropsWithChildren<{
  viewportRef: RefObject<HTMLElement | null>;
  twoLine: boolean;
}>;

export const TierViewport = ({
  children,
  viewportRef,
  twoLine,
}: TierViewportProps) => {
  if (!twoLine) {
    return (
      <section
        ref={viewportRef}
        data-tier-viewport=""
        className="min-w-0"
        aria-label="Tierlist board viewport"
      >
        {children}
      </section>
    );
  }

  return (
    <ScrollArea
      orientation="horizontal"
      className="min-w-0"
      viewportProps={{
        ref: (element) => {
          viewportRef.current = element;
        },
        render: (
          <section
            data-tier-viewport=""
            aria-label="Tierlist horizontal scroll"
          />
        ),
        className: 'max-h-[calc(100dvh-5rem)] overscroll-x-contain',
        tabIndex: 0,
      }}
    >
      {children}
    </ScrollArea>
  );
};
