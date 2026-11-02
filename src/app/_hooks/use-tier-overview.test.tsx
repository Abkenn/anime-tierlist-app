import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useTierOverview } from './use-tier-overview';

const reads = vi.hoisted(() => new Set<() => void>());

vi.mock('motion/react', () => ({
  frame: { read: (callback: () => void) => reads.add(callback) },
  cancelFrame: (callback: () => void) => reads.delete(callback),
}));

afterEach(() => {
  reads.clear();
  vi.unstubAllGlobals();
});

it('reveals on the inside right edge and scrollbar, not outside the board or on touch', () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const surface = document.createElement('div');
  surface.dataset.slot = 'scroll-area';
  const viewport = document.createElement('section');
  surface.append(viewport);
  surface.getBoundingClientRect = () => ({
    left: 100,
    right: 900,
    top: 100,
    bottom: 700,
    width: 800,
    height: 600,
    x: 100,
    y: 100,
    toJSON() {},
  });
  Object.defineProperties(viewport, {
    scrollHeight: { value: 1200 },
    clientHeight: { value: 600 },
  });
  const { result } = renderHook(() => useTierOverview(viewport));
  const hover = (x: number, y: number, pointerType = 'mouse') => {
    const event = new MouseEvent('pointermove', { clientX: x, clientY: y });
    Object.defineProperty(event, 'pointerType', { value: pointerType });
    act(() => {
      window.dispatchEvent(event);
      reads.forEach((read) => {
        read();
      });
      reads.clear();
    });
  };

  hover(850, 300);
  expect(result.current.visible).toBe(true);
  hover(899, 300);
  expect(result.current.visible).toBe(true);
  hover(920, 300);
  expect(result.current.visible).toBe(false);
  hover(850, 80);
  expect(result.current.visible).toBe(false);
  hover(500, 300);
  expect(result.current.visible).toBe(false);
  const geometryRead = vi.spyOn(surface, 'getBoundingClientRect');
  hover(850, 300, 'touch');
  expect(result.current.visible).toBe(false);
  expect(geometryRead).not.toHaveBeenCalled();

  act(() => {
    Array.from({ length: 20 }).forEach(() => {
      const event = new MouseEvent('pointermove', {
        clientX: 850,
        clientY: 300,
      });
      Object.defineProperty(event, 'pointerType', { value: 'mouse' });
      window.dispatchEvent(event);
    });
  });
  expect(geometryRead).not.toHaveBeenCalled();
  expect(reads.size).toBe(1);
  act(() => {
    reads.forEach((read) => {
      read();
    });
    reads.clear();
  });
  expect(geometryRead).toHaveBeenCalledOnce();
  expect(result.current.visible).toBe(true);
});
