import type { PropsWithChildren, Ref } from 'react';
import { ScrollArea } from '@/app/_components/ui/scroll-area';

type TierViewportProps = PropsWithChildren<{
  ref?: Ref<HTMLElement>;
  scrollable: boolean;
}>;

export const TierViewport = ({
  children,
  ref,
  scrollable,
}: TierViewportProps) => {
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
    <ScrollArea
      orientation="horizontal"
      className="min-w-0"
      viewportProps={{
        render: (
          <section
            ref={ref}
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
