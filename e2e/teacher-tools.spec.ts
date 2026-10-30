import { expect, test } from "@playwright/test";

test("the teacher can rename and remove a student", async ({ browser }) => {
  const teacher = await (await browser.newContext()).newPage();
  await teacher.goto("/teacher");
  await teacher.getByLabel("45 minutes").check();
  await teacher.getByRole("button", { name: "Create session" }).click();
  await expect(teacher.getByText("Nordknit · Black Friday · 45 min")).toBeVisible();
  const code = new URL(teacher.url()).searchParams.get("code")!;

  const student = await (await browser.newContext()).newPage();
  await student.goto(`/j/${code}`);
  await student.getByLabel("First name or nickname").fill("Sam");
  await student.getByRole("button", { name: "Next" }).click();
  await student.getByRole("button", { name: /Blue/ }).click();
  await expect(student.getByText("You're in.")).toBeVisible();

  await teacher.getByText("Manage students (1)").click();
  await teacher.getByRole("button", { name: "Rename Sam" }).click();
  await teacher.getByLabel("New name for Sam").fill("Samira");
  await teacher.getByRole("button", { name: "Save" }).click();
  await expect(student.getByText("Samira").first()).toBeVisible();

  await teacher.getByRole("button", { name: "Remove Samira" }).click();
  await teacher.getByRole("button", { name: "Remove Samira for good?" }).click();
  await expect(student.getByRole("heading", { name: "You were removed" })).toBeVisible();
  await expect(teacher.getByText("Manage students (0)")).toBeVisible();

  // Opening the join link again does not get the student back in.
  await student.reload();
  await expect(student.getByRole("heading", { name: "You were removed" })).toBeVisible();
});
