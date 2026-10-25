'use client';

import {
  motion,
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

export const HomeWorkspace = ({
  search,
  children,
}: PropsWithChildren<{ search: ReactNode }>) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const [mobile, setMobile] = useState(false);
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll({ container: viewportRef });
  const searchY = useTransform(scrollY, (offset) =>
    mobile && !reducedMotion ? offset * 0.15 : 0,
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
    <div
      ref={viewportRef}
      className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none lg:overflow-visible"
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
        const remaining =
          viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
        const transfer = Math.min(Math.max(0, remaining), board.scrollTop);
        if (transfer > 0) {
          viewport.scrollTop += transfer;
          board.scrollTop -= transfer;
        }
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
  );
};
