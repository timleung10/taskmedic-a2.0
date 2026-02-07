import { test, expect, type Page } from "@playwright/test";

async function resetDB(page: Page) {
  await page.evaluate(() => {
    indexedDB.deleteDatabase("keyval-store");
  });
  await page.reload();
}

async function openFirstCard(page: Page) {
  const card = page.locator('[data-testid^="item-card-"]').first();
  const isExpanded = await card.evaluate((el) => el.classList.contains("is-expanded"));
  if (!isExpanded) await card.click();
  await expect(card).toHaveClass(/is-expanded/);
  return card;
}

async function openAddSheet(page: Page) {
  await page.getByTestId("open-add").click();
  await expect(page.locator("#addSheet")).toBeVisible();
}

async function openEditSheet(card: ReturnType<Page["locator"]>) {
  await card.getByRole("button", { name: "Edit" }).click();
}

test("add job, edit actions/progress, persist", async ({ page }) => {
  await page.goto("/");
  await resetDB(page);

  await openAddSheet(page);
  await page.getByTestId("add-summary").fill("Test job summary");
  await page.getByTestId("add-task-input").fill("Task A");
  await page.getByTestId("add-draft-task").click();
  await page.getByRole("button", { name: "Add job" }).click();

  await expect(page.locator("#list").getByText("Test job summary")).toBeVisible();

  const firstCard = await openFirstCard(page);
  await openEditSheet(firstCard);
  await page.getByTestId("edit-action-input").fill("Action 1");
  await page.getByTestId("edit-add-action").click();
  await page.getByTestId("edit-progress-input").fill("Did something");
  await page.getByTestId("edit-add-progress").click();
  await page.locator("#editSheet").getByRole("button", { name: "Done", exact: true }).click();

  const expanded1 = page.locator(".tm-card-expanded").first();
  await expect(expanded1.getByText("Action 1")).toBeVisible();

  await page.reload();
  await expect(page.locator("#list").getByText("Test job summary")).toBeVisible();
  await openFirstCard(page);
  const expandedReload = page.locator(".tm-card-expanded").first();
  await expect(expandedReload.getByText("Action 1")).toBeVisible();
});

test("add bleep shows from and persists", async ({ page }) => {
  await page.goto("/");
  await resetDB(page);

  await openAddSheet(page);
  await page.getByRole("button", { name: "Bleep" }).click();
  await page.getByTestId("add-bleep-from").fill("Bleep 1234");
  await page.getByTestId("add-bleep-summary").fill("Please review patient");
  await page.getByTestId("add-task-input").fill("Call back nurse");
  await page.getByTestId("add-draft-task").click();
  await page.getByRole("button", { name: "Add bleep" }).click();

  await expect(page.locator("#list").getByText("Bleep 1234")).toBeVisible();

  const firstCard = await openFirstCard(page);
  await openEditSheet(firstCard);
  await page.getByTestId("edit-action-input").fill("Called back");
  await page.getByTestId("edit-add-action").click();
  await page.locator("#editSheet").getByRole("button", { name: "Done", exact: true }).click();

  await page.reload();
  await openFirstCard(page);
  const expanded2 = page.locator(".tm-card-expanded").first();
  await expect(expanded2.getByText("Called back")).toBeVisible();
});

test("review-by does not close modal and persists", async ({ page }) => {
  await page.goto("/");
  await resetDB(page);

  // Add a job
  await openAddSheet(page);
  await page.getByTestId("add-summary").fill("ReviewBy job");
  await page.getByRole("button", { name: "Add job" }).click();

  // Open edit from list
  const firstCard = await openFirstCard(page);
  await openEditSheet(firstCard);

  const review = page.locator("#editSheet").locator('input[type="datetime-local"]');
  await review.click();
  await review.fill("2030-01-01T12:30"); // deterministic future value

  // Modal should still be open
  await expect(page.locator("#editSheet")).toBeVisible();

  // Close and reload, then reopen and ensure value persisted
  await page.locator("#editSheet").getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();

  const firstCardReload = await openFirstCard(page);
  await openEditSheet(firstCardReload);
  await expect(page.locator("#editSheet").locator('input[type="datetime-local"]')).toHaveValue("2030-01-01T12:30");
});

test("edit sheet typing does not blur and close saves changes", async ({ page }) => {
  await page.goto("/");
  await resetDB(page);

  await openAddSheet(page);
  await page.getByTestId("add-summary").fill("Editable job");
  await page.getByRole("button", { name: "Add job" }).click();

  const firstCard = await openFirstCard(page);
  await openEditSheet(firstCard);

  const summaryInput = page.locator('#editSheet input[data-field="summary"]').first();
  await summaryInput.click();
  await summaryInput.type(" Updated");
  await expect(summaryInput).toHaveValue("Editable job Updated");
  await expect(page.locator("#editSheet")).toBeVisible();

  await page.locator("#editSheet").getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator("#editSheet")).toHaveCount(0);

  // Summary should be updated on the card and persist on reopen.
  await expect(page.locator("#list").getByText("Editable job Updated")).toBeVisible();
  const cardReload = await openFirstCard(page);
  await openEditSheet(cardReload);
  await expect(page.locator('#editSheet input[data-field="summary"]').first()).toHaveValue("Editable job Updated");
});

test("add-sheet add-task button adds tasks without adding the item", async ({ page }) => {
  await page.goto("/");
  await resetDB(page);

  await openAddSheet(page);
  await page.getByTestId("add-summary").fill("Task button job");

  const taskBox = page.getByTestId("add-task-input");
  await taskBox.fill("Task 1");
  await page.getByTestId("add-draft-task").click();
  await taskBox.fill("Task 2");
  await page.getByTestId("add-draft-task").click();

  // item should not be created until we submit
  await expect(page.locator("#list").getByText("Task button job")).toHaveCount(0);

  await page.getByRole("button", { name: "Add job" }).click();
  await expect(page.locator("#list").getByText("Task button job")).toBeVisible();
  await openFirstCard(page);
  const expanded3 = page.locator(".tm-card-expanded").first();
  await expect(expanded3.getByText("Task 1")).toBeVisible();
  await expect(expanded3.getByText("Task 2")).toBeVisible();
});

test("add-sheet Enter adds a task and does not submit the job", async ({ page }) => {
  await page.goto("/");
  await resetDB(page);

  await openAddSheet(page);
  await page.getByTestId("add-summary").fill("Enter task job");

  const taskBox = page.getByTestId("add-task-input");
  await taskBox.fill("Enter Task A");
  await taskBox.press("Enter");

  await expect(page.getByText("Enter Task A")).toBeVisible();
  await expect(page.locator("#list").getByText("Enter task job")).toHaveCount(0);

  await page.getByRole("button", { name: "Add job" }).click();
  await expect(page.locator("#list").getByText("Enter task job")).toBeVisible();
});

test("toggle task done persists after refresh", async ({ page }) => {
  await page.goto("/");
  await resetDB(page);

  await openAddSheet(page);
  await page.getByTestId("add-summary").fill("Toggle task job");
  await page.getByTestId("add-task-input").fill("Task to toggle");
  await page.getByTestId("add-draft-task").click();
  await page.getByRole("button", { name: "Add job" }).click();

  const firstCard = await openFirstCard(page);
  await openEditSheet(firstCard);
  const row = page.locator('#editSheet input[value="Task to toggle"]').locator("..");
  await row.getByRole("checkbox").click();

  await page.locator("#editSheet").getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();

  const firstCardReload = await openFirstCard(page);
  await expect(page.locator("#list").getByText("Task to toggle")).toBeVisible();
  await openEditSheet(firstCardReload);
  const row2 = page.locator('#editSheet input[value="Task to toggle"]').locator("..");
  await expect(row2.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
  await page.locator("#editSheet").getByRole("button", { name: "Done", exact: true }).click();

  // Verify inline checkbox shows green fill when done
  await openFirstCard(page);
  const inlineRow = page.locator('.tm-card-expanded .tm-check-row[data-done="true"]').first();
  const beforeBg = await inlineRow.evaluate((el) => getComputedStyle(el, "::before").backgroundColor);
  expect(beforeBg).toBe("rgb(43, 182, 115)");
});

test("inline task toggle updates collapsed pills in real time", async ({ page }) => {
  await page.goto("/");
  await resetDB(page);

  await openAddSheet(page);
  await page.getByTestId("add-summary").fill("Pill update job");
  await page.getByTestId("add-task-input").fill("Pill Task A");
  await page.getByTestId("add-draft-task").click();
  await page.getByTestId("add-task-input").fill("Pill Task B");
  await page.getByTestId("add-draft-task").click();
  await page.getByRole("button", { name: "Add job" }).click();

  const card = await openFirstCard(page);
  const cardId = await card.getAttribute("data-card-id");
  if (!cardId) throw new Error("Card id missing");

  const firstRow = page.locator(".tm-card-expanded .tm-check-row").first();
  const taskText = (await firstRow.locator(".tm-check-text").textContent()) ?? "";

  const pillRow = page.locator(`[data-testid="card-header-${cardId}"] .tm-pill-row`);
  await expect(pillRow).toContainText(taskText.trim());

  await firstRow.click();

  await expect(pillRow).not.toContainText(taskText.trim());
});

test("remove action works and persists", async ({ page }) => {
  await page.goto("/");
  await resetDB(page);

  await openAddSheet(page);
  await page.getByTestId("add-summary").fill("Remove action job");
  await page.getByRole("button", { name: "Add job" }).click();

  const firstCard = await openFirstCard(page);
  await openEditSheet(firstCard);
  await page.getByTestId("edit-action-input").fill("Action to remove");
  // action Add button is the second Add in the edit sheet (Tasks add is first)
  await page.getByTestId("edit-add-action").click();
  await expect(page.locator('#editSheet input[value="Action to remove"]')).toBeVisible();

  const arow = page.locator('#editSheet input[value="Action to remove"]').locator("..");
  await arow.getByRole("button", { name: "Remove" }).click();
  await page.locator("#editSheet").getByRole("button", { name: "Done", exact: true }).click();

  await page.reload();
  await expect(page.locator("#list").getByText("Action to remove")).toHaveCount(0);
});

test("bleep called-back toggle persists", async ({ page }) => {
  await page.goto("/");
  await resetDB(page);

  await openAddSheet(page);
  await page.getByRole("button", { name: "Bleep" }).click();
  await page.getByTestId("add-bleep-from").fill("Bleep CB");
  await page.getByRole("button", { name: "Add bleep" }).click();

  const firstCard = await openFirstCard(page);
  await openEditSheet(firstCard);
  await page.locator("#editSheet").getByRole("checkbox", { name: "Called back" }).click();
  await page.locator("#editSheet").getByRole("button", { name: "Done", exact: true }).click();

  await page.reload();
  const firstCardReload = await openFirstCard(page);
  await openEditSheet(firstCardReload);
  await expect(page.locator("#editSheet").getByRole("checkbox", { name: "Called back" })).toHaveAttribute("aria-checked", "true");
});

test("does not bounce to top when toggling inside edit sheet", async ({ page }) => {
  await page.goto("/");
  await resetDB(page);

  // Add a job with many tasks so edit sheet scrolls
  await openAddSheet(page);
  await page.getByTestId("add-summary").fill("Scroll modal job");
  const taskBox = page.getByTestId("add-task-input");
  for (let i = 0; i < 12; i++) {
    await taskBox.fill("Task " + i);
    await page.getByTestId("add-draft-task").click();
  }
  await page.getByRole("button", { name: "Add job" }).click();

  const firstCard = await openFirstCard(page);
  await openEditSheet(firstCard);

  const body = page.locator("#editSheet .sheetBody");
  // Force scroll within the sheet body
  await body.evaluate((el) => { el.scrollTop = 600; });

  const before = await body.evaluate((el) => el.scrollTop);

  // Toggle a checkbox (should not re-render / reset scroll)
  await page.locator('#editSheet button[role="checkbox"][data-action="toggleCheck"]').nth(8).click();

  const after = await body.evaluate((el) => el.scrollTop);
  // Allow small layout shifts, but it should not jump near top
  expect(after).toBeGreaterThan(before - 50);
});

test("card expands inline and collapses from header tap", async ({ page }) => {
  await page.goto("/");
  await resetDB(page);

  await openAddSheet(page);
  await page.getByTestId("add-summary").fill("Expand job");
  await page.getByRole("button", { name: "Add job" }).click();

  const firstCard = await openFirstCard(page);

  await firstCard.locator(".tm-card-header").click();
  await expect(firstCard).not.toHaveClass(/is-expanded/);
});
