import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (route.request().method() === 'POST') {
      await route.abort();
    } else {
      await route.continue();
    }
  });
});

test('restores a fresh local tierlist without waiting for online saving', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.locator('[data-tier-canvas]')).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await expect(page.locator('[data-tier-canvas]')).not.toHaveAttribute('inert');

  await page.reload();
  await expect(page.locator('[data-tier-canvas]')).toHaveAttribute(
    'aria-busy',
    'false',
  );
  expect(errors).toEqual([]);
});

test('reports unavailable storage instead of staying in restoration', async ({
  page,
}) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    };
  });

  await page.goto('/');
  await expect(
    page
      .getByText(
        'Local storage is unavailable or the saved tierlist could not be read. Your saved data has not been replaced.',
        { exact: true },
      )
      .first(),
  ).toBeAttached();
  await expect(page.locator('[data-tier-canvas]')).toHaveAttribute(
    'aria-busy',
    'false',
  );
});
