import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { instant } from '@next/playwright';
import { test as base, expect } from '@playwright/test';
import postgres from '@prisma/orm-postgres/runtime';
import { config } from 'dotenv';
import type { Contract } from '../src/prisma/contract';
import contractJson from '../src/prisma/contract.json' with { type: 'json' };

config({ path: ['.env.development.local', '.env.local', '.env'], quiet: true });

const test = base.extend<{ sharePath: string }>({
  sharePath: async ({ page }, use) => {
    const db = postgres<Contract>({
      contractJson,
      url:
        process.env.DATABASE_URL_POOLED ??
        process.env.DATABASE_URL ??
        process.env.DATABASE_POSTGRES_URL,
      poolOptions: { connectionTimeoutMillis: 8000, idleTimeoutMillis: 1000 },
    });
    const id = randomUUID();
    const seed = randomBytes(32).toString('hex');
    const document = {
      version: 1 as const,
      imageMode: 'natural' as const,
      ranks: ['Watching' as const],
      items: [
        {
          id: 'preview-navigation-fixture',
          label: 'Navigation fixture',
          rank: 'Watching' as const,
          image: {
            src: '/tier-samples/square.svg',
            width: 400,
            height: 400,
            alt: 'Navigation fixture',
          },
        },
      ],
    };
    try {
      await db.orm.public.TierlistOwner.create({
        id,
        seedHash: createHash('sha256').update(seed).digest('hex'),
        revision: 0,
        document,
      });
      const block = async (route: import('@playwright/test').Route) => {
        if (route.request().method() === 'POST') {
          await route.abort();
        } else {
          await route.continue();
        }
      };
      await page.route('**/*', block);
      await page.goto('/offline?offline=dev');
      await expect(
        page.getByRole('button', { name: 'Save & Share' }),
      ).toBeEnabled();
      await page.evaluate(
        async ({ id, seed, document }) => {
          const { promise, resolve, reject } =
            Promise.withResolvers<IDBDatabase>();
          const request = indexedDB.open('anime-tierlist');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
          const database = await promise;
          const complete = Promise.withResolvers<void>();
          const transaction = database.transaction('drafts', 'readwrite');
          const store = transaction.objectStore('drafts');
          store.put(
            {
              ...document,
              seed,
              revision: 0,
              sync: { ownerId: id, serverRevision: 0, syncedLocalRevision: 0 },
            },
            'personal-tierlist',
          );
          store.put(seed, 'active-tierlist-seed');
          transaction.oncomplete = () => complete.resolve();
          transaction.onerror = () => complete.reject(transaction.error);
          await complete.promise;
          database.close();
          sessionStorage.clear();
        },
        { id, seed, document },
      );
      await page.unroute('**/*', block);
      await page.goto('/');
      await page.getByRole('button', { name: 'Save & Share' }).click();
      await expect(
        page.getByRole('textbox', { name: 'Tierlist seed' }),
      ).toBeVisible();
      const preview = page.getByRole('link', { name: 'Open Preview' });
      await expect(preview).toBeVisible();
      const href = await preview.getAttribute('href');
      if (!href) {
        throw new Error('The published preview URL is missing.');
      }
      await use(new URL(href).pathname);
    } finally {
      await db.orm.public.TierlistOwner.where({ id }).delete();
    }
  },
});

test('prefetches the preview board while account controls wait for navigation', async ({
  page,
  sharePath,
}) => {
  const modal = page.getByRole('dialog', {
    name: 'Tierlist preview',
    exact: true,
  });
  await instant(page, async () => {
    await page.getByRole('link', { name: 'Open Preview' }).click();
    await page.waitForURL((url) => url.pathname === sharePath);
    await expect(
      modal.getByRole('heading', { name: 'Tierlist preview' }),
    ).toBeVisible();
    await expect(
      modal.getByRole('img', { name: 'Shared anime tierlist', exact: true }),
    ).toBeVisible();
    await expect(modal).toHaveCSS('opacity', '1');
    await page.screenshot({
      path: '.storybook-cache/preview-prefetched.png',
      animations: 'disabled',
    });
    await expect(
      modal.getByRole('button', { name: 'Save project', exact: true }),
    ).toHaveCount(0);
  });
  await expect(
    modal.getByRole('img', { name: 'Shared anime tierlist', exact: true }),
  ).toBeVisible();
  await expect(
    modal.getByRole('button', { name: 'Save project', exact: true }),
  ).toBeVisible();
});

test('preserves Save & Share on close and opens a standalone preview on refresh or middle-click', async ({
  page,
  sharePath,
}) => {
  const modal = page.getByRole('dialog', {
    name: 'Tierlist preview',
    exact: true,
  });
  await page.getByRole('link', { name: 'Open Preview' }).click();
  await page.waitForURL((url) => url.pathname === sharePath);
  await expect(
    modal.getByRole('img', { name: 'Shared anime tierlist', exact: true }),
  ).toBeVisible();
  await modal.getByRole('button', { name: 'Close preview' }).click();
  await page.waitForURL((url) => url.pathname === '/');
  await expect(
    page.getByRole('dialog', { name: 'Save & Share', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Open Preview' }),
  ).toHaveAttribute('href', new RegExp(`${sharePath}$`, 'u'));
  await page.getByRole('link', { name: 'Open Preview' }).click();
  await expect(modal).toBeVisible();
  await page.mouse.click(4, 4);
  await page.waitForURL((url) => url.pathname === '/');
  await expect(
    page.getByRole('dialog', { name: 'Save & Share', exact: true }),
  ).toBeVisible();
  const popupPromise = page.context().waitForEvent('page');
  await page
    .getByRole('link', { name: 'Open Preview' })
    .click({ button: 'middle' });
  const popup = await popupPromise;
  await popup.waitForURL((url) => url.pathname === sharePath);
  await expect(
    popup.getByRole('img', { name: 'Shared anime tierlist', exact: true }),
  ).toBeVisible();
  await expect(
    popup.getByRole('dialog', { name: 'Tierlist preview', exact: true }),
  ).toHaveCount(0);
  await popup.close();
  await page.getByRole('link', { name: 'Open Preview' }).click();
  await page.waitForURL((url) => url.pathname === sharePath);
  await page.reload();
  await expect(
    page.getByRole('img', { name: 'Shared anime tierlist', exact: true }),
  ).toBeVisible();
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save & Share' })).toHaveCount(
    0,
  );
});

test('serves the board PNG for social metadata and a native download', async ({
  page,
  sharePath,
}) => {
  const response = await page.request.get(sharePath, {
    headers: { 'User-Agent': 'Discordbot/2.0' },
  });
  const html = await response.text();
  expect(html).toContain('property="og:image"');
  expect(html).toContain(`/api/tierlist-preview${sharePath}/image?v=`);
  const image = await page.request.get(
    `/api/tierlist-preview${sharePath}/image?download=1`,
  );
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toBe('image/png');
  expect(image.headers()['content-disposition']).toContain('attachment');
  expect((await image.body()).subarray(0, 8).toString('hex')).toBe(
    '89504e470d0a1a0a',
  );
});
