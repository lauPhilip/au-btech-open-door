import type { FrameLocator, Page } from "@playwright/test";

/** Press the teacher's "next step" button. If the game asks "Move on now?", answer "Move on anyway". */
export async function moveOn(teacher: Page | FrameLocator, name: string): Promise<void> {
  await teacher.getByRole("button", { name }).click();
  try {
    await teacher.getByRole("button", { name: "Move on anyway" }).click({ timeout: 800 });
  } catch {
    /* nothing was missing, so there was no question */
  }
}
