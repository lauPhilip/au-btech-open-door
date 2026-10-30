import { expect, test } from "@playwright/test";

test("the join screen can be switched to Danish, and the choice is remembered", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Join your class" })).toBeVisible();
  await page.getByRole("button", { name: "Dansk" }).click();
  await expect(page.getByRole("heading", { name: "Deltag i din klasse" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "da");
  await expect(page.getByRole("button", { name: "Dansk" })).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Deltag i din klasse" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Join your class" })).toBeVisible();
});
