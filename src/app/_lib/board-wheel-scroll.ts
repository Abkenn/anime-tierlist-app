type BoardWheelInput = { viewport: HTMLElement; event: WheelEvent };

export const scrollBoardWheel = ({ viewport, event }: BoardWheelInput) => {
  if (
    event.defaultPrevented ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    Math.abs(event.deltaX) >= Math.abs(event.deltaY) ||
    viewport.scrollHeight > viewport.clientHeight + 1 ||
    viewport.scrollWidth <= viewport.clientWidth + 1
  ) {
    return false;
  }
  if (
    event.target instanceof Element &&
    event.target.closest(
      'input, textarea, select, [contenteditable="true"], [role="slider"], [data-slot="scroll-area-scrollbar"]',
    )
  ) {
    return false;
  }
  const units: Record<number, number> = {
    0: 1,
    1: 16,
    2: viewport.clientWidth,
  };
  const unit = units[event.deltaMode] ?? 1;
  const next = Math.max(
    0,
    Math.min(
      viewport.scrollWidth - viewport.clientWidth,
      viewport.scrollLeft + event.deltaY * unit,
    ),
  );
  if (next === viewport.scrollLeft) {
    return false;
  }
  event.preventDefault();
  viewport.scrollLeft = next;
  return true;
};
