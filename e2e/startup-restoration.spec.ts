import { expect, test } from '@playwright/test';

[1365, 390].forEach((width) => {
  test(`restores and prioritizes visible posters at ${width}px`, async ({
    page,
  }) => {
    const release = Promise.withResolvers<void>();
    await page.setViewportSize({ width, height: 844 });
    await page.route('**/*', async (route) => {
      if (route.request().method() === 'POST') {
        await release.promise;
        await route.abort();
      } else {
        await route.continue();
      }
    });

    try {
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
                src: `/tier-samples/portrait.svg?poster=${index}`,
                width: [400, 400, 600, 1600][index] ?? 400,
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

      await page.addInitScript(() => {
        Reflect.set(window, 'startupShift', 0);
        new PerformanceObserver((entries) => {
          entries.getEntries().forEach((entry) => {
            const shift = entry as PerformanceEntry & {
              hadRecentInput: boolean;
              value: number;
            };
            if (!shift.hadRecentInput) {
              Reflect.set(
                window,
                'startupShift',
                Reflect.get(window, 'startupShift') + shift.value,
              );
            }
          });
        }).observe({ type: 'layout-shift', buffered: true });
      });
      const client = await page.context().newCDPSession(page);
      await client.send('Emulation.setCPUThrottlingRate', { rate: 6 });
      await page.goto('/');
      await expect(page.locator('[data-tier-rank]')).toHaveCount(5);
      await expect(page.locator('[aria-label="Ranked tiers"]')).toBeVisible();

      // The landscape wins on desktop; the square is largest within the mobile viewport.
      const priorityIndex = width === 1365 ? 3 : 2;
      await expect(
        page.locator(
          `link[rel="preload"][as="image"][href="/tier-samples/portrait.svg?poster=${priorityIndex}"]`,
        ),
      ).toHaveAttribute('fetchpriority', 'high');
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      // Include status animations and ResizeObserver delivery in the measurement.
      await page.waitForTimeout(1000);
      expect(
        await page.evaluate(() => Reflect.get(window, 'startupShift')),
      ).toBeLessThan(0.01);
    } finally {
      release.resolve();
      await page.unrouteAll({ behavior: 'wait' });
    }
  });
});
