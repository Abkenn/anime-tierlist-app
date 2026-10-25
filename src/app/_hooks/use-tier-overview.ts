'use client';

import { useEffect, useState } from 'react';
import type { TierRank } from '@/app/_types/tierlist.types';

export type OverviewRow = {
  rank: TierRank;
  top: number;
  height: number;
  count: number;
};
type Overview = {
  canvasWidth: number;
  canvasHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  labelWidth: number;
  left: number;
  rows: OverviewRow[];
  top: number;
  height: number;
  overflowing: boolean;
};

export const useTierOverview = (viewport: HTMLElement | null) => {
  const [overview, setOverview] = useState<Overview>({
    rows: [],
    canvasWidth: 1,
    canvasHeight: 1,
    viewportWidth: 1,
    viewportHeight: 1,
    labelWidth: 96,
    left: 0,
    top: 0,
    height: 100,
    overflowing: false,
  });
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const [nearEdge, setNearEdge] = useState(false);

  const scrollToOffset = (top: number) => {
    if (viewport) {
      viewport.scrollTop = Math.max(
        0,
        Math.min(top, viewport.scrollHeight - viewport.clientHeight),
      );
    }
  };

  const jumpToRank = (rank: string) => {
    const row = Array.from(
      viewport?.querySelectorAll<HTMLElement>('[data-tier-rank]') ?? [],
    ).find((row) => row.dataset.tierRank === rank);
    if (row && viewport) {
      viewport.scrollTop +=
        row.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
      viewport.focus({ preventScroll: true });
    }
  };

  useEffect(() => {
    if (!viewport) {
      return;
    }

    let fadeTimer: ReturnType<typeof setTimeout>;
    let frame = 0;
    const media = window.matchMedia(
      '(min-width: 64rem) and (hover: hover) and (pointer: fine)',
    );
    const pageBoard = Boolean(viewport.closest('main'));

    const measure = () => {
      if (!media.matches) {
        return;
      }

      const bounds = viewport.getBoundingClientRect();
      const total = Math.max(1, viewport.scrollHeight);
      setOverview({
        canvasWidth: viewport.scrollWidth,
        canvasHeight: total,
        viewportWidth: viewport.clientWidth,
        viewportHeight: viewport.clientHeight,
        labelWidth:
          viewport
            .querySelector('[data-tier-rank]')
            ?.firstElementChild?.getBoundingClientRect().width ?? 96,
        left: viewport.scrollLeft,
        rows: Array.from(
          viewport.querySelectorAll<HTMLElement>('[data-tier-rank]'),
        ).map((row) => {
          const rect = row.getBoundingClientRect();

          return {
            rank: row.dataset.tierRank as TierRank,
            top: ((rect.top - bounds.top + viewport.scrollTop) / total) * 100,
            height: (rect.height / total) * 100,
            count: Number(row.dataset.tierCount ?? 0),
          };
        }),
        top: (viewport.scrollTop / total) * 100,
        height: Math.min(100, (viewport.clientHeight / total) * 100),
        overflowing: viewport.scrollHeight > viewport.clientHeight + 1,
      });
    };

    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    const onScroll = () => {
      if (!media.matches) {
        return;
      }

      setOverview((current) => ({
        ...current,
        top: (viewport.scrollTop / Math.max(1, viewport.scrollHeight)) * 100,
        left: viewport.scrollLeft,
        viewportWidth: viewport.clientWidth,
        viewportHeight: viewport.clientHeight,
      }));
      setScrolling(true);
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => setScrolling(false), 850);
    };

    const onPointerMove = (event: PointerEvent) => {
      const surface = viewport.closest('[data-slot="scroll-area"]') ?? viewport;
      const bounds = surface.getBoundingClientRect();
      const edgeWidth = Math.min(
        bounds.width,
        120,
        Math.max(48, bounds.width * 0.1),
      );

      setNearEdge(
        media.matches &&
          event.pointerType === 'mouse' &&
          event.clientX >= bounds.right - edgeWidth &&
          event.clientX <= bounds.right &&
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom,
      );
    };

    const leave = () => setNearEdge(false);

    const outsideBoard = (target: EventTarget | null) =>
      pageBoard &&
      target instanceof Element &&
      !target.closest(
        '[data-slot="scroll-area-viewport"], [aria-label="Anime search"], [role="dialog"], [role="alertdialog"], [role="menu"], input, textarea, select, [contenteditable="true"]',
      );

    const onWheel = (event: WheelEvent) => {
      if (
        !event.ctrlKey &&
        event.target instanceof Element &&
        event.target.closest('[data-tier-overview]')
      ) {
        event.preventDefault();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !outsideBoard(event.target) ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target instanceof Element && event.target.closest('button, a'))
      ) {
        return;
      }

      const moves: Record<string, number> = {
        PageDown: viewport.clientHeight * 0.85,
        PageUp: -viewport.clientHeight * 0.85,
        Home: -viewport.scrollHeight,
        End: viewport.scrollHeight,
      };
      if (event.key in moves) {
        event.preventDefault();
        viewport.scrollBy({ top: moves[event.key] });
      }
    };

    const onMediaChange = () => {
      setPreviewEnabled(media.matches);
      if (media.matches) {
        scheduleMeasure();
      } else {
        setNearEdge(false);
        setScrolling(false);
        clearTimeout(fadeTimer);
      }
    };

    media.addEventListener('change', onMediaChange);
    onMediaChange();
    const resize = new ResizeObserver(scheduleMeasure);
    resize.observe(viewport);
    if (viewport.firstElementChild) {
      resize.observe(viewport.firstElementChild);
    }

    const mutations = new MutationObserver(scheduleMeasure);
    mutations.observe(viewport, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'data-tier-rank',
        'data-tier-count',
        'data-tier-item-id',
        'style',
      ],
    });
    viewport.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    measure();

    return () => {
      clearTimeout(fadeTimer);
      cancelAnimationFrame(frame);
      resize.disconnect();
      media.removeEventListener('change', onMediaChange);
      mutations.disconnect();
      viewport.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', leave);
      window.removeEventListener('blur', leave);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [viewport]);

  return {
    ...overview,
    enabled: previewEnabled,
    visible: previewEnabled && overview.overflowing && (scrolling || nearEdge),
    jumpToRank,
    scrollToOffset,
    getScrollOffset: () => viewport?.scrollTop ?? 0,
    scrollByOffset: (offset: number) =>
      scrollToOffset((viewport?.scrollTop ?? 0) + offset),
    viewportId: viewport?.id,
    focusViewport: () => viewport?.focus({ preventScroll: true }),
  };
};
