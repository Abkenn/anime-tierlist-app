import { expect, test } from '@playwright/test';

test('keeps the mobile workspace stable while the save status types', async ({
  page,
}) => {
  const release = Promise.withResolvers<void>();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/*', async (route) => {
    if (route.request().method() === 'POST') {
      await release.promise;
      await route.abort();
    } else {
      await route.continue();
    }
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

  try {
    await page.goto('/');
    const status = page
      .locator('p[role="status"]')
      .filter({ hasText: 'Connecting...' });
    await expect(
      status.locator('span[aria-hidden="true"]').first(),
    ).toContainText('Connecting...');
    await expect(
      page.getByRole('button', { name: 'Save & import', exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => Reflect.get(window, 'startupShift')),
    ).toBeLessThan(0.01);
    await expect(
      page.locator(
        'link[rel="preconnect"][href="https://cdn.myanimelist.net"]',
      ),
    ).toHaveCount(0);
  } finally {
    release.resolve();
    await page.unrouteAll({ behavior: 'wait' });
  }
});
