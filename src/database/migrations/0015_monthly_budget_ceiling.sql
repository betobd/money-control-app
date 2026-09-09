-- Overall monthly spending ceiling.
-- One row per month the user set a ceiling in. A month with no row inherits the
-- most recent earlier row, so the ceiling carries forward without materializing
-- a row per browsed month; is_active = 0 is the tombstone that stops that
-- inheritance from a month onward. Additive: no existing table is touched.
CREATE TABLE `monthly_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`month` text NOT NULL,
	`limit_amount` integer NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `monthly_budgets_limit_amount_positive` CHECK(typeof(`limit_amount`) = 'integer' AND `limit_amount` > 0 AND `limit_amount` <= 9007199254740991),
	CONSTRAINT `monthly_budgets_month_format` CHECK(`month` GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' AND substr(`month`, 6, 2) BETWEEN '01' AND '12'),
	CONSTRAINT `monthly_budgets_is_active_valid` CHECK(`is_active` IN (0, 1)),
	CONSTRAINT `monthly_budgets_created_at_utc` CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `monthly_budgets_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z')
);--> statement-breakpoint
CREATE UNIQUE INDEX `monthly_budgets_month_uidx` ON `monthly_budgets` (`month`);
