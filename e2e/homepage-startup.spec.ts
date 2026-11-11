import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 404,
        headers: { 'x-nextjs-action-not-found': '1' },
        body: 'Read-only startup test',
      });
    } else {
      await route.continue();
    }
  });
});

test('opens deferred rank controls on their first click and restores focus', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('[data-tier-canvas]')).toHaveAttribute(
    'aria-busy',
    'false',
  );
  const row = page.locator('[data-tier-rank="S+"]');
  await row.hover();
  const color = page.getByRole('button', { name: 'Color for S+', exact: true });
  await color.click();
  await expect(
    page.getByRole('dialog', { name: 'Color for S+' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(color).toBeFocused();

  await row.hover();
  const add = page.getByRole('button', {
    name: 'Add anime to S+',
    exact: true,
  });
  await add.click();
  const search = page.getByRole('dialog', { name: 'Add to S+' });
  await expect(search).toBeVisible();
  await expect(search.getByRole('searchbox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(add).toBeFocused();
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

test('opens lazy save and share panels and preserves the save shortcut', async ({
  page,
}) => {
  await page.goto('/');
  const save = page.getByRole('button', { name: 'Save & import', exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(
    page.getByRole('dialog', { name: 'Save and import tierlist' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(save).toBeFocused();

  await page.keyboard.press('Control+s');
  await expect(
    page.getByRole('dialog', { name: 'Save and import tierlist' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');

  const share = page.getByRole('button', { name: 'Share', exact: true });
  await share.click();
  await expect(
    page.getByRole('dialog', { name: 'Share tierlist' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close sharing' }).click();
  await expect(share).toBeFocused();
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

test('opens previously unused editing panels after an offline reload', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    serviceWorkers: 'allow',
  });
  await context.route('**/*', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 404,
        headers: { 'x-nextjs-action-not-found': '1' },
        body: 'Read-only offline test',
      });
    } else {
      await route.continue();
    }
  });
  const page = await context.newPage();
  const errors: string[] = [];
  let phase = 'online';
  page.on('pageerror', (error) => errors.push(`${phase}: ${error.message}`));

  try {
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    await expect(page.locator('[data-tier-canvas]')).toHaveAttribute(
      'aria-busy',
      'false',
    );
    await expect(
      page.getByRole('button', { name: 'Color for S+', exact: true }),
    ).toBeAttached();
    phase = 'offline reload';
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('[data-tier-canvas]')).toHaveAttribute(
      'aria-busy',
      'false',
    );

    const row = page.locator('[data-tier-rank="S+"]');
    await row.hover();
    await page
      .getByRole('button', { name: 'Color for S+', exact: true })
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Color for S+' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');

    await page
      .getByRole('button', { name: 'Save & import', exact: true })
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Save and import tierlist' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');

    await row.hover();
    await page.getByRole('button', { name: 'Delete S+', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
