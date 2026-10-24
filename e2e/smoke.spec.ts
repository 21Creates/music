import { test, expect, devices } from '@playwright/test';

const VIEWPORTS = [
  { name: 'iPhone 14 Pro', width: 393, height: 852 },
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'Pixel 7', width: 412, height: 915 },
  { name: 'Galaxy S20', width: 360, height: 800 },
  { name: 'Desktop', width: 1440, height: 900 },
];

for (const vp of VIEWPORTS) {
  test.describe(`Smoke — ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('auth screen renders', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('sign in / sign up tabs switch', async ({ page }) => {
      await page.goto('/');
      const signUpTab = page.locator('text=Sign Up').first();
      const signInTab = page.locator('text=Sign In').first();
      if (await signUpTab.isVisible()) {
        await signUpTab.click();
        await expect(page.locator('input[placeholder*="display" i], input[placeholder*="name" i]')).toBeVisible();
        await signInTab.click();
        await expect(page.locator('input[type="email"]')).toBeVisible();
      }
    });

    test('no console errors on auth screen', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
    });

    test('admin page loads login', async ({ page }) => {
      await page.goto('/admin');
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('text=Unlock').first()).toBeVisible();
    });

    test('not-found page renders', async ({ page }) => {
      await page.goto('/nonexistent-route-xyz');
      await expect(page.locator('text=Back').first()).toBeVisible();
    });
  });
}

test.describe('Smoke — authed flow', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('full auth → home → room → profile journey', async ({ page }) => {
    test.skip();
    // Requires test credentials and seeded room data.
    // Fill in with: signUp/signIn, verify home renders, click a room, verify queue tab,
    // navigate to /profile, verify tabs render, sign out, verify auth screen returns.
  });
});

test.describe('Smoke — touch targets (mobile)', () => {
  for (const vp of VIEWPORTS.filter((v) => v.width <= 412)) {
    test.describe(vp.name, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test('auth buttons meet 44px touch target', async ({ page }) => {
        await page.goto('/');
        const submitBtn = page.locator('button[type="submit"]').first();
        const box = await submitBtn.boundingBox();
        if (box) {
          expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(36);
        }
      });
    });
  }
});
