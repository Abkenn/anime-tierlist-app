import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { MalImport } from './mal-import';

const generate = vi.hoisted(() => vi.fn());
vi.mock('@/app/_services/generate-mal-tierlist', () => ({
  generateMalTierlist: generate,
}));

it('reviews generated results before applying and requires explicit replacement confirmation', async () => {
  const document = {
    version: 1 as const,
    items: [{ id: 'mal-1', malId: 1, label: 'Test', rank: 'A' as const }],
    ranks: ['A' as const],
    imageMode: 'natural' as const,
  };
  generate.mockResolvedValue({
    document,
    series: [{ id: 1 }],
    completed: 3,
    skipped: 1,
  });
  const onApply = vi.fn(async () => {});
  const onApplied = vi.fn();
  render(
    <MalImport
      busy={false}
      seed={'a'.repeat(64)}
      revision={7}
      hasItems
      onApply={onApply}
      onApplied={onApplied}
    />,
  );
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Public MAL username' }),
    { target: { value: 'Abkenn' } },
  );
  fireEvent.click(screen.getByRole('button', { name: 'Generate tierlist' }));
  const apply = await screen.findByRole('button', {
    name: 'Use generated tierlist',
  });
  expect(onApply).not.toHaveBeenCalled();
  expect(apply).toBeDisabled();
  fireEvent.click(
    screen.getByRole('checkbox', { name: /Replace my current tierlist/u }),
  );
  fireEvent.click(apply);
  await waitFor(() => expect(onApplied).toHaveBeenCalledOnce());
  expect(onApply).toHaveBeenCalledWith(document, {
    seed: 'a'.repeat(64),
    revision: 7,
  });
  expect(
    screen.getByRole('textbox', { name: 'Public MAL username' }),
  ).toHaveValue('Abkenn');
  expect(
    screen.queryByText(
      /episode-weighted|Equal scores sort|Oversized rows|excluded/u,
    ),
  ).not.toBeInTheDocument();
});

vi.mock('@/app/_services/local-tierlist', () => ({
  readLocalTierlist: vi.fn(async () => ({})),
}));
