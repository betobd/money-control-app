-- Recurring monthly budgets.
-- A budget_rules row is a template (category + limit + color) that applies from
-- start_month onward while active. Each viewed month materializes a concrete
-- budgets row (linked via rule_id) lazily, so no future rows are pre-created.
-- At most one active rule per category (partial unique index).
CREATE TABLE `budget_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`limit_amount` integer NOT NULL,
	`color` text,
	`start_month` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `budget_rules_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `budget_rules_limit_amount_positive` CHECK(typeof(`limit_amount`) = 'integer' AND `limit_amount` > 0 AND `limit_amount` <= 9007199254740991),
	CONSTRAINT `budget_rules_color_valid` CHECK(`color` IS NULL OR `color` IN ('blue', 'teal', 'green', 'amber', 'coral', 'pink', 'purple', 'indigo')),
	CONSTRAINT `budget_rules_start_month_format` CHECK(`start_month` GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' AND substr(`start_month`, 6, 2) BETWEEN '01' AND '12'),
	CONSTRAINT `budget_rules_is_active_valid` CHECK(`is_active` IN (0, 1)),
	CONSTRAINT `budget_rules_created_at_utc` CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `budget_rules_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z')
);--> statement-breakpoint
CREATE UNIQUE INDEX `budget_rules_active_category_uidx` ON `budget_rules` (`category_id`) WHERE `is_active` = 1;--> statement-breakpoint
CREATE INDEX `budget_rules_active_start_idx` ON `budget_rules` (`is_active`,`start_month`);--> statement-breakpoint
ALTER TABLE `budgets` ADD COLUMN `rule_id` text REFERENCES `budget_rules`(`id`) ON UPDATE restrict ON DELETE set null;
