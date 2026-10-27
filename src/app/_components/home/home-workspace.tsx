'use client';

import { ArrowUp } from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import {
  type PropsWithChildren,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useMobileBoardScroll } from '@/app/_hooks/use-mobile-board-scroll';
import { transferBoardScroll } from '@/app/_lib/touch-scroll';

export const HomeWorkspace = ({
  search,
  children,
}: PropsWithChildren<{ search: ReactNode }>) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const [mobile, setMobile] = useState(false);
  const [searchHidden, setSearchHidden] = useState(false);
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll({ container: viewportRef });
  const searchY = useTransform(scrollY, (offset) =>
    mobile && !reducedMotion ? offset * 0.15 : 0,
  );

  const revealSearch = useMobileBoardScroll({
    enabled: mobile,
    viewportRef,
    boardRef,
  });

  useMotionValueEvent(scrollY, 'change', (offset) =>
    setSearchHidden(offset > 2),
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const boardViewport = boardRef.current?.querySelector<HTMLElement>(
      '[data-tier-viewport]',
    );
    const media = window.matchMedia('(max-width: 63.999rem)');
    const measure = () => {
      setMobile(media.matches);
      const controlsHeight =
        boardViewport && boardRef.current
          ? boardViewport.getBoundingClientRect().top -
            boardRef.current.getBoundingClientRect().top
          : 0;
      setHeight(viewport.clientHeight + controlsHeight);
      if (!media.matches) {
        viewport.scrollTop = 0;
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    if (boardViewport) {
      observer.observe(boardViewport);
    }
    media.addEventListener('change', measure);
    measure();

    return () => {
      observer.disconnect();
      media.removeEventListener('change', measure);
    };
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={viewportRef}
        data-tier-workspace-scroll=""
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-x-contain overscroll-y-auto scrollbar-none lg:overflow-visible lg:overscroll-contain"
        onScrollCapture={(event) => {
          const viewport = viewportRef.current;
          const board = event.target;
          if (
            !mobile ||
            !viewport ||
            !(board instanceof HTMLElement) ||
            !board.matches('[data-tier-viewport]')
          ) {
            return;
          }

          // Consume forward board scrolling with the search reveal first.
          transferBoardScroll(viewport, board);
        }}
      >
        <div className="flex min-h-full min-w-0 flex-col gap-4 lg:h-full lg:flex-row">
          <div className="shrink-0 overflow-clip lg:flex lg:min-h-0 lg:w-64 lg:overflow-visible">
            <motion.div
              style={{ y: searchY }}
              className="lg:flex lg:min-h-0 lg:flex-1"
            >
              {search}
            </motion.div>
          </div>

          <div
            ref={boardRef}
            style={{ height: mobile ? height : undefined }}
            className="flex min-h-0 min-w-0 shrink-0 flex-col lg:h-full lg:flex-1"
          >
            {children}
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {mobile && searchHidden && (
          <motion.button
            key="reveal-search"
            type="button"
            aria-label="Back to search"
            title="Back to search"
            onClick={revealSearch}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.15 }}
            className="absolute -top-11 right-0 z-40 flex size-10 cursor-pointer items-center justify-center bg-background/95 text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden"
          >
            <ArrowUp aria-hidden="true" className="size-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
