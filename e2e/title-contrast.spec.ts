import { expect, test } from '@playwright/test';

test('adapts title contrast by position, keeps words together, and allows manual colors', async ({
  page,
}) => {
  await page.route('**/tier-samples/contrast-fixture.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><path fill="white" d="M0 0h400v300H0z"/><path fill="black" d="M0 300h400v300H0z"/></svg>',
    }),
  );
  await page.goto('/offline?offline=dev');
  await expect(
    page.getByRole('button', { name: 'Share', exact: true }),
  ).toBeEnabled();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('anime-tierlist');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('drafts', 'readwrite');
    const store = transaction.objectStore('drafts');
    const seed = 'c'.repeat(64);
    store.put(
      {
        version: 1,
        seed,
        revision: 0,
        ranks: ['S+'],
        imageMode: 'natural',
        posterSize: 'small',
        items: [
          {
            id: 'title',
            label: 'Contrast',
            rank: 'S+',
            image: {
              src: '/tier-samples/contrast-fixture.svg',
              width: 400,
              height: 600,
              alt: 'Contrast',
            },
            title: {
              text: 'Mushoku Tensei',
              wrap: true,
              position: 'top',
              color: '#ffffff',
              autoColor: true,
            },
          },
        ],
      },
      'personal-tierlist',
    );
    store.put(seed, 'active-tierlist-seed');
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await page.reload();
  const item = page.getByRole('button', {
    name: 'Item Contrast in S+',
    exact: true,
  });
  const title = item.locator('[data-tier-title] > span > span');
  await expect(title).toHaveCSS('color', 'rgb(23, 23, 23)');
  await expect(title.locator('span')).toHaveText('Mushoku\nTensei', {
    useInnerText: true,
  });
  await item.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Edit text', exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Automatic contrast' }),
  ).toBeChecked();
  await page.getByLabel('Position', { exact: true }).selectOption('bottom');
  await expect(title).toHaveCSS('color', 'rgb(237, 237, 235)');
  await page.getByLabel('Hex color', { exact: true }).fill('#ff00ff');
  await expect(
    page.getByRole('checkbox', { name: 'Automatic contrast' }),
  ).not.toBeChecked();
  await expect(title).toHaveCSS('color', 'rgb(255, 0, 255)');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.screenshot({ path: '.storybook-cache/title-contrast.png' });
});
