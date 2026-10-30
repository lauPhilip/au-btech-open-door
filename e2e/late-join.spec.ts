import { expect, test } from "@playwright/test";

test("a student who joins after the walk has started is seated and told where", async ({ page, browser }) => {
  await page.goto("/dev");
  await page.getByRole("button", { name: /Create session/ }).click();
  const teacher = page.frameLocator('iframe[title="Teacher"]');
  await expect(teacher.getByText("3 joined · 3 online")).toBeVisible({ timeout: 15_000 });
  const code = new URL(await page.locator('iframe[title="Teacher"]').getAttribute("src") ?? "", page.url()).searchParams.get("code")!;
  await teacher.getByRole("button", { name: "Start the story" }).click();
  await teacher.getByRole("button", { name: "Start walking" }).click();

  const late = await (await browser.newContext()).newPage();
  await late.goto(`/j/${code}`);
  await late.getByLabel("First name or nickname").fill("Lena");
  await late.getByRole("button", { name: "Next" }).click();
  await expect(late.getByText(/You joined late, so you sit at the .* table/)).toBeVisible({ timeout: 15_000 });
  await expect(late.getByRole("button", { name: "Our table is done" })).toBeVisible();
  await teacher.getByText(/Manage students/).click();
  await expect(teacher.getByText(/joined late/)).toBeVisible();
});
