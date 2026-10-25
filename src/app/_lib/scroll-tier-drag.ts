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

    return Math.max(-rem * 24, Math.min(rem * 24, distance * 8)) * elapsed;
  };

  document
    .querySelectorAll<HTMLElement>('[data-slot="scroll-area-viewport"]')
    .forEach((viewport) => {
      if (!viewport.contains(board)) {
        return;
      }

      const bounds = viewport.getBoundingClientRect();
      const previousX = viewport.scrollLeft;
      const previousY = viewport.scrollTop;

      if (
        x >= bounds.left &&
        x <= bounds.right &&
        viewport.scrollHeight > viewport.clientHeight
      ) {
        viewport.scrollTop += speed(y, bounds.top, bounds.bottom);
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
