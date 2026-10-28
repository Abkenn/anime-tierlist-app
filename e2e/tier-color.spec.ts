import { expect, test } from '@playwright/test';

test('uses uppercase HEX by default and round-trips copied colors after swatch changes', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/offline?offline=dev');
  await page.getByRole('button', { name: 'Color for S+', exact: true }).click();
  const hex = page.getByRole('textbox', { name: 'HEX color', exact: true });
  await expect(
    page.getByRole('radio', { name: 'HEX', exact: true }),
  ).toBeChecked();
  await expect(hex).toHaveValue('#E68EE6');
  await page.getByRole('button', { name: 'Copy color', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    '#E68EE6',
  );
  await expect(
    page.getByRole('button', { name: 'Color copied', exact: true }),
  ).toBeVisible();
  const hue = page.getByRole('slider', { name: 'Hue', exact: true });
  await hue.focus();
  await hue.press('ArrowRight');
  await expect(hex).not.toHaveValue('#E68EE6');
  await hex.focus();
  await hex.press('Control+a');
  await hex.press('Control+v');
  await expect(hex).toHaveValue('#E68EE6');
  await page.getByRole('radio', { name: 'RGB', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'RGB color', exact: true }),
  ).toHaveValue('rgb(230, 142, 230)');
  await page.getByRole('radio', { name: 'HSL', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'HSL color', exact: true }),
  ).toHaveValue('hsl(300, 64%, 73%)');
  await page.getByRole('radio', { name: 'HEX', exact: true }).click();
  await page.screenshot({ path: '.storybook-cache/rank-color-picker.png' });
  await hex.press('Escape');
  await page.getByRole('radio', { name: 'Small', exact: true }).click();
  await page.getByRole('button', { name: 'Rename S+', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Tier name', exact: true })
    .fill('#Watchwww');
  await page
    .getByRole('textbox', { name: 'Tier name', exact: true })
    .press('Enter');
  const rename = page.getByRole('button', {
    name: 'Rename #Watchwww',
    exact: true,
  });
  await rename.hover();
  const text = await rename.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return Array.from(range.getClientRects(), (rect) => ({
      left: rect.left,
      right: rect.right,
    }));
  });
  const icon = await page
    .getByRole('button', { name: 'Move #Watchwww', exact: true })
    .locator('svg')
    .boundingBox();
  expect(icon).not.toBeNull();
  expect(text.length).toBeGreaterThan(1);
  expect(Math.min(...text.map((rect) => rect.left))).toBeGreaterThan(
    (icon?.x ?? 0) + (icon?.width ?? 0) + 1,
  );
  await page.screenshot({ path: '.storybook-cache/rank-handle-spacing.png' });
});
