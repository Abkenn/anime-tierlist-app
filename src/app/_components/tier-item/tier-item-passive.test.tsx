import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { type ComponentProps, useEffect, useRef } from 'react';
import { expect, it, vi } from 'vitest';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';
import { TierItemInteractionHost } from './tier-item-interaction-host';
import { TierItemPassive } from './tier-item-passive';

const controllers = vi.hoisted(() => new Set<symbol>());

const menuRoots = vi.hoisted(() => new Set<symbol>());

vi.mock('@base-ui/react/menu', async (load) => {
  const original = await load<typeof import('@base-ui/react/menu')>();
  const Root = original.Menu.Root;
  const TrackedMenuRoot = (props: ComponentProps<typeof Root>) => {
    const token = useRef(Symbol('menu')).current;
    useEffect(() => {
      menuRoots.add(token);
      return () => {
        menuRoots.delete(token);
      };
    }, [token]);
    return <Root {...props} />;
  };
  return { ...original, Menu: { ...original.Menu, Root: TrackedMenuRoot } };
});

vi.mock('@/app/_hooks/use-tier-crop', async (load) => {
  const original = await load<typeof import('@/app/_hooks/use-tier-crop')>();
  return {
    ...original,
    useTierCrop: (input: Parameters<typeof original.useTierCrop>[0]) => {
      const token = useRef(Symbol('controller')).current;
      useEffect(() => {
        controllers.add(token);
        return () => {
          controllers.delete(token);
        };
      }, [token]);
      return original.useTierCrop(input);
    },
  };
});

it('keeps inactive posters lightweight and retains the button when transferring the single interaction controller', () => {
  const posters = Array.from({ length: 100 }, (_, index) => ({
    id: `item-${index}`,
    label: `Series ${index}`,
    x: `${index * 4}rem`,
  }));
  const result = render(
    <TierBoardProvider>
      <TierItemInteractionHost>
        {posters.map((poster) => (
          <TierItemPassive
            key={poster.id}
            id={poster.id}
            label={poster.label}
            rank="S"
            position={{
              x: poster.x,
              y: '0rem',
              width: '4rem',
              height: '6rem',
            }}
          />
        ))}
      </TierItemInteractionHost>
    </TierBoardProvider>,
  );
  expect(controllers.size).toBe(0);
  expect(menuRoots.size).toBe(1);
  const first = screen.getByRole('button', {
    name: 'Item Series 0 in S',
  });
  const second = screen.getByRole('button', {
    name: 'Item Series 1 in S',
  });
  fireEvent.pointerEnter(first, { pointerType: 'mouse' });
  expect(controllers.size).toBe(0);
  act(() => first.focus());
  expect(controllers.size).toBe(1);
  expect(screen.getByRole('button', { name: 'Item Series 0 in S' })).toBe(
    first,
  );
  act(() => second.focus());
  expect(controllers.size).toBe(1);
  expect(screen.getByRole('button', { name: 'Item Series 0 in S' })).toBe(
    first,
  );
  expect(second).toHaveFocus();
  expect(menuRoots.size).toBe(1);
  result.unmount();
  expect(controllers.size).toBe(0);
  expect(menuRoots.size).toBe(0);
});

it('closes the shared popup when its active poster is removed and leaves other posters usable', async () => {
  const board = (id: string) => (
    <TierBoardProvider>
      <TierItemInteractionHost>
        <TierItemPassive
          key={id}
          id={id}
          label={id}
          rank="S"
          position={{ x: '0rem', y: '0rem', width: '4rem', height: '6rem' }}
        />
      </TierItemInteractionHost>
    </TierBoardProvider>
  );
  const result = render(board('before'));
  fireEvent.contextMenu(
    screen.getByRole('button', { name: 'Item before in S' }),
  );
  await waitFor(() =>
    expect(
      document.querySelector('[data-slot="context-menu-content"]'),
    ).not.toBeNull(),
  );
  result.rerender(board('after'));
  await waitFor(() =>
    expect(
      document.querySelector('[data-slot="context-menu-content"]'),
    ).toBeNull(),
  );
  act(() => screen.getByRole('button', { name: 'Item after in S' }).focus());
  expect(controllers.size).toBe(1);
  expect(menuRoots.size).toBe(1);
  result.unmount();
});
