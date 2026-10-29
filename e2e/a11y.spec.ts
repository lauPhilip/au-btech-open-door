// Accessibility checks with axe on every main screen (issue #39): no serious or critical problems.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousProblems(page: Page, name: string) {
  // Cards fade in; axe would read half-transparent text as low contrast.
  await page.waitForTimeout(450);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    serious.map((v) => `${name}: ${v.id} (${v.impact}) — ${v.help}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`),
  ).toEqual([]);
}

test("every main screen has no serious or critical accessibility problems", async ({ browser }) => {
  const teacher = await (await browser.newContext()).newPage();
  await teacher.goto("/teacher");
  await teacher.getByLabel("45 minutes").check();
  await expectNoSeriousProblems(teacher, "teacher setup");
  await teacher.getByRole("button", { name: "Create session" }).click();
  await expect(teacher).toHaveURL(/code=/);
  const code = new URL(teacher.url()).searchParams.get("code")!;

  const home = await (await browser.newContext()).newPage();
  await home.goto("/");
  await expectNoSeriousProblems(home, "home");

  const screen = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  await screen.goto(`/screen/${code}`);
  await expect(screen.getByText("Waiting for players…").first()).toBeVisible();
  await expectNoSeriousProblems(screen, "projector lobby");

  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  await phone.goto(`/j/${code}`);
  await expectNoSeriousProblems(phone, "join");
  await phone.getByLabel("First name or nickname").fill("Ada");
  await phone.getByLabel("Face 3").click();
  await phone.getByRole("button", { name: "Next" }).click();
  await expect(phone.getByRole("heading", { name: "Sit at a team table" })).toBeVisible();
  await expectNoSeriousProblems(phone, "team table");
  await phone.getByRole("button", { name: /Blue door/ }).click();
  await expect(phone.getByText("You're in.")).toBeVisible();
  await expectNoSeriousProblems(phone, "student lobby");

  await expect(teacher.getByText("1 joined · 1 online")).toBeVisible();
  await expectNoSeriousProblems(teacher, "teacher lobby");

  await teacher.getByRole("button", { name: "Start the story" }).click();
  await expect(phone.getByText("CEO, fourth generation")).toBeVisible();
  await expectNoSeriousProblems(phone, "story");
  await expectNoSeriousProblems(screen, "projector story");

  await teacher.getByRole("button", { name: "Start walking" }).click();
  await expect(phone.getByText(/You are in:/)).toBeVisible();
  await expectNoSeriousProblems(phone, "walk");
  await expectNoSeriousProblems(teacher, "teacher walk");
  await expectNoSeriousProblems(screen, "projector walk");

  await teacher.getByRole("button", { name: "Start the day" }).click();
  await expect(phone.getByRole("alert").getByText("Orders have stopped printing.")).toBeVisible();
  await expectNoSeriousProblems(phone, "day");
  await expectNoSeriousProblems(screen, "projector day");

  await teacher.getByRole("button", { name: "Start the vote" }).click();
  await expect(phone.getByRole("radio").first()).toBeVisible();
  await expectNoSeriousProblems(phone, "vote");
  await expectNoSeriousProblems(screen, "projector vote");
  await phone.getByRole("radio").first().click();

  await teacher.getByRole("button", { name: "Show the result" }).click();
  await expect(phone.getByRole("heading", { name: /You saw it coming/ })).toBeVisible();
  await expectNoSeriousProblems(phone, "finish");
  await expectNoSeriousProblems(screen, "projector debrief");
  await expectNoSeriousProblems(teacher, "teacher debrief");
});
