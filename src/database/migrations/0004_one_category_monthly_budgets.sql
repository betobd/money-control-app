ALTER TABLE `budgets` RENAME TO `budgets_legacy`;--> statement-breakpoint
DROP INDEX `budgets_category_month_uidx`;--> statement-breakpoint
DROP INDEX `budgets_month_idx`;--> statement-breakpoint
CREATE TABLE `__budget_migration_guard` (
	`valid` integer NOT NULL,
	CONSTRAINT `budget_migration_expense_categories_only` CHECK (`valid` = 1)
);--> statement-breakpoint
INSERT INTO `__budget_migration_guard` (`valid`)
SELECT CASE WHEN EXISTS (
	SELECT 1
	FROM `budgets_legacy` AS `legacy`
	INNER JOIN `categories` AS `category` ON `category`.`id` = `legacy`.`category_id`
	WHERE `category`.`type` <> 'expense'
) THEN 0 ELSE 1 END;--> statement-breakpoint
DROP TABLE `__budget_migration_guard`;--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`month` text NOT NULL,
	`limit_amount` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `budgets_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `budgets_limit_amount_positive` CHECK(typeof(`limit_amount`) = 'integer' AND `limit_amount` > 0 AND `limit_amount` <= 9007199254740991),
	CONSTRAINT `budgets_month_format` CHECK(`month` GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' AND substr(`month`, 6, 2) BETWEEN '01' AND '12'),
	CONSTRAINT `budgets_created_at_utc` CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `budgets_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z')
);--> statement-breakpoint
CREATE UNIQUE INDEX `budgets_category_month_uidx` ON `budgets` (`category_id`,`month`);--> statement-breakpoint
CREATE INDEX `budgets_month_idx` ON `budgets` (`month`);--> statement-breakpoint
INSERT INTO `budgets` (`id`, `category_id`, `month`, `limit_amount`, `created_at`, `updated_at`)
SELECT `id`, `category_id`, `month`, `amount`, `created_at`, `updated_at`
FROM `budgets_legacy`;--> statement-breakpoint
DROP TABLE `budgets_legacy`;
