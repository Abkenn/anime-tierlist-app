import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { instant } from '@next/playwright';
import { test as base, expect } from '@playwright/test';
import postgres from '@prisma/orm-postgres/runtime';
import { config } from 'dotenv';
import type { TierlistDocument } from '../src/app/_lib/tierlist-sync';
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
    const document: TierlistDocument = {
      version: 1 as const,
      imageMode: 'natural' as const,
      ranks: ['Watching' as const, 'S' as const, 'A' as const],
      items: [
        {
          id: 'preview-navigation-fixture',
          malId: 52991,
          label: 'Navigation fixture',
          rank: 'Watching' as const,
          image: {
            src: '/tier-samples/square.svg',
            width: 400,
            height: 400,
            alt: 'Navigation fixture',
          },
        },
        {
          id: 'preview-displacement-fixture',
          label: 'Unknown',
          rank: 'Watching' as const,
          image: {
            src: '/tier-samples/portrait.svg',
            width: 200,
            height: 400,
            alt: 'Second fixture',
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
        page.getByRole('button', { name: 'Share', exact: true }),
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
      await page.getByRole('button', { name: 'Share', exact: true }).click();
      await page
        .getByRole('button', { name: 'Open Preview', exact: true })
        .click();
      const initialModal = page.getByRole('dialog', {
        name: 'Tierlist preview',
        exact: true,
      });
      await expect(initialModal).toBeVisible();
      await initialModal.getByRole('button', { name: 'Close preview' }).click();
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
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
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
    await expect(
      page.getByRole('region', { name: 'Notifications' }),
    ).toContainText('Preview link copied to clipboard');
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

test('preserves Share tierlist on close and opens a standalone preview on refresh or middle-click', async ({
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
    page.getByRole('dialog', { name: 'Share tierlist', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Open Preview' }),
  ).toHaveAttribute('href', new RegExp(`${sharePath}$`, 'u'));
  await page.getByRole('link', { name: 'Open Preview' }).click();
  await expect(modal).toBeVisible();
  await page.mouse.click(4, 4);
  await page.waitForURL((url) => url.pathname === '/');
  await expect(
    page.getByRole('dialog', { name: 'Share tierlist', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Control+s');
  await expect(
    page.getByLabel('Save and import tierlist', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('dialog', { name: 'Share tierlist', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel('Save and import tierlist', { exact: true }),
  ).toHaveCSS('opacity', '1');
  const backupSeed = await page
    .getByRole('textbox', { name: 'Your user seed' })
    .inputValue();
  await page.screenshot({ path: '.storybook-cache/save-import-menu.png' });
  await page.getByRole('tab', { name: 'Import', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Seed to import' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Open project file' }),
  ).toBeVisible();
  await page.locator('input[type="file"][name="project"]').setInputFiles({
    name: 'fixture.anime',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'anime-tierlist',
        version: 1,
        seed: backupSeed,
      }),
    ),
  });
  await expect(
    page.getByLabel('Save and import tierlist', { exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('button', { name: 'Save & import', exact: true })
    .click();
  await expect(
    page.getByLabel('Save and import tierlist', { exact: true }),
  ).toHaveCSS('opacity', '1');
  await page.screenshot({ path: '.storybook-cache/save-import-mobile.png' });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('button', { name: 'Share', exact: true }).click();
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
  await expect(
    page.getByRole('button', { name: 'Share', exact: true }),
  ).toHaveCount(0);
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
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('link', { name: 'Open Preview' }).click();
  const modal = page.getByRole('dialog', {
    name: 'Tierlist preview',
    exact: true,
  });
  await expect(
    modal.getByRole('img', { name: 'Shared anime tierlist' }),
  ).toHaveCSS('opacity', '1');
  await expect(modal.locator('img')).toHaveCount(1);
  await expect(modal.locator('svg[role="img"]')).toHaveCount(0);
  await page.context().route('https://myanimelist.net/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<title>MAL fixture</title>',
    }),
  );
  const mal = modal.getByRole('link', {
    name: 'Open Navigation fixture on MyAnimeList',
  });
  await mal.hover();
  await expect(mal).toHaveCSS('opacity', '1');
  await modal.screenshot({ path: '.storybook-cache/mal-preview-link.png' });
  const malTab = page.context().waitForEvent('page');
  await mal.click();
  const opened = await malTab;
  await opened.waitForURL('https://myanimelist.net/anime/52991');
  await opened.close();
  await expect(modal.locator('[data-preview-displaced]')).toHaveCount(0);
  const unknownMal = modal.getByRole('link', {
    name: 'Unknown MAL link. Please add label',
  });
  await unknownMal.hover();
  await expect(unknownMal).toHaveAttribute('aria-disabled', 'true');
  await expect(unknownMal).not.toHaveAttribute('href');
  await expect(unknownMal).toHaveAttribute(
    'title',
    'Unknown MAL link. Please add label',
  );

  await page.keyboard.press('Control+f');
  const find = modal.getByRole('textbox', { name: 'Find anime in tierlist' });
  await expect(find).toBeFocused();
  await find.fill('Navigation');
  await expect(modal.getByText('1 found', { exact: true })).toBeVisible();
  await expect(modal.locator('[data-preview-match="true"]')).toHaveCount(1);
  await find.fill('absent');
  await expect(modal.getByText('0 found', { exact: true })).toBeVisible();
  await expect(modal.locator('[data-preview-match="false"]')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(find).toHaveCount(0);

  await modal.getByRole('button', { name: 'Copy PNG', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Notifications' }),
  ).toContainText('PNG copied to clipboard');
});

test('renders the live board for a fresh visitor while the export prepares', async ({
  browser,
  sharePath,
}) => {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const visitor = await context.newPage();
  const ready = Promise.withResolvers<void>();
  const images: string[] = [];
  visitor.on('request', (request) => {
    if (request.resourceType() === 'image') {
      images.push(request.url());
    }
  });
  await visitor.route('**/api/tierlist-preview/**/image*', async (route) => {
    await ready.promise;
    await route.continue();
  });
  try {
    await visitor.goto(`http://localhost:3046${sharePath}`, {
      waitUntil: 'domcontentloaded',
    });
    const poster = visitor.getByRole('img', { name: 'Shared anime tierlist' });
    await expect(poster).toHaveCSS('opacity', '0');
    await expect(
      visitor.getByRole('img', { name: 'Tierlist board', exact: true }),
    ).toBeVisible();
    ready.resolve();
    await expect(poster).toHaveCSS('opacity', '1');
    // Dragging must reuse the decoded image, even if its endpoint is now offline.
    await visitor.route('**/api/tierlist-preview/**/image*', (route) =>
      route.abort(),
    );
    await visitor.evaluate(() => {
      window.addEventListener('tierlist-preview-drag-ended', () => {
        document.body.dataset.previewReturned = 'true';
      });
    });
    const bounds = await poster.boundingBox();
    if (!bounds) {
      throw new Error('Preview image has no bounds');
    }
    const scale =
      bounds.width /
      (await poster.evaluate((node) => Number(node.getAttribute('width'))));
    // The first gesture is a row drag, before any poster sprite can warm a cache.
    const firstHandle = await visitor
      .getByRole('button', {
        name: 'Drag preview tier Watching',
      })
      .boundingBox();
    if (!firstHandle) {
      throw new Error('Preview row handle missing');
    }
    await visitor.mouse.move(firstHandle.x + 12, firstHandle.y + 12);
    await visitor.mouse.down();
    await visitor.mouse.move(firstHandle.x + 12, firstHandle.y + 175 * scale, {
      steps: 8,
    });
    await expect(visitor.locator('[data-preview-displaced] img')).toHaveCount(
      3,
    );
    await expect
      .poll(() =>
        visitor
          .locator('[data-preview-displaced] img')
          .evaluateAll((images) =>
            images.every(
              (image) =>
                image instanceof HTMLImageElement &&
                image.complete &&
                image.naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    await visitor.mouse.up();
    await expect(visitor.locator('[data-preview-displaced]')).toHaveCount(0);
    await visitor.mouse.move(bounds.x + 200 * scale, bounds.y + 80 * scale);
    await visitor.mouse.down();
    await visitor.mouse.move(bounds.x + 380 * scale, bounds.y + 90 * scale, {
      steps: 6,
    });
    await expect(visitor.locator('[data-preview-displaced]')).toHaveCount(2);
    await expect
      .poll(async () => {
        const shifted = await visitor
          .locator('[data-preview-displaced="preview-displacement-fixture"]')
          .boundingBox();
        return shifted
          ? Math.abs(shifted.x - (bounds.x + 162 * scale))
          : Infinity;
      })
      .toBeLessThan(2);
    await visitor.screenshot({
      path: '.storybook-cache/preview-poster-drag.png',
    });
    await visitor.mouse.up();
    await expect(visitor.locator('[data-preview-displaced]')).toHaveCount(0);
    await expect(visitor.locator('body')).toHaveAttribute(
      'data-preview-returned',
      'true',
    );
    const rowHandle = visitor.getByRole('button', {
      name: 'Drag preview tier Watching',
    });
    const handle = await rowHandle.boundingBox();
    if (!handle) {
      throw new Error('Preview row handle missing');
    }
    await visitor.mouse.move(
      handle.x + handle.width / 2,
      handle.y + handle.height / 2,
    );
    await visitor.mouse.down();
    await visitor.mouse.move(
      handle.x + handle.width / 2,
      handle.y + handle.height / 2 + 175 * scale,
      { steps: 8 },
    );
    await expect(visitor.locator('[data-preview-displaced]')).toHaveCount(3);
    await expect
      .poll(() =>
        visitor
          .locator('[data-preview-displaced] img')
          .evaluateAll((images) =>
            images.every(
              (image) =>
                image instanceof HTMLImageElement && image.naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    await visitor.screenshot({ path: '.storybook-cache/preview-row-drag.png' });
    await visitor.mouse.up();
    await expect(visitor.locator('[data-preview-displaced]')).toHaveCount(0);
    await expect(
      visitor.getByRole('button', { name: 'Drag preview tier Watching' }),
    ).toBeAttached();
    // Retarget to another rank and immediately drag again after snap-back.
    for (let repeat = 0; repeat < 2; repeat += 1) {
      await visitor.mouse.move(bounds.x + 200 * scale, bounds.y + 80 * scale);
      await visitor.mouse.down();
      await visitor.mouse.move(bounds.x + 200 * scale, bounds.y + 240 * scale, {
        steps: 4,
      });
      await expect(visitor.locator('[data-preview-displaced]')).toHaveCount(2);
      await visitor.mouse.up();
      await expect(visitor.locator('[data-preview-displaced]')).toHaveCount(0);
    }
    expect(
      images.filter((url) => url.includes('/api/tierlist-preview/')),
    ).toHaveLength(1);
    await expect(
      visitor.getByRole('link', { name: 'Go to edit mode' }),
    ).toHaveCount(0);
    await expect(
      visitor.getByRole('link', { name: 'Create your own tierlist' }),
    ).toBeVisible();
    await visitor.unroute('**/api/tierlist-preview/**/image*');
    await visitor.route('**/tier-samples/*.svg', (route) => route.abort());
    await visitor.getByRole('button', { name: 'Use as a template' }).click();
    await expect(visitor).toHaveURL(/\/\?profile=local$/);
    await expect(visitor.locator('svg image[href^="blob:"]')).toHaveCount(2);
    await expect(
      visitor.getByRole('button', { name: 'Share', exact: true }),
    ).toBeEnabled();
    await visitor.goBack();
    await expect(visitor.locator('[data-preview-page]')).toHaveCSS(
      'opacity',
      '1',
    );
    await expect(
      visitor.getByRole('img', { name: 'Shared anime tierlist' }),
    ).toHaveCSS('opacity', '1');
  } finally {
    ready.resolve();
    await context.close();
  }
});

test('opens the mobile preview before its PNG is ready and supports sideways swipes', async ({
  page,
  browser,
  sharePath,
}) => {
  const context = await browser.newContext({
    storageState: await page.context().storageState({ indexedDB: true }),
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
  });
  const release = Promise.withResolvers<void>();
  await context.route('**/api/tierlist-preview/**/image*', async (route) => {
    await release.promise;
    await route.continue();
  });
  try {
    const visitor = await context.newPage();
    await visitor.goto('http://localhost:3046/');
    await visitor.getByRole('button', { name: 'Share', exact: true }).click();
    await visitor
      .getByRole('link', { name: 'Open Preview', exact: true })
      .click();
    await expect(visitor).toHaveURL(new RegExp(`${sharePath}$`, 'u'));
    const modal = visitor.getByRole('dialog', {
      name: 'Tierlist preview',
      exact: true,
    });
    await expect(modal).toBeVisible();
    await expect(
      modal.getByRole('img', { name: 'Tierlist board', exact: true }),
    ).toBeVisible();
    const image = modal.getByRole('img', { name: 'Shared anime tierlist' });
    await expect(image).toHaveCSS('opacity', '0');
    const imageBox = await image.boundingBox();
    const rowGrip = modal.getByRole('button', {
      name: 'Drag preview tier Watching',
    });
    await expect
      .poll(async () => (await rowGrip.boundingBox())?.height ?? 0)
      .toBeGreaterThan(31);
    const grip = await rowGrip.boundingBox();
    expect(imageBox).not.toBeNull();
    expect(grip).not.toBeNull();
    if (!imageBox || !grip) {
      throw new Error('Preview geometry is unavailable');
    }
    expect(grip.x + grip.width).toBeLessThanOrEqual(imageBox.x);
    await visitor.mouse.move(grip.x + 12, grip.y + 12);
    await visitor.mouse.down();
    await visitor.mouse.move(grip.x + 12, grip.y + 120, { steps: 5 });
    await expect(modal.locator('[data-preview-displaced] svg')).not.toHaveCount(
      0,
    );
    await visitor.mouse.up();
    await expect(modal.locator('[data-preview-displaced]')).toHaveCount(0);
    expect(
      (imageBox.width / Number(await image.getAttribute('width'))) * 160,
    ).toBeGreaterThanOrEqual(80);
    const scroll = modal.locator('[data-preview-scroll]');
    const bounds = await scroll.boundingBox();
    if (!bounds) {
      throw new Error('Preview scroll area is unavailable');
    }
    const client = await context.newCDPSession(visitor);
    const y = bounds.y + 100;
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: bounds.x + bounds.width * 0.8, y }],
    });
    for (let step = 1; step <= 8; step += 1) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: bounds.x + bounds.width * (0.8 - step * 0.07), y }],
      });
    }
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect
      .poll(() => scroll.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(20);
    release.resolve();
    await expect(image).toHaveCSS('opacity', '1');
    await visitor.screenshot({
      path: '.storybook-cache/preview-mobile-scroll.png',
    });
  } finally {
    release.resolve();
    await context.close();
  }
});

test('maximizes the loaded preview at the same share URL without loading again', async ({
  page,
  sharePath,
}) => {
  await page.getByRole('link', { name: 'Open Preview' }).click();
  const modal = page.getByRole('dialog', {
    name: 'Tierlist preview',
    exact: true,
  });
  await expect(
    modal.getByRole('img', { name: 'Shared anime tierlist' }),
  ).toHaveCSS('opacity', '1');
  const maximize = async () => {
    await modal.getByRole('link', { name: 'Maximize preview' }).click();
    await expect(page).toHaveURL(new RegExp(`${sharePath}$`, 'u'));
    await expect
      .poll(async () => {
        const box = await modal.boundingBox();
        return (
          box &&
          Math.abs(box.x) < 1 &&
          Math.abs(box.y) < 1 &&
          Math.abs(box.width - (page.viewportSize()?.width ?? 0)) < 1
        );
      })
      .toBe(true);
    await expect(
      modal.getByRole('img', { name: 'Shared anime tierlist' }),
    ).toHaveCSS('opacity', '1');
    await expect(
      page.getByRole('status').filter({ hasText: 'Loading tierlist...' }),
    ).toHaveCount(0);
  };
  await modal.screenshot({
    path: '.storybook-cache/preview-before-maximize.png',
  });
  await maximize();
  await expect(
    page.getByRole('button', { name: 'Save project', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: '.storybook-cache/preview-maximized.png' });
  await page.goBack();
  await page.waitForURL((url) => url.pathname === '/');
  await expect(
    page.getByRole('dialog', { name: 'Share tierlist', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Open Preview' }).click();
  await expect(
    modal.getByRole('img', { name: 'Shared anime tierlist' }),
  ).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await instant(page, maximize);
  await expect(
    page.getByRole('button', { name: 'Save project', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('img', { name: 'Shared anime tierlist' }),
  ).toHaveCSS('opacity', '1');
  await expect(
    page.getByRole('dialog', { name: 'Tierlist preview', exact: true }),
  ).toHaveCount(0);
});

test('recovers the unchanged preview after a homepage reload before opening it', async ({
  page,
  sharePath,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const preview = page.getByRole('link', { name: 'Open Preview', exact: true });
  await expect(preview).toHaveAttribute(
    'href',
    new RegExp(`${sharePath}$`, 'u'),
  );
  await preview.click();
  await page.waitForURL((url) => url.pathname === sharePath);
  await expect(
    page
      .getByRole('dialog', { name: 'Tierlist preview', exact: true })
      .getByRole('img', { name: 'Shared anime tierlist', exact: true }),
  ).toBeVisible();
});

test('repairs a cached not-found preview instead of reusing a broken route', async ({
  page,
  sharePath,
}) => {
  const db = postgres<Contract>({
    contractJson,
    url:
      process.env.DATABASE_URL_POOLED ??
      process.env.DATABASE_URL ??
      process.env.DATABASE_POSTGRES_URL,
    poolOptions: { connectionTimeoutMillis: 8000, idleTimeoutMillis: 1000 },
  });
  const id = sharePath.slice(1).split('.')[0];
  const share = await db.orm.public.TierlistShare.where({ id }).first();
  if (!share) {
    throw new Error('Fixture publication missing');
  }
  const restoredId = randomBytes(12).toString('base64url');
  const restoredPath = `/${restoredId}.${share.fingerprint.split(':')[0]}`;
  // Only this disposable fixture is changed: prime a new negative entry, then publish it.
  await db.orm.public.TierlistShare.where({ id }).delete();
  try {
    await page.goto(restoredPath);
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
  } finally {
    await db.orm.public.TierlistShare.create({
      id: restoredId,
      ownerId: share.ownerId,
      fingerprint: share.fingerprint,
      document: share.document,
    });
  }
  await page.getByRole('link', { name: 'Return home', exact: true }).click();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const preview = page.getByRole('link', { name: 'Open Preview', exact: true });
  await expect(preview).toHaveAttribute(
    'href',
    new RegExp(`${restoredPath}$`, 'u'),
  );
  await preview.click();
  await expect(
    page
      .getByRole('dialog', { name: 'Tierlist preview', exact: true })
      .getByRole('img', { name: 'Shared anime tierlist', exact: true }),
  ).toHaveCSS('opacity', '1');
});

test('redirects an older preview version to the latest publication', async ({
  page,
  sharePath,
}) => {
  const id = sharePath.slice(1).split('.')[0];
  await page.goto(`/${id}.v0.0`);
  await expect(page).toHaveURL(new RegExp(`${sharePath}$`, 'u'));
  await expect(
    page.getByRole('img', { name: 'Shared anime tierlist', exact: true }),
  ).toHaveCSS('opacity', '1');
  await expect(
    page.getByRole('heading', { name: 'Page not found', exact: true }),
  ).toHaveCount(0);
});

const recordPreviewAnimations = async (
  page: import('@playwright/test').Page,
) => {
  await page.evaluate(() => {
    const observed = new Set<string>();
    Reflect.set(window, 'previewAnimations', observed);
    const timer = setInterval(() => {
      const popup = document.querySelector<HTMLElement>('[data-preview-modal]');
      if (popup) {
        const style = getComputedStyle(popup);
        const scale = new DOMMatrixReadOnly(style.transform).a;
        if (
          scale < 0.995 &&
          Number(style.opacity) > 0 &&
          Number(style.opacity) < 0.98
        ) {
          observed.add('modal-shrinking');
        }
      }
      const preview = document.querySelector<HTMLElement>(
        '[data-preview-page]',
      );
      if (preview) {
        const style = getComputedStyle(preview);
        if (
          new DOMMatrixReadOnly(style.transform).a < 0.999 &&
          Number(style.opacity) > 0 &&
          Number(style.opacity) < 0.98
        ) {
          observed.add('page-returning');
        }
      }
      for (const animation of document.getAnimations()) {
        if (animation instanceof CSSAnimation) {
          observed.add(animation.animationName);
        }
      }
    }, 8);
    setTimeout(() => clearInterval(timer), 10000);
  });
};

test('minimizes the preview modal when returning to edit mode', async ({
  page,
  sharePath,
}) => {
  await page.getByRole('link', { name: 'Open Preview', exact: true }).click();
  await page.waitForURL((url) => url.pathname === sharePath);
  const modal = page.getByRole('dialog', {
    name: 'Tierlist preview',
    exact: true,
  });
  await recordPreviewAnimations(page);
  await modal
    .getByRole('link', { name: 'Go to edit mode', exact: true })
    .click();
  await expect(page).toHaveURL('http://localhost:3046/');
  await expect(modal).toHaveCount(0);
  await expect(
    page.getByRole('dialog', { name: 'Share tierlist', exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(Reflect.get(window, 'previewAnimations') as Set<string>),
      ),
    )
    .toContain('modal-shrinking');
  await expect(
    page.getByRole('button', { name: 'Share', exact: true }),
  ).toBeEnabled();
  await page.goBack();
  await expect(modal).toBeVisible();
  await expect(modal).toHaveCSS('opacity', '1');
  await expect(
    modal.getByRole('img', { name: 'Shared anime tierlist' }),
  ).toHaveCSS('opacity', '1');
  await page.goForward();
  await expect(
    page.getByRole('button', { name: 'Share', exact: true }),
  ).toBeEnabled();
});

test('softens standalone preview return and respects reduced motion', async ({
  page,
  sharePath,
}) => {
  await page.goto(sharePath);
  await recordPreviewAnimations(page);
  await page
    .getByRole('link', { name: 'Go to edit mode', exact: true })
    .click();
  await expect(page).toHaveURL('http://localhost:3046/');
  await page.goBack();
  await expect(page.locator('[data-preview-page]')).toHaveCSS('opacity', '1');
  await expect(
    page.getByRole('img', { name: 'Shared anime tierlist' }),
  ).toHaveCSS('opacity', '1');
  await page.goForward();
  await expect(page).toHaveURL('http://localhost:3046/');
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(Reflect.get(window, 'previewAnimations') as Set<string>),
      ),
    )
    .toContain('page-returning');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(sharePath);
  await recordPreviewAnimations(page);
  await page
    .getByRole('link', { name: 'Go to edit mode', exact: true })
    .click();
  await expect(page).toHaveURL('http://localhost:3046/');
  expect(
    await page.evaluate(() =>
      Array.from(Reflect.get(window, 'previewAnimations') as Set<string>),
    ),
  ).not.toContain('page-returning');
});

test('restores fresh visitor previews through Back and Forward at both URL forms', async ({
  browser,
  sharePath,
}) => {
  for (const prefix of ['', '/preview']) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    try {
      const visitor = await context.newPage();
      await visitor.goto(`http://localhost:3046${prefix}${sharePath}`);
      const image = visitor.getByRole('img', { name: 'Shared anime tierlist' });
      const frame = visitor.locator('[data-preview-page]');
      await expect(image).toHaveCSS('opacity', '1');
      await visitor
        .getByRole('link', { name: 'Create your own tierlist' })
        .click();
      await expect(visitor).toHaveURL('http://localhost:3046/');
      await visitor.goBack();
      await expect(frame).toHaveCSS('opacity', '1');
      await expect(image).toHaveCSS('opacity', '1');
      await visitor.goForward();
      await expect(visitor).toHaveURL('http://localhost:3046/');
      await visitor.goBack();
      await expect(frame).toHaveCSS('opacity', '1');
      await expect(image).toHaveCSS('opacity', '1');
    } finally {
      await context.close();
    }
  }
});
