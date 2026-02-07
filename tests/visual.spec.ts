import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test.describe("visual snapshots", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("list view collapsed and expanded", async ({ page }) => {
    fs.mkdirSync(path.join(process.cwd(), "test-results/ui"), { recursive: true });
    await page.addInitScript(() => {
      const fixed = new Date("2030-01-01T12:00:00Z").valueOf();
      Date.now = () => fixed;
    });

    await page.goto("/");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addStyleTag({ content: "* { caret-color: transparent !important; }" });

    await page.evaluate(() => {
      indexedDB.deleteDatabase("keyval-store");
    });
    await page.reload();
    await page.getByTestId("open-add").click();
    await page.getByTestId("add-summary").fill("AMU · Bed 12");
    await page.getByTestId("add-task-input").fill("Bloods");
    await page.getByTestId("add-draft-task").click();
    await page.getByTestId("add-task-input").fill("Fluids");
    await page.getByTestId("add-draft-task").click();
    await page.getByRole("button", { name: "Add job" }).click();

    const listView = page.getByTestId("list-view");
    await listView.waitFor({ state: "visible" });
    await page.screenshot({ path: "test-results/ui/home-collapsed.png", fullPage: true });

    const firstCard = page.locator('[data-testid^="item-card-"]').first();
    await firstCard.click();
    await firstCard.waitFor({ state: "visible" });
    await firstCard.evaluate((el) => {
      if (!el.classList.contains("is-expanded")) throw new Error("Card did not expand");
    });
    await page.screenshot({ path: "test-results/ui/home-expanded.png", fullPage: true });
  });
});
