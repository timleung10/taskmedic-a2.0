import { test, expect } from "@playwright/test";

test("add job, edit actions/progress, persist", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "End shift" }).click();

  await page.getByRole("button", { name: "Add" }).click();
  await page.getByPlaceholder("e.g. ?Sepsis – improving").fill("Test job summary");
  await page.getByPlaceholder("Add a task…").fill("Task A");
  await page.getByRole("button", { name: "Add" }).first().click();
  await page.getByRole("button", { name: "Add job" }).click();

  await expect(page.locator("#list").getByText("Test job summary")).toBeVisible();

  await page.locator("#list").getByRole("button", { name: "Edit" }).first().click();
  await page.getByPlaceholder("Add action…").fill("Action 1");
  await page.getByRole("button", { name: "Add" }).nth(1).click();
  await page.getByPlaceholder("Add progress note…").fill("Did something");
  await page.getByRole("button", { name: "Add" }).nth(2).click();
  await page.locator("#editSheet").getByRole("button", { name: "Done", exact: true }).click();

  await page.locator("#list").getByRole("button", { name: "Details" }).first().click();
  await expect(page.locator("#list").getByText("Action 1")).toBeVisible();

  await page.reload();
  await expect(page.locator("#list").getByText("Test job summary")).toBeVisible();
  await page.locator("#list").getByRole("button", { name: "Details" }).first().click();
  await expect(page.locator("#list").getByText("Action 1")).toBeVisible();
});

test("add bleep shows from and persists", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: "Bleep" }).click();
  await page.getByPlaceholder("e.g. x5678 / Bleep 1234").fill("Bleep 1234");
  await page.getByPlaceholder("Job / task").fill("Please review patient");
  await page.getByPlaceholder("Add a task…").fill("Call back nurse");
  await page.getByRole("button", { name: "Add" }).first().click();
  await page.getByRole("button", { name: "Add bleep" }).click();

  await expect(page.locator("#list").getByText("Bleep 1234")).toBeVisible();

  await page.locator("#list").getByRole("button", { name: "Edit" }).first().click();
  await page.getByPlaceholder("Add action…").fill("Called back");
  await page.getByRole("button", { name: "Add" }).nth(1).click();
  await page.locator("#editSheet").getByRole("button", { name: "Done", exact: true }).click();

  await page.reload();
  await page.locator("#list").getByRole("button", { name: "Details" }).first().click();
  await expect(page.locator("#list").getByText("Called back")).toBeVisible();
});

test("review-by does not close modal and persists", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "End shift" }).click();

  // Add a job
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByPlaceholder("e.g. ?Sepsis – improving").fill("ReviewBy job");
  await page.getByRole("button", { name: "Add job" }).click();

  // Open edit from list
  await page.locator("#list").getByRole("button", { name: "Edit" }).first().click();

  const review = page.locator("#editSheet").locator('input[type="datetime-local"]');
  await review.click();
  await review.fill("2030-01-01T12:30"); // deterministic future value

  // Modal should still be open
  await expect(page.locator("#editSheet")).toBeVisible();

  // Close and reload, then reopen and ensure value persisted
  await page.locator("#editSheet").getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();

  await page.locator("#list").getByRole("button", { name: "Edit" }).first().click();
  await expect(page.locator("#editSheet").locator('input[type="datetime-local"]')).toHaveValue("2030-01-01T12:30");
});

test("add-sheet add-task button adds tasks without adding the item", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "End shift" }).click();

  await page.getByRole("button", { name: "Add" }).click();
  await page.getByPlaceholder("e.g. ?Sepsis – improving").fill("Task button job");

  const taskBox = page.getByPlaceholder("Add a task…");
  await taskBox.fill("Task 1");
  await page.getByRole("button", { name: "Add" }).first().click();
  await taskBox.fill("Task 2");
  await page.getByRole("button", { name: "Add" }).first().click();

  // item should not be created until we submit
  await expect(page.locator("#list").getByText("Task button job")).toHaveCount(0);

  await page.getByRole("button", { name: "Add job" }).click();
  await expect(page.locator("#list").getByText("Task button job")).toBeVisible();
  await page.locator("#list").getByRole("button", { name: "Details" }).first().click();
  await expect(page.locator("#list").getByText("Task 1")).toBeVisible();
  await expect(page.locator("#list").getByText("Task 2")).toBeVisible();
});

test("add-sheet Enter adds a task and does not submit the job", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "End shift" }).click();

  await page.getByRole("button", { name: "Add" }).click();
  await page.getByPlaceholder("e.g. ?Sepsis – improving").fill("Enter task job");

  const taskBox = page.getByPlaceholder("Add a task…");
  await taskBox.fill("Enter Task A");
  await taskBox.press("Enter");

  await expect(page.getByText("Enter Task A")).toBeVisible();
  await expect(page.locator("#list").getByText("Enter task job")).toHaveCount(0);

  await page.getByRole("button", { name: "Add job" }).click();
  await expect(page.locator("#list").getByText("Enter task job")).toBeVisible();
});

test("toggle task done persists after refresh", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "End shift" }).click();

  await page.getByRole("button", { name: "Add" }).click();
  await page.getByPlaceholder("e.g. ?Sepsis – improving").fill("Toggle task job");
  await page.getByPlaceholder("Add a task…").fill("Task to toggle");
  await page.getByRole("button", { name: "Add" }).first().click();
  await page.getByRole("button", { name: "Add job" }).click();

  await page.locator("#list").getByRole("button", { name: "Edit" }).first().click();
  const row = page.locator('#editSheet input[value="Task to toggle"]').locator("..");
  // checkbox is the first input in the row
  await row.locator('input[type="checkbox"]').check();

  await page.locator("#editSheet").getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();

  await page.locator("#list").getByRole("button", { name: "Details" }).first().click();
  await expect(page.locator("#list").getByText("Task to toggle")).toBeVisible();
  await page.locator("#list").getByRole("button", { name: "Edit" }).first().click();
  const row2 = page.locator('#editSheet input[value="Task to toggle"]').locator("..");
  await expect(row2.locator('input[type="checkbox"]')).toBeChecked();
  await page.locator("#editSheet").getByRole("button", { name: "Done", exact: true }).click();
});

test("remove action works and persists", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "End shift" }).click();

  await page.getByRole("button", { name: "Add" }).click();
  await page.getByPlaceholder("e.g. ?Sepsis – improving").fill("Remove action job");
  await page.getByRole("button", { name: "Add job" }).click();

  await page.locator("#list").getByRole("button", { name: "Edit" }).first().click();
  await page.getByPlaceholder("Add action…").fill("Action to remove");
  // action Add button is the second Add in the edit sheet (Tasks add is first)
  await page.locator("#editSheet").getByRole("button", { name: "Add" }).nth(1).click();
  await expect(page.locator('#editSheet input[value="Action to remove"]')).toBeVisible();

  const arow = page.locator('#editSheet input[value="Action to remove"]').locator("..");
  await arow.getByRole("button", { name: "Remove" }).click();
  await page.locator("#editSheet").getByRole("button", { name: "Done", exact: true }).click();

  await page.reload();
  await expect(page.locator("#list").getByText("Action to remove")).toHaveCount(0);
});

test("bleep called-back toggle persists", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "End shift" }).click();

  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: "Bleep" }).click();
  await page.getByPlaceholder("e.g. x5678 / Bleep 1234").fill("Bleep CB");
  await page.getByRole("button", { name: "Add bleep" }).click();

  await page.locator("#list").getByRole("button", { name: "Edit" }).first().click();
  await page.locator("#editSheet").getByLabel("Called back").check();
  await page.locator("#editSheet").getByRole("button", { name: "Done", exact: true }).click();

  await page.reload();
  await page.locator("#list").getByRole("button", { name: "Edit" }).first().click();
  await expect(page.locator("#editSheet").getByLabel("Called back")).toBeChecked();
});

test("does not bounce to top when toggling inside edit sheet", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "End shift" }).click();

  // Add a job with many tasks so edit sheet scrolls
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByPlaceholder("e.g. ?Sepsis – improving").fill("Scroll modal job");
  const taskBox = page.getByPlaceholder("Add a task…");
  for (let i = 0; i < 12; i++) {
    await taskBox.fill("Task " + i);
    await page.getByRole("button", { name: "Add" }).first().click();
  }
  await page.getByRole("button", { name: "Add job" }).click();

  await page.locator("#list").getByRole("button", { name: "Edit" }).first().click();

  const body = page.locator("#editSheet .sheetBody");
  // Force scroll within the sheet body
  await body.evaluate((el) => { el.scrollTop = 600; });

  const before = await body.evaluate((el) => el.scrollTop);

  // Toggle a checkbox (should not re-render / reset scroll)
  await page.locator('#editSheet input[type="checkbox"][data-action="toggleCheck"]').nth(8).click();

  const after = await body.evaluate((el) => el.scrollTop);
  // Allow small layout shifts, but it should not jump near top
  expect(after).toBeGreaterThan(before - 50);
});
