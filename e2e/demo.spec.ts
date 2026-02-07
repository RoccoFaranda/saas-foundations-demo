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

    // Confirm completion with incomplete checklist
    const markAllBtn = page.getByTestId("edit-confirm-mark-all-btn");
    await expect(markAllBtn).toBeVisible();
    await markAllBtn.click();

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
    await page.getByTestId("edit-status-select").selectOption("completed");

    // Cancel instead of save
    await page.getByTestId("edit-cancel-btn").click();

    // Verify modal closes
    await expect(modal).not.toBeVisible();

    // Verify row still shows original "active" status (no change)
    await expect(targetRow).toContainText("active");
    await expect(targetRow).not.toContainText("completed");
  });

  test("create new project appears in table and activity feed", async ({ page }) => {
    await page.goto("/demo");

    // Wait for table to load
    await expect(page.getByTestId("edit-btn-proj-002")).toBeVisible({ timeout: 5000 });

    // Click Create Project button
    const createBtn = page.getByRole("button", { name: "Create Project" });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Verify edit modal opens for creation
    const modal = page.getByTestId("edit-modal");
    await expect(modal).toBeVisible();

    // Fill in project details
    const nameInput = page.getByTestId("edit-name-input");
    await nameInput.fill("E2E Test Project");

    const summaryInput = page.getByTestId("edit-summary-input");
    await summaryInput.fill("A test project created by E2E");

    // Select status
    await page.getByTestId("edit-status-select").selectOption("pending");

    // Create the project
    await page.getByTestId("edit-save-btn").click();

    // Verify modal closes
    await expect(modal).not.toBeVisible();

    // Verify activity shows creation
    const activityList = page.getByTestId("activity-list");
    await expect(activityList).toContainText("E2E Test Project");

    // Reset filters to see the new project
    await page.reload();

    // Wait for table to load
    await expect(page.getByTestId("edit-btn-proj-002")).toBeVisible({ timeout: 5000 });

    // The page refresh should reset demo data - new project should be gone
    const table = page.getByTestId("items-table");
    await expect(table).not.toContainText("E2E Test Project");
  });

  test("delete project removes from table and import restores demo data", async ({ page }) => {
    await page.goto("/demo");

    // Wait for table to load (demo has 10 items, showing 5 per page)
    await expect(page.getByTestId("edit-btn-proj-002")).toBeVisible({ timeout: 5000 });

    // Verify initial row count on first page (5 items + 1 header)
    const itemsTable = page.getByTestId("items-table");
    await expect(itemsTable.locator("tr")).toHaveCount(6); // 1 header + 5 items

    // Show archived rows so archived item remains visible for delete
    await page.getByLabel("Show archived").check();

    // Archive first (delete is only available for archived items)
    const archiveBtn = page.getByTestId("archive-btn-proj-002");
    await expect(archiveBtn).toBeVisible();
    await archiveBtn.click();

    const deleteBtn = page.getByTestId("delete-btn-proj-002");
    await expect(deleteBtn).toBeVisible();

    // Click delete button
    await deleteBtn.click();

    // Verify delete modal appears
    const deleteModal = page.getByTestId("delete-modal");
    await expect(deleteModal).toBeVisible({ timeout: 5000 });
    await expect(deleteModal).toContainText("Dashboard Analytics");

    // Confirm deletion
    const confirmBtn = page.getByTestId("delete-confirm-btn");
    await confirmBtn.click();

    // Verify modal closes
    await expect(deleteModal).not.toBeVisible({ timeout: 5000 });

    // Verify item was removed - the proj-002 row should be gone
    await expect(page.getByTestId("table-row-proj-002")).not.toBeVisible({ timeout: 5000 });

    // Verify activity shows deletion
    const activityList = page.getByTestId("activity-list");
    await expect(activityList).toContainText("Deleted");
    await expect(activityList).toContainText("Dashboard Analytics");

    // Refresh the page - should reset to original demo data
    await page.reload();

    // Wait for table to load
    await expect(page.getByTestId("edit-btn-proj-002")).toBeVisible({ timeout: 5000 });

    // Verify the deleted item is back on the first page
    await expect(itemsTable).toContainText("Dashboard Analytics");
  });

  test("import sample data restores demo items after deleting all", async ({ page }) => {
    await page.goto("/demo");

    // Wait for table to load (10 items, 5 per page = 2 pages)
    await expect(page.getByTestId("edit-btn-proj-002")).toBeVisible({ timeout: 5000 });

    // Show archived rows and delete everything:
    // non-archived rows are archived first, archived rows are then deleted
    await page.getByLabel("Show archived").check();

    for (let i = 0; i < 30; i++) {
      const archiveBtn = page.locator('[data-testid^="archive-btn-"]').first();
      if (await archiveBtn.isVisible().catch(() => false)) {
        await archiveBtn.click();
        continue;
      }

      const deleteBtn = page.locator('[data-testid^="delete-btn-"]').first();
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();

        const deleteModal = page.getByTestId("delete-modal");
        await expect(deleteModal).toBeVisible({ timeout: 5000 });
        await page.getByTestId("delete-confirm-btn").click();
        await expect(deleteModal).not.toBeVisible({ timeout: 5000 });
        continue;
      }

      // No archive/delete actions left on page, exit loop
      break;
    }

    // After deleting all items, empty state should show with Import Sample Data button
    const importBtn = page.getByRole("button", { name: "Import Sample Data" });
    await expect(importBtn).toBeVisible({ timeout: 10000 });

    // Click import sample data
    await importBtn.click();

    // Wait for table to reload with data
    await expect(page.getByTestId("items-table")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("edit-btn-proj-002")).toBeVisible({ timeout: 5000 });

    // Verify activity shows import
    const activityList = page.getByTestId("activity-list");
    await expect(activityList).toContainText("Imported sample data");
  });

  test("delete cancel button closes modal without deleting", async ({ page }) => {
    await page.goto("/demo");

    // Wait for table to load
    await expect(page.getByTestId("edit-btn-proj-002")).toBeVisible({ timeout: 5000 });

    // Verify initial row count on first page
    const itemsTable = page.getByTestId("items-table");
    await expect(itemsTable.locator("tr")).toHaveCount(6); // 1 header + 5 items

    // Show archived rows and archive the item first (delete requires archived)
    await page.getByLabel("Show archived").check();
    await page.getByTestId("archive-btn-proj-002").click();

    // Open delete modal for Dashboard Analytics
    const deleteBtn = page.getByTestId("delete-btn-proj-002");
    await deleteBtn.click();

    // Verify delete modal appears
    const deleteModal = page.getByTestId("delete-modal");
    await expect(deleteModal).toBeVisible();
    await expect(deleteModal).toContainText("Dashboard Analytics");

    // Cancel deletion
    await page.getByTestId("delete-cancel-btn").click();

    // Verify modal closes
    await expect(deleteModal).not.toBeVisible();

    // Verify item was NOT removed
    await expect(itemsTable.locator("tr")).toHaveCount(6);
    await expect(itemsTable).toContainText("Dashboard Analytics");
  });

  test("archive toast allows viewing archived items", async ({ page }) => {
    await page.goto("/demo");

    await expect(page.getByTestId("edit-btn-proj-002")).toBeVisible({ timeout: 5000 });

    const showArchivedCheckbox = page.getByLabel("Show archived");
    await expect(showArchivedCheckbox).not.toBeChecked();

    const archiveBtn = page.getByTestId("archive-btn-proj-002");
    await expect(archiveBtn).toBeVisible();
    await archiveBtn.click();

    const toast = page.getByText("Project archived");
    await expect(toast).toBeVisible({ timeout: 5000 });

    const viewArchivedBtn = page.getByRole("button", { name: "View archived" });
    await viewArchivedBtn.click();

    await expect(showArchivedCheckbox).toBeChecked();
    await expect(page.getByTestId("table-row-proj-002")).toBeVisible({ timeout: 5000 });
  });
});
