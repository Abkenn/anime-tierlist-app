import { expect, test } from '@playwright/test';

test('Auto uses desktop row whitespace and exceeds Medium for twelve portraits per row', async ({
  page,
}) => {
  await page.setViewportSize({ width: 2257, height: 1179 });
  await page.goto('/offline?offline=dev');
  await expect(
    page.getByRole('button', { name: 'Share', exact: true }),
  ).toBeEnabled();
  await page.evaluate(async () => {
    const ranks = ['S+', 'S', 'A+', 'A', 'B+'];
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('anime-tierlist');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction('drafts', 'readwrite');
    const store = transaction.objectStore('drafts');
    const seed = 'b'.repeat(64);
    store.put(
      {
        version: 1,
        seed,
        revision: 0,
        imageMode: 'natural',
        posterSize: 'dynamic',
        ranks,
        items: Array.from({ length: 55 }, (_, index) => ({
          id: `size-${index}`,
          label: `Size ${index}`,
          rank: ranks[Math.floor(index / 12)],
          image: {
            src: '/tier-samples/portrait.svg',
            width: 400,
            height: 600,
            alt: `Size ${index}`,
          },
        })),
      },
      'personal-tierlist',
    );
    store.put(seed, 'active-tierlist-seed');
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });
  await page.reload();
  await expect(
    page.getByRole('radio', { name: 'Auto', exact: true }),
  ).toBeChecked();
  const rank = page.locator('[data-tier-rank="S+"]');
  const size = () =>
    rank.evaluate((node) =>
      Number.parseFloat(
        getComputedStyle(node).gridTemplateColumns.split(' ')[0],
      ),
    );
  await expect.poll(size).toBeGreaterThan(128);
  const auto = await size();
  const viewport = await page.locator('[data-tier-viewport]').boundingBox();
  expect(viewport).not.toBeNull();
  expect(
    (auto * (1 + (12 * 2) / 3)) / (viewport?.width ?? Infinity),
  ).toBeGreaterThan(0.6);
  await page.screenshot({
    path: '.storybook-cache/desktop-auto-poster-size.png',
  });
  await page.getByRole('radio', { name: 'Medium', exact: true }).click();
  await expect.poll(size).toBe(128);
  expect(auto).toBeGreaterThan(await size());
});
