const DRAG_SCROLL_SPEED_MULTIPLIER = 3;

type ScrollTierDragInput = {
  board: HTMLElement;
  x: number;
  y: number;
  delta: number;
};

export const scrollTierDrag = ({ board, x, y, delta }: ScrollTierDragInput) => {
  let changed = false;
  const rem = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  const edge = rem * 2;
  const elapsed = Math.min(delta, 32) / 1000;

  const speed = (position: number, start: number, end: number) => {
    const distance =
      position < start + edge
        ? position - start - edge
        : Math.max(0, position - end + edge);

    const limit = rem * 24 * DRAG_SCROLL_SPEED_MULTIPLIER;

    return (
      Math.max(
        -limit,
        Math.min(limit, distance * 8 * DRAG_SCROLL_SPEED_MULTIPLIER),
      ) * elapsed
    );
  };

  document
    .querySelectorAll<HTMLElement>('[data-slot="scroll-area-viewport"]')
    .forEach((viewport) => {
      if (!viewport.contains(board)) {
        return;
      }

      const bounds = viewport.getBoundingClientRect();
      const tiers = viewport.querySelector<HTMLElement>(
        '[aria-label="Ranked tiers"]',
      );
      const content = tiers?.getBoundingClientRect();
      const maxTop = content
        ? Math.max(
            0,
            content.bottom -
              bounds.top +
              viewport.scrollTop -
              viewport.clientHeight,
          )
        : Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      const previousX = viewport.scrollLeft;
      const previousY = viewport.scrollTop;

      if (
        x >= bounds.left &&
        x <= bounds.right &&
        viewport.scrollHeight > viewport.clientHeight
      ) {
        viewport.scrollTop = Math.max(
          0,
          Math.min(
            maxTop,
            viewport.scrollTop + speed(y, bounds.top, bounds.bottom),
          ),
        );
      }

      if (
        y >= bounds.top &&
        y <= bounds.bottom &&
        viewport.scrollWidth > viewport.clientWidth
      ) {
        viewport.scrollLeft += speed(x, bounds.left, bounds.right);
      }

      changed ||=
        previousX !== viewport.scrollLeft || previousY !== viewport.scrollTop;
    });

  return changed;
};
