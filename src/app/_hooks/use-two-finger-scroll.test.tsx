import { fireEvent, render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useTwoFingerScroll } from './use-two-finger-scroll';

const Area = ({ cancel, click }: { cancel: () => void; click: () => void }) => {
  const handlers = useTwoFingerScroll();

  return (
    <div data-slot="scroll-area" {...handlers}>
      <section data-slot="scroll-area-viewport">
        <button type="button" onPointerCancel={cancel} onClick={click}>
          Poster
        </button>
      </section>
    </div>
  );
};

it('cancels a poster drag, scrolls with two fingers, and suppresses the trailing import click', () => {
  const cancel = vi.fn();
  const click = vi.fn();
  vi.stubGlobal('PointerEvent', MouseEvent);
  const view = render(<Area cancel={cancel} click={click} />);
  const button = view.getByRole('button');
  const viewport = button.parentElement;
  if (!viewport) {
    throw new Error('Missing scroll viewport');
  }
  Object.defineProperties(viewport, {
    scrollHeight: { value: 1000 },
    clientHeight: { value: 100 },
  });
  const touches = (y: number) => [
    { target: button, clientX: 20, clientY: y },
    { target: button, clientX: 40, clientY: y },
  ];

  try {
    fireEvent.touchStart(button, { touches: touches(100) });
    expect(cancel).toHaveBeenCalledTimes(1);
    fireEvent.touchMove(button, { touches: touches(50) });
    expect(viewport.scrollTop).toBe(50);
    fireEvent.touchEnd(button, { touches: [touches(50)[0]] });
    fireEvent.touchMove(button, { touches: [touches(20)[0]] });
    expect(viewport.scrollTop).toBe(50);
    fireEvent.touchEnd(button, { touches: [] });
    fireEvent.click(button);
    expect(click).not.toHaveBeenCalled();
  } finally {
    view.unmount();
    vi.unstubAllGlobals();
  }
});
