-- Per-budget color.
-- Adds an optional `color` key to budgets so each monthly budget can carry its
-- own swatch (resolved to light/dark hex at render time via budgetSwatches).
-- Existing budgets keep NULL (rendered with the default accent). SQLite ADD
-- COLUMN accepts a CHECK constraint, so no table rebuild is required.
ALTER TABLE `budgets` ADD COLUMN `color` text CONSTRAINT `budgets_color_valid` CHECK(`color` IS NULL OR `color` IN ('blue', 'teal', 'green', 'amber', 'coral', 'pink', 'purple', 'indigo'));
