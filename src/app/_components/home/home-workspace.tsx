'use client';

import { ArrowUp } from 'lucide-react';
import { type PropsWithChildren, type ReactNode, useEffect, useRef, useState } from 'react';

export const HomeWorkspace = ({ search, children }: PropsWithChildren<{ search: ReactNode }>) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [searchHidden, setSearchHidden] = useState(false);

  const revealSearch = () => {
    viewportRef.current?.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    const search = searchRef.current;
    if (!viewport || !search) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setSearchHidden(!entry.isIntersecting);
        }
      },
      { root: viewport },
    );
    observer.observe(search);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={viewportRef}
        data-tier-workspace-scroll=""
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-x-contain scrollbar-gutter-stable lg:overflow-visible lg:overscroll-contain lg:scrollbar-gutter-auto"
      >
        <div className="flex min-h-full min-w-0 flex-col gap-4 lg:h-full lg:flex-row">
          <div ref={searchRef} className="shrink-0 lg:flex lg:min-h-0 lg:w-64 lg:self-stretch">
            {search}
          </div>

          <div className="flex min-h-0 min-w-0 shrink-0 flex-col lg:h-full lg:flex-1">
            {children}
          </div>
        </div>
      </div>

      {searchHidden && (
        <button
          type="button"
          aria-label="Back to search"
          title="Back to search"
          onClick={revealSearch}
          className="absolute -top-11 right-0 z-40 flex size-11 cursor-pointer items-center justify-center bg-background/95 text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden"
        >
          <ArrowUp aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
};
