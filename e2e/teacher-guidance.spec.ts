import { expect, test } from "@playwright/test";

test("the teacher is told what to do, asked before leaving tables behind, and can save the class record", async ({ page }) => {
  await page.goto("/dev");
  await page.getByRole("button", { name: /Create session/ }).click();
  const teacher = page.frameLocator('iframe[title="Teacher"]');
  await expect(teacher.getByText("3 joined · 3 online")).toBeVisible({ timeout: 15_000 });

  const strip = teacher.getByRole("status").filter({ hasText: "Now" });
  await expect(strip).toContainText("3 students are seated");
  await teacher.getByRole("button", { name: "Start the story" }).click();
  await expect(strip).toContainText("When they have finished, start the walk");
  await teacher.getByRole("button", { name: "Start walking" }).click();
  await expect(strip).toContainText("0 of 2 tables say they are done");

  // Nobody is done yet, so moving on asks first. "Wait" keeps the walk going.
  await teacher.getByRole("button", { name: "Start the day" }).click();
  const question = teacher.getByRole("dialog", { name: "Move on now?" });
  await expect(question).toContainText("2 tables are not done yet");
  await question.getByRole("button", { name: "Wait" }).click();
  await expect(question).toBeHidden();
  await expect(strip).toContainText("tables say they are done");

  await teacher.getByRole("button", { name: "Start the day" }).click();
  await teacher.getByRole("button", { name: "Move on anyway" }).click();
  await expect(strip).toContainText("start the vote");

  // Ending the session offers the class record first.
  await teacher.getByText("Finished with this session?").click();
  await teacher.getByRole("button", { name: "Close the session" }).click();
  const ending = teacher.getByRole("dialog", { name: "End the session?" });
  const download = page.waitForEvent("download");
  await ending.getByRole("button", { name: "Download the class record" }).click();
  expect((await download).suggestedFilename()).toMatch(/class-record\.csv$/);
  await ending.getByRole("button", { name: "Keep the session" }).click();
  await expect(ending).toBeHidden();
  await expect(teacher.getByText("3 joined · 3 online")).toBeVisible();
});
