import { expect, test } from "@playwright/test";

test("a new student sees how to play once, and can bring the card back", async ({ page }) => {
  await page.goto("/dev");
  await page.getByRole("button", { name: /Create session/ }).click();
  const teacher = page.frameLocator('iframe[title="Teacher"]');
  const ana = page.frameLocator('iframe[title="Student Ana"]');
  await expect(teacher.getByText("3 joined · 3 online")).toBeVisible({ timeout: 15_000 });
  await teacher.getByRole("button", { name: "Start the story" }).click();
  await teacher.getByRole("button", { name: "Start walking" }).click();

  const card = ana.getByRole("region", { name: "How to play" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Write a sticky note");
  await card.getByRole("button", { name: "Got it" }).click();
  await expect(card).toBeHidden();

  await ana.getByRole("button", { name: "How to play" }).click();
  await expect(card).toBeVisible();
  await ana.getByRole("button", { name: "How to play" }).click();
  await expect(card).toBeHidden();
});
