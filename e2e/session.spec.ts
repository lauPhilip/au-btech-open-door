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
  for (const page of [laura, wei, screen]) await expect(page.getByRole("img", { name: /Top-down map/ })).toBeVisible();
  await expect(linh.getByRole("img", { name: /Illustration of the Meeting room/ })).toBeVisible(); // phones start in the room view
  await linh.getByRole("button", { name: "Map" }).click();
  await expect(laura.getByText("You are in: Meeting room")).toBeVisible();
  await expect(wei.getByText("You are in: Meeting room")).toBeVisible();

  // Laura clicks into the webshop team's room and walks there.
  await tapMap(laura, 200, 150);
  await expect(laura.getByText("You are in: Webshop team")).toBeVisible({ timeout: 10_000 });
  // Her teammate's checklist ticks the room; the other team's does not.
  // (There are no walls yet, so rooms she walked through on the way count too.)
  const roomButton = (page: Page, room: string) => page.getByRole("button", { name: new RegExp(`^Walk to ${room},`) });
  await expect(roomButton(wei, "Webshop team")).not.toHaveAccessibleName(/not visited/);
  await expect(roomButton(linh, "Webshop team")).toHaveAccessibleName(/not visited/);
  await expect(linh.getByText("1 of 9 visited by your team")).toBeVisible();
  await expect(screen.getByText(/[2-9] of 9 rooms/)).toBeVisible();

  // Laura walks up to Mei, talks to her, and her team learns what the company depends on.
  await tapMap(laura, 400, 232);
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
  await tapMap(laura, 284, 185);
  await laura.getByRole("button", { name: /Look at Live order screen/ }).click({ timeout: 10_000 });
  const thing = laura.getByRole("dialog", { name: "Live order screen" });
  await expect(thing.getByText("Shows orders from all nine shops")).toBeVisible();
  await expect(thing.getByText(/over the internet/)).toBeHidden();
  await thing.getByRole("button", { name: "Look closer (technical)" }).click();
  await expect(thing.getByText(/over the internet/)).toBeVisible();
  await thing.getByRole("button", { name: "Back" }).click();
  await expect(thing).toBeHidden();

  // Too far away to talk: no prompt appears for a person across the building.
  await tapMap(laura, 110, 105);
  await expect(laura.getByRole("button", { name: /Talk to Mei/ })).toBeHidden({ timeout: 10_000 });

  // Wei walks with the keyboard.
  await wei.keyboard.down("ArrowDown");
  await wei.waitForTimeout(1500);
  await wei.keyboard.up("ArrowDown");
  // The wall stops him: the only way out of the meeting room is its door.
  await expect(wei.getByText("You are in: Meeting room")).toBeVisible();

  // The room list is a second way to walk, for keyboards and screen readers: no map needed.
  await wei.getByRole("button", { name: "Walk to Server cupboard, not visited yet" }).click();
  await expect(wei.getByText("You are in: Server cupboard")).toBeVisible({ timeout: 10_000 });
  await wei.getByRole("button", { name: "Walk to Ahmed" }).click();
  await expect(wei.getByRole("button", { name: /Talk to Ahmed/ })).toBeVisible({ timeout: 10_000 });

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

test("nothing moves on its own when the player asks for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev");
  await page.getByRole("button", { name: /Create session/ }).click();
  const teacher = page.frameLocator('iframe[title="Teacher"]');
  const ana = page.frameLocator('iframe[title="Student Ana"]');
  await expect(teacher.getByText("3 joined · 3 online")).toBeVisible({ timeout: 15_000 });
  await teacher.getByRole("button", { name: "Start the story" }).click();
  await expect(ana.getByRole("button", { name: "Next" })).toBeVisible();
  const moving = async () =>
    ana.locator("body").evaluate(() =>
      [...document.querySelectorAll("*")].filter((el) => {
        const style = getComputedStyle(el);
        return style.animationName !== "none" || parseFloat(style.transitionDuration) > 0;
      }).length,
    );
  expect(await moving()).toBe(0);
  await ana.getByRole("button", { name: "Next" }).click();
  await teacher.getByRole("button", { name: "Start walking" }).click();
  await expect(ana.getByText("You are in: Meeting room")).toBeVisible();
  expect(await moving()).toBe(0); // avatars on the map jump instead of gliding
});

test("the teacher runs the walk and the day: pause, start, clues and messages", async ({ page }) => {
  await page.clock.install();
  await page.goto("/dev");
  await page.getByRole("button", { name: /Create session/ }).click();
  const teacher = page.frameLocator('iframe[title="Teacher"]');
  const ana = page.frameLocator('iframe[title="Student Ana"]');
  const ben = page.frameLocator('iframe[title="Student Ben"]');
  const chen = page.frameLocator('iframe[title="Student Chen"]');
  await expect(teacher.getByText("3 joined · 3 online")).toBeVisible({ timeout: 15_000 });
  await teacher.getByRole("button", { name: "Start the story" }).click();
  await ana.getByRole("button", { name: "Next" }).click();
  await teacher.getByRole("button", { name: "Start walking" }).click();

  // The walk has a countdown for everyone.
  await expect(ana.getByText(/Walk and spot · \d+:\d\d left/)).toBeVisible();
  await expect(teacher.getByText(/\d+:\d\d left/)).toBeVisible();

  // Pausing stops the whole class; resuming lets them play again.
  await teacher.getByRole("button", { name: "Pause all" }).click();
  await expect(ana.getByRole("alertdialog", { name: "Paused" })).toBeVisible();
  await expect(chen.getByRole("alertdialog", { name: "Paused" })).toBeVisible();
  await teacher.getByRole("button", { name: "Resume all" }).click();
  await expect(ana.getByRole("alertdialog", { name: "Paused" })).toBeHidden();
  await teacher.getByRole("button", { name: "+5 minutes" }).click();

  // The day starts: alert, clock and a clue counter.
  await teacher.getByRole("button", { name: "Start the day" }).click();
  await expect(ana.getByRole("alert").getByText("Orders have stopped printing.")).toBeVisible();
  await expect(ana.getByRole("timer", { name: /Game clock 07:5\d/ })).toBeVisible();
  await expect(ana.getByLabel("Clues found: 0 of 4")).toBeVisible();
  await expect(ana.getByText("All quiet so far.")).toBeVisible();
  await expect(teacher.getByText(/day ends 10:00/)).toBeVisible();

  // Walking into a room with a clue finds it for the whole team, not for the other team.
  await ana.getByRole("button", { name: /^Walk to Packing station,/ }).click();
  // (There are no walls yet, so clue rooms on the way count too: at least one clue, maybe two.)
  await expect(ana.getByLabel(/Clues found: [1-4] of 4/)).toBeVisible({ timeout: 15_000 });
  await expect(ana.getByText(/paused by admin/)).toBeVisible();
  await expect(ben.getByLabel(/Clues found: [1-4] of 4/)).toBeVisible();
  await expect(chen.getByLabel("Clues found: 0 of 4")).toBeVisible();

  // Mei's first message arrives at 08:04, nine game minutes in (7.5 s each in a 45-minute class).
  await page.clock.fastForward(80_000);
  await expect(ana.getByText(/The shop is up and orders come in/).first()).toBeVisible({ timeout: 10_000 });
  await expect(chen.getByText(/The shop is up and orders come in/).first()).toBeVisible();
});

test("the class votes on what the CEO should do and sees what their notes predicted", async ({ page }) => {
  await page.goto("/dev");
  await page.getByRole("button", { name: /Create session/ }).click();
  const teacher = page.frameLocator('iframe[title="Teacher"]');
  const projector = page.frameLocator('iframe[title="Projector"]');
  const ana = page.frameLocator('iframe[title="Student Ana"]');
  const ben = page.frameLocator('iframe[title="Student Ben"]');
  const chen = page.frameLocator('iframe[title="Student Chen"]');
  await expect(teacher.getByText("3 joined · 3 online")).toBeVisible({ timeout: 15_000 });
  await teacher.getByRole("button", { name: "Start the story" }).click();
  await teacher.getByRole("button", { name: "Start walking" }).click();
  await teacher.getByRole("button", { name: "Start the day" }).click();
  await teacher.getByRole("button", { name: "Start the vote" }).click();

  // Everyone sees the question with three choices.
  await expect(ana.getByRole("heading", { name: /what do we do right now/ })).toBeVisible();
  await expect(ana.getByRole("radio")).toHaveCount(3);
  await expect(projector.getByText("0 of 2 voted").first()).toBeVisible();

  // Ana and Ben (same table) choose the best answer; Chen (another table) chooses the first.
  await ana.getByRole("radio", { name: /Take the printer off/ }).click();
  await expect(ana.getByRole("radio", { name: /Take the printer off/ })).toBeChecked();
  await expect(ana.getByText("1 of 2 at your table has voted.")).toBeVisible();
  await ben.getByRole("radio", { name: /Take the printer off/ }).click();
  await chen.getByRole("radio", { name: /Restart the printer/ }).click();
  await expect(projector.getByText("✓ All voted").first()).toBeVisible();
  await expect(teacher.getByText("3 of 3 students have voted.")).toBeVisible();

  // The result: the table's decision and the answer key.
  await teacher.getByRole("button", { name: "Show the result" }).click();
  await expect(ana.getByText("Labels print from 09:05. The truck leaves full at 10:00.")).toBeVisible();
  await expect(ana.getByText(/the best choice/)).toBeVisible();
  await expect(ana.getByRole("heading", { name: /You saw it coming: 0 of 6/ })).toBeVisible();
  await expect(chen.getByText("Labels print again at 09:10. At 09:25 the printer is paused again.")).toBeVisible();
  await expect(projector.getByText("Labels print from 09:05. The truck leaves full at 10:00.")).toBeVisible();

  // The projector shows the class table, the CyPro names and the first question; the teacher steps through them.
  await expect(projector.getByRole("table", { name: "Which team saw which problem coming" })).toBeVisible();
  await expect(projector.getByText("What you did has a name in the CyPro method")).toBeVisible();
  await expect(projector.getByText(/Which team spotted the printer on the guest Wi-Fi/)).toBeVisible();
  await teacher.getByRole("button", { name: "Next question" }).click();
  await expect(projector.getByText(/The fake visitor came in before reception opened/)).toBeVisible();
});

test("the teacher moves a student, sees a stuck team and sends a hint", async ({ page }) => {
  await page.clock.install();
  await page.goto("/dev");
  await page.getByRole("button", { name: /Create session/ }).click();
  const teacher = page.frameLocator('iframe[title="Teacher"]');
  const ana = page.frameLocator('iframe[title="Student Ana"]');
  await expect(teacher.getByText("3 joined · 3 online")).toBeVisible({ timeout: 15_000 });

  // Before the walk the teacher can move a student to another table.
  await teacher.getByLabel("Move Ana to another table").selectOption({ label: "Yellow door" });
  await expect(ana.getByText("Yellow door").first()).toBeVisible();

  // During the walk the overview shows every team; a team that does not move for three minutes is flagged.
  await teacher.getByRole("button", { name: "Start the story" }).click();
  await teacher.getByRole("button", { name: "Start walking" }).click();
  await expect(teacher.getByRole("table", { name: "Progress per team" })).toBeVisible();
  await expect(teacher.getByText("May need help")).toBeHidden();
  await page.clock.fastForward(200_000);
  await expect(teacher.getByText(/May need help · no movement for 3 min/).first()).toBeVisible();

  // One tap sends a hint that shows on that team's phones until closed.
  await teacher.getByRole("row").filter({ hasText: "Yellow door" }).getByRole("button", { name: "Send a hint" }).click();
  await teacher.getByRole("button", { name: "Talk to everyone in the room you are in." }).click();
  await expect(ana.getByText("Hint from your teacher:")).toBeVisible();
  await ana.getByRole("button", { name: "Close the hint" }).click();
  await expect(ana.getByText("Hint from your teacher:")).toBeHidden();

  // Done after a few minutes? The teacher can end the walk and go straight to the summary.
  page.once("dialog", (d) => d.accept());
  await teacher.getByRole("button", { name: "End now and show summary" }).click();
  await expect(teacher.getByText(/Debrief: question 1 of/)).toBeVisible();
  await expect(teacher.getByRole("button", { name: "End now and show summary" })).toBeHidden();

  // Finished for good: closing the session ends it on every screen and deletes the data.
  page.once("dialog", (d) => d.accept());
  await teacher.getByText("Finished with this session?").click();
  await teacher.getByRole("button", { name: "Close the session" }).click();
  await expect(teacher.getByRole("heading", { name: "This session has ended" })).toBeVisible();
  await expect(ana.getByRole("heading", { name: "This session has ended" })).toBeVisible();
});

test("a student who loses the network or reloads keeps their name, team, place and notes", async ({ browser }) => {
  const teacher = await (await browser.newContext()).newPage();
  await teacher.goto("/teacher");
  await teacher.getByRole("button", { name: "Create session" }).click();
  await expect(teacher).toHaveURL(/code=/);
  const code = new URL(teacher.url()).searchParams.get("code")!;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  // Keep hold of the live connection, so the test can cut it like a bad network would.
  let live: { close: (options?: { code?: number }) => void } | null = null;
  await page.routeWebSocket(/game-room/, (ws) => {
    ws.connectToServer();
    live = ws;
  });
  await page.goto(`/j/${code}`);
  await page.getByLabel("First name or nickname").fill("Ada");
  await page.getByLabel("Face 3").click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: /Blue door/ }).click();
  await expect(page.getByText("You're in.")).toBeVisible();
  await teacher.getByRole("button", { name: "Start the story" }).click();
  await teacher.getByRole("button", { name: "Start walking" }).click();
  await page.getByRole("button", { name: /^Walk to Packing station,/ }).click();
  await expect(page.getByText("You are in: Packing station")).toBeVisible({ timeout: 15_000 });

  // She writes a note.
  await page.getByRole("button", { name: "Sticky note" }).click();
  const form = page.getByRole("dialog", { name: /sticky note/i });
  await form.getByLabel("What could go wrong?").fill("Printer on guest wifi");
  await form.getByRole("checkbox", { name: /Change something/ }).check();
  await form.getByRole("checkbox", { name: /A visitor or driver/ }).check();
  await form.getByRole("radio", { name: /Seen at firms like us/ }).check();
  await form.getByRole("button", { name: /Stick it on/ }).click();
  await expect(page.getByText("1 · private until shared").first()).toBeVisible();

  // The network drops: she sees "Reconnecting…", then it comes back and nothing is lost.
  (live as unknown as { close: (o?: { code?: number }) => void }).close({ code: 1006 });
  await expect(page.getByText("Reconnecting…")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Connected")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("You are in: Packing station")).toBeVisible();

  // A full reload brings back team, place and notes too.
  await page.reload();
  await expect(page.getByText("Blue door").first()).toBeVisible();
  await expect(page.getByText("You are in: Packing station")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("1 · private until shared").first()).toBeVisible();
});

test("a student can swap the map for the room view and walk door to door", async ({ browser }) => {
  const teacher = await (await browser.newContext()).newPage();
  await teacher.goto("/teacher");
  await teacher.getByRole("button", { name: "Create session" }).click();
  await expect(teacher).toHaveURL(/code=/);
  const code = new URL(teacher.url()).searchParams.get("code")!;
  const page = await student(browser, code, "Ada", 2, "Blue door");
  await teacher.getByRole("button", { name: "Start the story" }).click();
  await teacher.getByRole("button", { name: "Start walking" }).click();
  await expect(page.getByText(/You are in:/)).toBeVisible();

  // The map is the default; the room view shows the inside of the room and its doors.
  await expect(page.getByRole("img", { name: /Top-down map/ })).toBeVisible();
  await page.getByRole("button", { name: "Room view" }).click();
  await expect(page.getByRole("img", { name: /Illustration of the Meeting room/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Door to CEO office" })).toBeVisible();
  await expect(page.getByText("You", { exact: true })).toBeVisible(); // your own character stands in the room

  // A door walks you to the next room, and its people and things are in the scene.
  await page.getByText("Go to any room").click();
  await page.getByRole("navigation", { name: "Doors to other rooms" }).getByRole("button", { name: "Packing station" }).click();
  await expect(page.getByText("You are in: Packing station")).toBeVisible({ timeout: 25_000 });
  await expect(page.getByRole("img", { name: /Illustration of the Packing station/ })).toBeVisible();

  // Tapping a person opens the same close-up as on the map.
  await page.getByRole("button", { name: "Talk to Jana" }).click();
  await expect(page.getByRole("dialog")).toContainText("Packing lead", { timeout: 15_000 });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("img", { name: /Top-down map/ })).toBeVisible();
});

test("a team downloads its notes as a CyPro table and the teacher downloads the class summary", async ({ browser }) => {
  const teacher = await (await browser.newContext()).newPage();
  await teacher.goto("/teacher");
  await teacher.getByRole("button", { name: "Create session" }).click();
  await expect(teacher).toHaveURL(/code=/);
  const code = new URL(teacher.url()).searchParams.get("code")!;
  const page = await student(browser, code, "Ada", 2, "Blue door", true);
  await teacher.getByRole("button", { name: "Start the story" }).click();
  await teacher.getByRole("button", { name: "Start walking" }).click();
  await page.getByRole("button", { name: /^Walk to Packing station,/ }).click();
  await expect(page.getByText("You are in: Packing station")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Sticky note" }).click();
  const form = page.getByRole("dialog", { name: /sticky note/i });
  await form.getByLabel("What could go wrong?").fill("=SUM(1+1) printer on guest wifi");
  await form.getByRole("checkbox", { name: /Change something/ }).check();
  await form.getByRole("checkbox", { name: /A visitor or driver/ }).check();
  await form.getByRole("radio", { name: /Seen at firms like us/ }).check();
  await form.getByRole("button", { name: /Stick it on/ }).click();
  await teacher.getByRole("button", { name: "Start the day" }).click();
  await teacher.getByRole("button", { name: "Start the vote" }).click();
  await page.getByRole("radio").first().click();
  await teacher.getByRole("button", { name: "Show the result" }).click();

  // The student's table: CyPro columns, the note, and formulas defused.
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download CSV" }).click()]);
  expect(file.suggestedFilename()).toMatch(/^blue-door-[a-z0-9]{4}-cypro-threats\.csv$/);
  const csv = (await import("node:fs")).readFileSync((await file.path())!, "utf8");
  expect(csv).toContain('"Threat","Target (asset or component)","Where","Harm (C · I · A)","Threat actor","Likelihood (1–4)","Impact","Noted by"');
  expect(csv).toContain("'=SUM(1+1) printer on guest wifi");
  expect(csv).toContain("I · Integrity (change)");
  expect(csv).toContain("3 · Seen at firms like us");
  expect(csv).toContain('"Ada"');

  // The teacher's summary has every team's notes and the debrief table.
  await expect(teacher.getByRole("region", { name: "Class summary" })).toBeVisible();
  await expect(teacher.getByText(/deleted six hours after they start/)).toBeVisible();
  const [notes] = await Promise.all([teacher.waitForEvent("download"), teacher.getByRole("button", { name: "Download all notes (CSV)" }).click()]);
  const all = (await import("node:fs")).readFileSync((await notes.path())!, "utf8");
  expect(all).toContain('"Team","Threat"');
  expect(all).toContain('"Blue door"');
  expect(all).toContain("printer on guest wifi");
  const [debrief] = await Promise.all([teacher.waitForEvent("download"), teacher.getByRole("button", { name: "Download the debrief table (CSV)" }).click()]);
  const table = (await import("node:fs")).readFileSync((await debrief.path())!, "utf8");
  expect(table).toContain('"Problem on the day","Blue door"');
});

test("a table tells the teacher it is done, and the teacher sees it until the class moves on", async ({ page }) => {
  await page.goto("/dev");
  await page.getByRole("button", { name: /Create session/ }).click();
  const teacher = page.frameLocator('iframe[title="Teacher"]');
  const ana = page.frameLocator('iframe[title="Student Ana"]');
  await expect(teacher.getByText("3 joined · 3 online")).toBeVisible({ timeout: 15_000 });
  await teacher.getByRole("button", { name: "Start the story" }).click();
  await teacher.getByRole("button", { name: "Start walking" }).click();
  await expect(teacher.getByText(/^0 of \d teams say they are done/)).toBeVisible();

  // One student speaks for the table.
  await ana.getByRole("button", { name: "Our table is done" }).click();
  await expect(ana.getByRole("button", { name: "Table is done" })).toHaveAttribute("aria-pressed", "true");
  await expect(ana.getByText(/told your teacher your table is ready for the day/)).toBeVisible();
  await expect(teacher.getByText(/Says it is done · Ana/)).toBeVisible();
  await expect(teacher.getByText(/^1 of \d teams say they are done/)).toBeVisible();

  // They can take it back.
  await ana.getByRole("button", { name: "Table is done" }).click();
  await expect(teacher.getByText(/Says it is done/)).toBeHidden();

  // It is cleared when the class moves on, so each step starts fresh.
  await ana.getByRole("button", { name: "Our table is done" }).click();
  await expect(teacher.getByText(/Says it is done · Ana/)).toBeVisible();
  await teacher.getByRole("button", { name: "Start the day" }).click();
  await expect(teacher.getByText(/Says it is done/)).toBeHidden();
  await expect(ana.getByRole("button", { name: "Our table is done" })).toBeVisible();
});

test("after the last debrief question the teacher shows the class summary and then ends the session", async ({ page }) => {
  await page.goto("/dev");
  await page.getByRole("button", { name: /Create session/ }).click();
  const teacher = page.frameLocator('iframe[title="Teacher"]');
  const screen = page.frameLocator('iframe[title="Projector"]');
  await expect(teacher.getByText("3 joined · 3 online")).toBeVisible({ timeout: 15_000 });
  await teacher.getByRole("button", { name: "Start the story" }).click();
  await teacher.getByRole("button", { name: "Start walking" }).click();
  page.once("dialog", (d) => d.accept());
  await teacher.getByRole("button", { name: "End now and show summary" }).click();
  await expect(teacher.getByText(/Debrief: question 1 of/)).toBeVisible();

  // Questions go on one by one; on the last one the next step is the class summary, not another question.
  await expect(teacher.getByRole("button", { name: "Show the class summary" })).toBeHidden();
  const total = Number((await teacher.getByRole("heading", { name: /Debrief: question 1 of/ }).textContent())!.match(/of (\d+)/)![1]);
  for (let n = 2; n <= total; n++) {
    await teacher.getByRole("button", { name: "Next question" }).click();
    await expect(teacher.getByRole("heading", { name: `Debrief: question ${n} of ${total}` })).toBeVisible();
  }
  await expect(teacher.getByRole("button", { name: "Next question" })).toBeHidden();
  await expect(screen.getByText("Question for the class")).toBeVisible();
  await teacher.getByRole("button", { name: "Show the class summary" }).click();
  await expect(screen.getByText("Class summary", { exact: true })).toBeVisible();
  await expect(screen.getByText(/Your teacher will end the session soon/)).toBeVisible();
  await expect(teacher.getByRole("heading", { name: "Class summary is on the big screen" })).toBeVisible();

  // Back to the questions works, and ending the session closes it everywhere.
  await teacher.getByRole("button", { name: "Back to the questions" }).click();
  await expect(screen.getByText("Question for the class")).toBeVisible();
  await teacher.getByRole("button", { name: "Show the class summary" }).click();
  page.once("dialog", (d) => d.accept());
  await teacher.getByRole("button", { name: "End the session" }).click();
  await expect(teacher.getByRole("heading", { name: "This session has ended" })).toBeVisible();
});
