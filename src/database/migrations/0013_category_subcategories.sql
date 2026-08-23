-- Category subcategories (two levels). See docs/decisions/0007-category-subcategories.md.
--
-- `categories` gains a self-referencing `parent_category_id`: a NULL parent is a
-- category, a set parent is a subcategory. `transactions`,
-- `recurring_transactions` and `recurring_occurrences` gain a nullable
-- `subcategory_id`; `category_id` keeps its existing meaning and always holds the
-- parent, so every existing aggregate (budgets, reports, notifications, filters,
-- CSV) keeps working with no semantic change.
--
-- This migration is deliberately ADDITIVE. Unlike 0009/0012 no table is rebuilt:
-- SQLite's ALTER TABLE ADD COLUMN accepts a REFERENCES clause and a CHECK that
-- reads another column, and the table's pre-existing CHECK constraints stay
-- enforced. Avoiding create-copy-swap avoids the refund self-reference hazard
-- that 0012 had to work around.
--
-- Existing data is untouched: every added column is NULL for every existing row,
-- which is exactly "keeps its category, has no subcategory".

-- 1. Hierarchy on categories.
ALTER TABLE `categories` ADD COLUMN `parent_category_id` text REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict;--> statement-breakpoint

-- 2. Name uniqueness becomes parent-scoped.
-- coalesce() is required, not cosmetic: a unique index treats NULLs as distinct,
-- so indexing the raw parent column would silently allow two root categories with
-- the same name. With the coalesce, "Otros" may exist under two different parents
-- while root names stay unique.
DROP INDEX `categories_active_type_name_uidx`;--> statement-breakpoint
CREATE UNIQUE INDEX `categories_active_scope_name_uidx` ON `categories` (`type`,coalesce(`parent_category_id`, ''),lower(trim(`name`))) WHERE `is_archived` = 0;--> statement-breakpoint
CREATE INDEX `categories_parent_idx` ON `categories` (`parent_category_id`);--> statement-breakpoint

-- 3. Subcategory on the three transaction-shaped tables.
-- The CHECK also covers transfers and refunds: both already have
-- `category_id IS NULL` under their original shape CHECK, so neither can carry a
-- subcategory. Refunds keep inheriting classification from the original expense.
ALTER TABLE `transactions` ADD COLUMN `subcategory_id` text REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict CHECK(`subcategory_id` IS NULL OR `category_id` IS NOT NULL);--> statement-breakpoint
ALTER TABLE `recurring_transactions` ADD COLUMN `subcategory_id` text REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict CHECK(`subcategory_id` IS NULL OR `category_id` IS NOT NULL);--> statement-breakpoint
ALTER TABLE `recurring_occurrences` ADD COLUMN `subcategory_id` text REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict CHECK(`subcategory_id` IS NULL OR `category_id` IS NOT NULL);--> statement-breakpoint

CREATE INDEX `transactions_subcategory_idx` ON `transactions` (`subcategory_id`);--> statement-breakpoint
CREATE INDEX `recurring_transactions_subcategory_idx` ON `recurring_transactions` (`subcategory_id`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_subcategory_idx` ON `recurring_occurrences` (`subcategory_id`);--> statement-breakpoint

-- 4. Depth guard: a parent may not itself have a parent. SQLite CHECK cannot run a
-- subquery, so the two-level limit is a trigger.
CREATE TRIGGER `categories_depth_insert_guard`
BEFORE INSERT ON `categories`
WHEN NEW.`parent_category_id` IS NOT NULL
BEGIN
	SELECT CASE
		WHEN NEW.`parent_category_id` = NEW.`id`
			THEN RAISE(ABORT, 'A category cannot be its own parent.')
		WHEN (SELECT `parent_category_id` FROM `categories` WHERE `id` = NEW.`parent_category_id`) IS NOT NULL
			THEN RAISE(ABORT, 'Subcategories cannot be nested further than two levels.')
	END;
END;--> statement-breakpoint

CREATE TRIGGER `categories_depth_update_guard`
BEFORE UPDATE ON `categories`
WHEN NEW.`parent_category_id` IS NOT NULL
BEGIN
	SELECT CASE
		WHEN NEW.`parent_category_id` = NEW.`id`
			THEN RAISE(ABORT, 'A category cannot be its own parent.')
		WHEN (SELECT `parent_category_id` FROM `categories` WHERE `id` = NEW.`parent_category_id`) IS NOT NULL
			THEN RAISE(ABORT, 'Subcategories cannot be nested further than two levels.')
		-- A category that already has children cannot become a child itself.
		WHEN EXISTS (SELECT 1 FROM `categories` WHERE `parent_category_id` = NEW.`id`)
			THEN RAISE(ABORT, 'A category with subcategories cannot become a subcategory.')
		-- A subcategory always carries its parent's type.
		WHEN (SELECT `type` FROM `categories` WHERE `id` = NEW.`parent_category_id`) <> NEW.`type`
			THEN RAISE(ABORT, 'A subcategory must have the same type as its parent.')
	END;
END;--> statement-breakpoint

CREATE TRIGGER `categories_type_insert_guard`
BEFORE INSERT ON `categories`
WHEN NEW.`parent_category_id` IS NOT NULL
	AND (SELECT `type` FROM `categories` WHERE `id` = NEW.`parent_category_id`) <> NEW.`type`
BEGIN
	SELECT RAISE(ABORT, 'A subcategory must have the same type as its parent.');
END;--> statement-breakpoint

-- 5. Parent consistency: a transaction's subcategory must belong to its category.
-- This is what keeps the denormalized (category_id, subcategory_id) pair from
-- drifting into states like Transporte → Mercado.
CREATE TRIGGER `transactions_subcategory_insert_guard`
BEFORE INSERT ON `transactions`
WHEN NEW.`subcategory_id` IS NOT NULL
BEGIN
	SELECT RAISE(ABORT, 'The subcategory must belong to the transaction category.')
	WHERE (SELECT `parent_category_id` FROM `categories` WHERE `id` = NEW.`subcategory_id`) IS NOT NEW.`category_id`;
END;--> statement-breakpoint

CREATE TRIGGER `transactions_subcategory_update_guard`
BEFORE UPDATE ON `transactions`
WHEN NEW.`subcategory_id` IS NOT NULL
BEGIN
	SELECT RAISE(ABORT, 'The subcategory must belong to the transaction category.')
	WHERE (SELECT `parent_category_id` FROM `categories` WHERE `id` = NEW.`subcategory_id`) IS NOT NEW.`category_id`;
END;--> statement-breakpoint

CREATE TRIGGER `recurring_transactions_subcategory_insert_guard`
BEFORE INSERT ON `recurring_transactions`
WHEN NEW.`subcategory_id` IS NOT NULL
BEGIN
	SELECT RAISE(ABORT, 'The subcategory must belong to the recurring rule category.')
	WHERE (SELECT `parent_category_id` FROM `categories` WHERE `id` = NEW.`subcategory_id`) IS NOT NEW.`category_id`;
END;--> statement-breakpoint

CREATE TRIGGER `recurring_transactions_subcategory_update_guard`
BEFORE UPDATE ON `recurring_transactions`
WHEN NEW.`subcategory_id` IS NOT NULL
BEGIN
	SELECT RAISE(ABORT, 'The subcategory must belong to the recurring rule category.')
	WHERE (SELECT `parent_category_id` FROM `categories` WHERE `id` = NEW.`subcategory_id`) IS NOT NEW.`category_id`;
END;--> statement-breakpoint

CREATE TRIGGER `recurring_occurrences_subcategory_insert_guard`
BEFORE INSERT ON `recurring_occurrences`
WHEN NEW.`subcategory_id` IS NOT NULL
BEGIN
	SELECT RAISE(ABORT, 'The subcategory must belong to the occurrence category.')
	WHERE (SELECT `parent_category_id` FROM `categories` WHERE `id` = NEW.`subcategory_id`) IS NOT NEW.`category_id`;
END;--> statement-breakpoint

CREATE TRIGGER `recurring_occurrences_subcategory_update_guard`
BEFORE UPDATE ON `recurring_occurrences`
WHEN NEW.`subcategory_id` IS NOT NULL
BEGIN
	SELECT RAISE(ABORT, 'The subcategory must belong to the occurrence category.')
	WHERE (SELECT `parent_category_id` FROM `categories` WHERE `id` = NEW.`subcategory_id`) IS NOT NEW.`category_id`;
END;
