import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { TierlistRestorationContext } from '@/app/_lib/tierlist-restoration-context';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';
import { TierBoard } from './tier-board';

const renderBoard = (restoring: boolean) => {
  const markup = renderToStaticMarkup(
    <TierBoardProvider>
      <TierlistRestorationContext value={restoring}>
        <TierBoard ranks={['S+', 'S', 'A']} initialItemCount={0} />
      </TierlistRestorationContext>
    </TierBoardProvider>,
  );
  return new DOMParser().parseFromString(markup, 'text/html');
};

it('prerenders visible rows with bell-curve placeholders only while restoring', () => {
  const loading = renderBoard(true);
  const rows = [...loading.querySelectorAll('[data-tier-rank]')];
  expect(rows).toHaveLength(3);
  expect(
    rows.map((row) => row.querySelectorAll('[data-tier-item-skeleton]').length),
  ).toEqual([5, 8, 5]);
  expect(
    loading
      .querySelector('[inert][aria-busy="true"]')
      ?.classList.contains('invisible'),
  ).toBe(false);
  expect(loading.querySelectorAll('[data-tier-item-id]')).toHaveLength(0);

  const restored = renderBoard(false);
  expect(restored.querySelectorAll('[data-tier-rank]')).toHaveLength(3);
  expect(restored.querySelectorAll('[data-tier-item-skeleton]')).toHaveLength(
    0,
  );
});
