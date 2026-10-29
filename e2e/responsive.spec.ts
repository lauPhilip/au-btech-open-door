import { expect, test, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Walks one class through every phase at six screen sizes and checks that nothing breaks the layout:
// no sideways scrolling, nothing sticking out of the screen, no clipped text, and phone buttons you can hit.
// Screenshots go to test-results/responsive/ so a person can look at them too.

const SHOTS = "test-results/responsive";

const SIZES = [
  { name: "phone-small", width: 320, height: 640, touch: true },
  { name: "phone", width: 390, height: 844, touch: true },
  { name: "tablet", width: 768, height: 1024, touch: true },
  { name: "laptop", width: 1280, height: 720, touch: false },
  { name: "desktop", width: 1440, height: 900, touch: false },
  { name: "projector", width: 1920, height: 1080, touch: false },
];

/** Everything that looks wrong on the page right now, as short sentences. */
async function problems(page: Page, touch: boolean): Promise<string[]> {
  return page.evaluate((touch) => {
    const out: string[] = [];
    const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > vw + 1) out.push(`the page scrolls sideways (${document.documentElement.scrollWidth}px in ${vw}px)`);
    const label = (el: Element) => {
      const text = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
      return `<${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : ""}> "${text}"`;
    };
    const scrollsSideways = (el: Element | null) => {
      for (let e = el?.parentElement; e; e = e.parentElement) {
        const o = getComputedStyle(e).overflowX;
        if (o === "auto" || o === "scroll" || o === "hidden") return true;
      }
      return false;
    };
    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
      if (el.classList.contains("sr")) continue; // text for screen readers only
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if ((r.right > vw + 1 || r.left < -1) && !scrollsSideways(el) && style.position !== "fixed") out.push(`${label(el)} sticks out of the screen (${Math.round(r.left)}..${Math.round(r.right)} of ${vw})`);
      const hidden = style.overflowX === "hidden" || style.overflowX === "clip" || style.textOverflow === "ellipsis";
      if (hidden && el.scrollWidth > el.clientWidth + 2 && el.children.length === 0 && (el.textContent ?? "").trim()) out.push(`${label(el)} has clipped text`);
      if (touch && ["BUTTON", "SELECT"].includes(el.tagName) && (r.height < 43 || r.width < 43) && !(el as HTMLButtonElement).disabled) out.push(`${label(el)} is small to tap (${Math.round(r.width)}×${Math.round(r.height)})`);
    }
    return [...new Set(out)];
  }, touch);
}

async function join(browser: Browser, code: string, size: (typeof SIZES)[number]): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: size.touch, isMobile: size.touch && size.width < 700 });
  const page = await context.newPage();
  await page.goto(`/j/${code}`);
  await page.getByLabel("First name or nickname").fill("Ada");
  await page.getByLabel("Face 3").click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: /Blue door/ }).click();
  await expect(page.getByText("You're in.")).toBeVisible();
  return page;
}

for (const size of SIZES) {
  test(`nothing breaks at ${size.name} (${size.width}×${size.height})`, async ({ browser }) => {
    test.setTimeout(120_000);
    mkdirSync(SHOTS, { recursive: true });
    const found: string[] = [];
    const check = async (page: Page, who: string, step: string) => {
      await page.waitForTimeout(500); // let fade-ins finish
      await page.screenshot({ path: `${SHOTS}/${size.name}-${who}-${step}.png` });
      for (const p of await problems(page, size.touch)) found.push(`${who} · ${step}: ${p}`);
    };

    const teacherContext = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: size.touch, isMobile: size.touch && size.width < 700 });
    const teacher = await teacherContext.newPage();
    await teacher.goto("/teacher");
    await check(teacher, "teacher", "0-create");
    await teacher.getByRole("button", { name: "Create session" }).click();
    await expect(teacher).toHaveURL(/code=/);
    const code = new URL(teacher.url()).searchParams.get("code")!;

    const projector = size.width >= 1024 ? await (await browser.newContext({ viewport: { width: size.width, height: size.height } })).newPage() : null;
    await projector?.goto(`/screen/${code}`);

    const ada = await join(browser, code, size);
    await check(teacher, "teacher", "1-lobby");
    if (projector) await check(projector, "screen", "1-lobby");
    await check(ada, "student", "1-lobby");

    await teacher.getByRole("button", { name: "Start the story" }).click();
    await expect(ada.getByText("CEO, fourth generation")).toBeVisible();
    await check(ada, "student", "2-story");
    if (projector) await check(projector, "screen", "2-story");

    await teacher.getByRole("button", { name: "Start walking" }).click();
    await expect(ada.getByText(/You are in:/)).toBeVisible();
    await check(teacher, "teacher", "3-walk");
    await check(ada, "student", "3-walk-map");
    if (projector) await check(projector, "screen", "3-walk");
    await ada.getByRole("button", { name: "Room view" }).click();
    await expect(ada.getByRole("button", { name: /^Door to / }).first()).toBeVisible();
    await check(ada, "student", "3-walk-room");

    await teacher.getByRole("button", { name: "Start the day" }).click();
    await expect(ada.getByText(/Orders have stopped printing/).first()).toBeVisible();
    await check(ada, "student", "4-day");
    await check(teacher, "teacher", "4-day");
    if (projector) await check(projector, "screen", "4-day");

    await teacher.getByRole("button", { name: "Start the vote" }).click();
    await expect(ada.getByText(/what do we do right now/i)).toBeVisible();
    await check(ada, "student", "5-vote");
    await check(teacher, "teacher", "5-vote");
    if (projector) await check(projector, "screen", "5-vote");
    await ada.getByRole("radio").first().click();

    await teacher.getByRole("button", { name: "Show the result" }).click();
    await check(ada, "student", "6-finish");
    await check(teacher, "teacher", "6-debrief");
    if (projector) await check(projector, "screen", "6-debrief");

    expect(found, found.join("\n")).toEqual([]);
  });
}
