import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SaveShare } from './save-share';

vi.mock('next/link', () => ({
  default: ({
    prefetch: _prefetch,
    scroll: _scroll,
    ...props
  }: import('react').ComponentProps<'a'> & {
    prefetch?: boolean;
    scroll?: boolean;
  }) => <a {...props} />,
  useLinkStatus: () => ({ pending: false }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

const downloads = vi.hoisted(() => ({
  project: vi.fn(),
  png: vi.fn(async () => 0),
}));
vi.mock('@/app/_services/tierlist-download', () => ({
  downloadTierlistProject: downloads.project,
  downloadTierlistPng: downloads.png,
}));

it('keeps sharing separate from private backups and reuses prepared previews', async () => {
  const document = {
    version: 1 as const,
    items: [],
    ranks: ['Watching' as const],
    imageMode: 'natural' as const,
  };
  const publish = vi.fn(async () => 'https://example.com/abcd1234abcd1234');
  render(
    <SaveShare document={document} disabled={false} onPublish={publish} />,
  );
  fireEvent.click(screen.getByRole('button', { name: /^Share$/ }));
  expect(
    screen.queryByRole('textbox', { name: 'Tierlist seed' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Save project' }),
  ).not.toBeInTheDocument();
  expect(publish).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Open Preview' }));
  await screen.findByRole('button', { name: /Opening preview/ });
  fireEvent.click(screen.getByRole('button', { name: 'Close sharing' }));
  fireEvent.click(screen.getByRole('button', { name: /^Share$/ }));
  const preview = await screen.findByRole('link', { name: 'Open Preview' });
  expect(publish).toHaveBeenCalledOnce();
  expect(preview).toHaveAttribute(
    'href',
    'https://example.com/abcd1234abcd1234',
  );
  expect(preview).not.toHaveAttribute('target');
  expect(screen.getByRole('link', { name: 'Download as PNG' })).toHaveAttribute(
    'href',
    '/api/tierlist-preview/abcd1234abcd1234/image?download=1',
  );
  expect(downloads.png).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Close sharing' }));
  fireEvent.click(screen.getByRole('button', { name: /^Share$/ }));
  expect(
    screen.getByRole('link', { name: 'Open Preview' }),
  ).toBeInTheDocument();
  expect(publish).toHaveBeenCalledOnce();
});

it('restores an existing server preview on Share open without republishing', async () => {
  const publish = vi.fn(async () => '/new');
  const find = vi.fn(async () => 'https://example.com/existing.v3.4');
  render(
    <SaveShare
      disabled={false}
      revision={3}
      onPublish={publish}
      onFindPreview={find}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: /^Share$/ }));
  expect(
    await screen.findByRole('link', { name: 'Open Preview' }),
  ).toHaveAttribute('href', 'https://example.com/existing.v3.4');
  expect(find).toHaveBeenCalledOnce();
  expect(publish).not.toHaveBeenCalled();
});
