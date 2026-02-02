-- DropIndex
DROP INDEX "checklist_items_itemId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_itemId_position_key" ON "checklist_items"("itemId", "position");
