import { test, expect } from "@playwright/test";

test.describe("Demo page - Guest mode reset flow", () => {
  test("editing a demo item updates UI, and page refresh resets to seeded data", async ({
    page,
  }) => {
    // Navigate to demo page
    await page.goto("/demo");

    // Wait for table to load (Edit buttons appear after loading state)
    const firstEditBtn = page.getByTestId("edit-btn-proj-002");
    await expect(firstEditBtn).toBeVisible({ timeout: 5000 });

    // Verify initial state: "Dashboard Analytics" row has status "active"
    const targetRow = page.getByTestId("table-row-proj-002");
    await expect(targetRow).toContainText("active");

    // Open edit modal for "Dashboard Analytics"
    await firstEditBtn.click();

    // Verify modal is open
    const modal = page.getByTestId("edit-modal");
    await expect(modal).toBeVisible();

    // Change status from "active" to "completed"
    const statusSelect = page.getByTestId("edit-status-select");
    await expect(statusSelect).toHaveValue("active");
    await statusSelect.selectOption("completed");

    // Save changes
    await page.getByTestId("edit-save-btn").click();

    // Verify modal closes
    await expect(modal).not.toBeVisible();

    // Verify table row now shows "completed" status
    await expect(targetRow).toContainText("completed");
    await expect(targetRow).not.toContainText("active");

    // Verify activity feed shows the edit
    const activityList = page.getByTestId("activity-list");
    await expect(activityList).toBeVisible();
    await expect(activityList).toContainText("Dashboard Analytics");
    await expect(activityList).toContainText("status");

    // Reload the page to test guest mode reset
    await page.reload();

    // Wait for table to load again
    await expect(firstEditBtn).toBeVisible({ timeout: 5000 });

    // Verify the row has reset to original "active" status
    await expect(targetRow).toContainText("active");
    await expect(targetRow).not.toContainText("completed");

    // Verify activity feed is empty again (reset)
    await expect(activityList).not.toBeVisible();
    await expect(page.getByTestId("activity-feed")).toContainText(
      "Activity updates will appear here."
    );
  });

  test("cancel button closes modal without saving changes", async ({ page }) => {
    await page.goto("/demo");

    // Wait for table to load
    const editBtn = page.getByTestId("edit-btn-proj-002");
    await expect(editBtn).toBeVisible({ timeout: 5000 });

    // Verify initial state
    const targetRow = page.getByTestId("table-row-proj-002");
    await expect(targetRow).toContainText("active");

    // Open edit modal
    await editBtn.click();
    const modal = page.getByTestId("edit-modal");
    await expect(modal).toBeVisible();

    // Change status
    await page.getByTestId("edit-status-select").selectOption("archived");

    // Cancel instead of save
    await page.getByTestId("edit-cancel-btn").click();

    // Verify modal closes
    await expect(modal).not.toBeVisible();

    // Verify row still shows original "active" status (no change)
    await expect(targetRow).toContainText("active");
    await expect(targetRow).not.toContainText("archived");
  });
});
