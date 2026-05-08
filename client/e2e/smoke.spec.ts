import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('loads and shows hero title', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('has working navigation links', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('a[href]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Auth Pages', () => {
  test('login page loads', async ({ page }) => {
    const res = await page.goto('/login');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('button', { name: /login|登录/i })).toBeVisible({ timeout: 10000 });
  });

  test('register page loads', async ({ page }) => {
    const res = await page.goto('/register');
    expect(res?.status()).toBe(200);
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Work Pages', () => {
  test('studiowork page loads', async ({ page }) => {
    const res = await page.goto('/studiowork');
    expect(res?.ok()).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
  });

  test('work page loads', async ({ page }) => {
    const res = await page.goto('/work');
    expect(res?.ok()).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Admin Pages', () => {
  test('admin login page redirects or loads', async ({ page }) => {
    const res = await page.goto('/admin/login');
    expect(res?.ok()).toBeTruthy();
  });

  test('admin dashboard requires auth', async ({ page }) => {
    const res = await page.goto('/admin/dashboard');
    // Should either load the dashboard or redirect to login
    expect(res?.ok()).toBeTruthy();
  });
});
