import { expect, test, type Browser, type Page } from "@playwright/test";

const MAP_WIDTH = 1206; // Nordknit map, from scenarios/nordknit/black-friday.yaml
const MAP_HEIGHT = 770;

async function student(browser: Browser, code: string, name: string, face: number, team: string, phone = false): Promise<Page> {
  const context = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : {});
  const page = await context.newPage();
  await page.goto(`/j/${code}`);
  await page.getByLabel("First name or nickname").fill(name);
  await page.getByLabel(`Face ${face + 1}`).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Sit at a team table" })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(team) }).click();
  await expect(page.getByText("You're in.")).toBeVisible();
  return page;
}

/** Click a point on the office map, given in map units. */
async function tapMap(page: Page, x: number, y: number) {
  const box = await page.getByRole("img", { name: /Top-down map/ }).boundingBox();
  if (!box) throw new Error("No map on the page");
  await page.mouse.click(box.x + (x / MAP_WIDTH) * box.width, box.y + (y / MAP_HEIGHT) * box.height);
}

test("a class joins, hears the story and walks the office together", async ({ browser }) => {
  // The teacher creates a session.
  const teacher = await (await browser.newContext()).newPage();
  await teacher.goto("/teacher");
  await teacher.getByLabel("45 minutes").check();
  await teacher.getByRole("button", { name: "Create session" }).click();
  await expect(teacher).toHaveURL(/\/teacher\?code=[A-Z2-9]{4}$/);
  const code = new URL(teacher.url()).searchParams.get("code")!;
  await expect(teacher.getByText("Nordknit · Black Friday · 45 min")).toBeVisible();

  // The projector shows the code and the empty tables.
  const screen = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  await screen.goto(`/screen/${code}`);
  await expect(screen.getByLabel(new RegExp(`Code ${code.split("").join(" ")}`))).toBeVisible();
  await expect(screen.getByText("Waiting for players…").first()).toBeVisible();

  // Three students join: two at the blue table, one on a phone at the green table.
  const laura = await student(browser, code, "Laura", 2, "Blue door");
  const wei = await student(browser, code, "Wei", 7, "Blue door");
  const linh = await student(browser, code, "Linh", 11, "Green door", true);
  await expect(laura.getByText("Wei")).toBeVisible(); // teammates see each other
  await expect(screen.getByText("3 students are at a table")).toBeVisible();
  await expect(teacher.getByText("3 joined · 3 online")).toBeVisible();

  // Story: everyone sees Karin.
  await teacher.getByRole("button", { name: "Start the story" }).click();
  await expect(screen.getByText("Karin").first()).toBeVisible();
  await expect(linh.getByText("CEO, fourth generation")).toBeVisible();
  await linh.getByRole("button", { name: "Next" }).click();
  await expect(linh.getByText(/ten times more orders/)).toBeVisible();

  // Walk: the map appears for students and on the projector.
  await teacher.getByRole("button", { name: "Start walking" }).click();
  for (const page of [laura, wei, linh, screen]) await expect(page.getByRole("img", { name: /Top-down map/ })).toBeVisible();
  await expect(laura.getByText("You are in: Meeting room")).toBeVisible();
  await expect(wei.getByText("You are in: Meeting room")).toBeVisible();

  // Laura clicks into the webshop team's room and walks there.
  await tapMap(laura, 200, 150);
  await expect(laura.getByText("You are in: Webshop team")).toBeVisible({ timeout: 10_000 });
  // Her teammate's checklist ticks the room; the other team's does not.
  // (There are no walls yet, so rooms she walked through on the way count too.)
  const roomItem = (page: Page, room: string) => page.getByRole("list").first().getByRole("listitem").filter({ hasText: room });
  await expect(roomItem(wei, "Webshop team")).not.toContainText("not visited");
  await expect(roomItem(linh, "Webshop team")).toContainText("not visited");
  await expect(linh.getByText("1 of 9 visited by your team")).toBeVisible();
  await expect(screen.getByText(/[2-9] of 9 rooms/)).toBeVisible();

  // Wei walks with the keyboard.
  await wei.keyboard.down("ArrowDown");
  await wei.waitForTimeout(1200);
  await wei.keyboard.up("ArrowDown");
  // He has left the meeting room (where he ends up depends on where he started).
  await expect(wei.getByText("You are in: Meeting room")).toBeHidden();

  // Linh on the phone taps the accounting office.
  await tapMap(linh, 520, 120);
  await expect(linh.getByText("You are in: Accounting")).toBeVisible({ timeout: 10_000 });

  // Laura's page reloads (a network drop): she comes back where she was, in her team.
  await laura.reload();
  await expect(laura.getByText("You are in: Webshop team")).toBeVisible();
  await expect(laura.getByText("Blue door")).toBeVisible();
  await expect(teacher.getByText("3 joined · 3 online")).toBeVisible();

  // Closing a student's page shows them as offline to the teacher.
  await linh.context().close();
  await expect(teacher.getByText("3 joined · 2 online")).toBeVisible();
});

test("a wrong code gets a clear message", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Code from the big screen").fill("zz22");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("There is no session with the code ZZ22")).toBeVisible();
});

test("the network test still works at its new address", async ({ page }) => {
  await page.goto("/network-test?room=e2e");
  await page.getByLabel("Your first name or a nickname").fill("Tester");
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByText("Connected")).toBeVisible();
});
