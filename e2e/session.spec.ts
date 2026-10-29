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
  const map = page.getByRole("img", { name: /Top-down map/ });
  await map.scrollIntoViewIfNeeded();
  const box = await map.boundingBox();
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

  // Laura walks up to Mei, talks to her, and her team learns what the company depends on.
  await tapMap(laura, 340, 215);
  await laura.getByRole("button", { name: /Talk to Mei/ }).click({ timeout: 10_000 });
  const talk = laura.getByRole("dialog", { name: "Mei" });
  await expect(talk.getByText("Nine shops, one system.")).toBeVisible();
  await talk.getByRole("button", { name: "Who can log in as admin?" }).click();
  await expect(talk.getByText(/note under my keyboard/)).toBeVisible();
  await expect(talk.getByRole("button", { name: "Who can log in as admin?" })).toBeHidden(); // asked once
  await laura.keyboard.press("Escape");
  await expect(talk).toBeHidden();
  // Her teammate sees the find; the other team does not.
  await expect(laura.getByText("1 of 7 found by your team")).toBeVisible();
  await expect(wei.getByText("1 of 7 found by your team")).toBeVisible();
  await expect(linh.getByText("0 of 7 found by your team")).toBeVisible();
  // Laura writes a sticky note about Mei. It is private until she shares it.
  await laura.getByRole("button", { name: "Sticky note" }).click();
  const form = laura.getByRole("dialog", { name: /sticky note/i });
  await expect(form.getByText("On: Mei")).toBeVisible();
  await form.getByRole("button", { name: "Stick it on Mei" }).click();
  await expect(form.getByRole("alert")).toBeVisible(); // incomplete notes are refused
  await form.getByLabel("What could go wrong?").fill("Shared password on a note");
  await form.getByRole("checkbox", { name: /Leak information/ }).check();
  await form.getByRole("checkbox", { name: /A visitor or driver/ }).check();
  await form.getByRole("radio", { name: /Seen at firms like us/ }).check();
  await form.getByRole("button", { name: "Stick it on Mei" }).click();
  await expect(form).toBeHidden();
  await expect(laura.getByText("1 · private until shared")).toBeVisible();
  await expect(laura.getByText("Shared password on a note", { exact: true })).toBeVisible();
  await expect(wei.getByText("0 · private until shared")).toBeVisible();
  await expect(wei.getByText("0 · on the map")).toBeVisible(); // Wei cannot see it yet
  // She shares it: the team sees it on the list and the map, the other team does not.
  await laura.getByRole("button", { name: "Share with team" }).click();
  await expect(laura.getByText("0 · private until shared")).toBeVisible();
  await expect(laura.getByText("1 · on the map")).toBeVisible();
  await expect(wei.getByText("1 · on the map")).toBeVisible();
  await expect(wei.getByText("Shared password on a note", { exact: true })).toBeVisible();
  await expect(wei.locator("g.pin")).toHaveCount(1);
  await expect(linh.getByText("0 · on the map")).toBeVisible();
  await expect(linh.locator("g.pin")).toHaveCount(0);
  // Wei adds a similar note and shares it; Laura merges the two.
  await wei.getByRole("button", { name: "Sticky note" }).click();
  const weiForm = wei.getByRole("dialog", { name: /sticky note/i });
  await weiForm.getByLabel("What could go wrong?").fill("Admin login is shared by four people");
  await weiForm.getByRole("checkbox", { name: /Change something/ }).check();
  await weiForm.getByRole("checkbox", { name: /An employee/ }).check();
  await weiForm.getByRole("radio", { name: /Happened here/ }).check();
  await weiForm.getByRole("button", { name: "Stick it on" }).click();
  await wei.getByRole("button", { name: "Share with team" }).click();
  await expect(laura.getByText("2 · on the map")).toBeVisible();
  await laura.getByRole("checkbox", { name: /Shared password on a note/ }).check();
  await laura.getByRole("checkbox", { name: /Admin login is shared/ }).check();
  await laura.getByRole("button", { name: "Merge the two ticked notes" }).click();
  await expect(laura.getByText("1 · on the map")).toBeVisible();
  await expect(wei.getByText("1 · on the map")).toBeVisible();
  await expect(wei.getByText("Laura + 1")).toBeVisible(); // Laura's note absorbed Wei's
  await expect(wei.getByText("Shared password on a note", { exact: true })).toBeVisible();
  // Laura takes it back and deletes it.
  await laura.getByRole("button", { name: "Take back" }).click();
  await expect(laura.getByText("1 · private until shared")).toBeVisible();
  await laura.getByRole("button", { name: /Delete note/ }).click();
  await expect(laura.getByText("0 · private until shared")).toBeVisible();

  // A thing has a close-up too, with the technical layer hidden until asked for.
  await tapMap(laura, 206, 160);
  await laura.getByRole("button", { name: /Look at Live order screen/ }).click({ timeout: 10_000 });
  const thing = laura.getByRole("dialog", { name: "Live order screen" });
  await expect(thing.getByText("Shows orders from all nine shops")).toBeVisible();
  await expect(thing.getByText(/over the internet/)).toBeHidden();
  await thing.getByRole("button", { name: "Look closer (technical)" }).click();
  await expect(thing.getByText(/over the internet/)).toBeVisible();
  await thing.getByRole("button", { name: "Back to the map" }).click();
  await expect(thing).toBeHidden();

  // Too far away to talk: no prompt appears for a person across the building.
  await tapMap(laura, 60, 60);
  await expect(laura.getByRole("button", { name: /Talk to Mei/ })).toBeHidden({ timeout: 10_000 });

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

test("the simulator runs a teacher, a projector and students in one window", async ({ page }) => {
  await page.goto("/dev");
  await page.getByRole("button", { name: /Create session/ }).click();
  await expect(page).toHaveURL(/\/dev\?code=[A-Z2-9]{4}$/);
  const teacher = page.frameLocator('iframe[title="Teacher"]');
  const ana = page.frameLocator('iframe[title="Student Ana"]');
  const chen = page.frameLocator('iframe[title="Student Chen"]');
  await expect(teacher.getByText("3 joined · 3 online")).toBeVisible({ timeout: 15_000 }); // students sat down on their own
  await teacher.getByRole("button", { name: "Start the story" }).click();
  await ana.getByRole("button", { name: "Next" }).click();
  await teacher.getByRole("button", { name: "Start walking" }).click();
  await expect(ana.getByText("You are in: Meeting room")).toBeVisible();
  await expect(chen.getByText("0 of 7 found by your team")).toBeVisible();
  // Reloading the whole simulator keeps every role.
  await page.reload();
  await expect(page.frameLocator('iframe[title="Student Ana"]').getByText("You are in: Meeting room")).toBeVisible();
});
