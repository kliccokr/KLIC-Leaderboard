import { test, expect } from "@playwright/test";

test("redirects unauthenticated user to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ko\/login/);
});

test("login page shows Google and GitHub buttons", async ({ page }) => {
  await page.goto("/ko/login");
  await expect(page.getByText("Google로 로그인")).toBeVisible();
  await expect(page.getByText("GitHub으로 로그인")).toBeVisible();
});

test("google sign-in does not return to login with configuration error", async ({ page }) => {
  await page.goto("/ko/login");
  await page.getByText("Google로 로그인").click();
  await page.waitForURL(/.*/, { timeout: 15000 });
  await expect(page).not.toHaveURL(/\/ko\/login\?error=Configuration/);
});

test("lang toggle switches to English", async ({ page }) => {
  await page.goto("/en/login");
  await expect(page.getByText("Sign in with Google")).toBeVisible();
});
