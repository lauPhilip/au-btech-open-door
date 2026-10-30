import { expect, test } from "@playwright/test";

test("a teacher continues the session from another device with the teacher link", async ({ browser, baseURL }) => {
  const first = await (await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] })).newPage();
  await first.goto("/teacher");
  await first.getByLabel("45 minutes").check();
  await first.getByRole("button", { name: "Create session" }).click();
  await expect(first.getByText("Nordknit · Black Friday · 45 min")).toBeVisible();
  const code = new URL(first.url()).searchParams.get("code")!;

  await first.getByRole("button", { name: "Copy my teacher link" }).click();
  await expect(first.getByRole("button", { name: "Teacher link copied" })).toBeVisible();
  const link = await first.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain(`/teacher?code=${code}#key=`);

  // A second device has no key: it asks for the link.
  const second = await (await browser.newContext()).newPage();
  await second.goto(`/teacher?code=${code}`);
  await expect(second.getByRole("heading", { name: `Continue session ${code}` })).toBeVisible();
  await second.getByLabel("Teacher link").fill("not a link");
  await second.getByRole("button", { name: "Continue as teacher" }).click();
  await expect(second.getByRole("alert")).toContainText("not a teacher link");

  // The pasted link works, and the key never stays in the address bar.
  await second.getByLabel("Teacher link").fill(link.replace(new URL(link).origin, baseURL!));
  await second.getByRole("button", { name: "Continue as teacher" }).click();
  await expect(second.getByText("Nordknit · Black Friday · 45 min")).toBeVisible();
  expect(second.url()).not.toContain("key=");

  // Opening the link directly also works, and the teacher can act: start the story.
  const third = await (await browser.newContext()).newPage();
  await third.goto(link.replace(new URL(link).origin, baseURL!));
  await expect(third.getByText("Nordknit · Black Friday · 45 min")).toBeVisible();
  expect(third.url()).not.toContain("key=");
  await third.getByRole("button", { name: "Start the story" }).click();
  await expect(second.getByText(/Story|story/).first()).toBeVisible();
});
