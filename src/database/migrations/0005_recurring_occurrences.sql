ALTER TABLE `recurring_transactions` RENAME TO `recurring_transactions_legacy`;--> statement-breakpoint
DROP INDEX `recurring_next_date_idx`;--> statement-breakpoint
CREATE TABLE `recurring_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'COP' NOT NULL,
	`account_id` text NOT NULL,
	`destination_account_id` text,
	`category_id` text,
	`note` text,
	`frequency` text NOT NULL,
	`interval` integer DEFAULT 1 NOT NULL,
	`start_date` text NOT NULL,
	`next_occurrence_date` text NOT NULL,
	`end_date` text,
	`is_active` integer DEFAULT true NOT NULL,
	`ended_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `recurring_transactions_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `recurring_transactions_destination_account_id_accounts_id_fk` FOREIGN KEY (`destination_account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `recurring_transactions_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `recurring_type_valid` CHECK(`type` IN ('income', 'expense', 'transfer')),
	CONSTRAINT `recurring_frequency_valid` CHECK(`frequency` IN ('daily', 'weekly', 'monthly', 'yearly')),
	CONSTRAINT `recurring_amount_positive` CHECK(typeof(`amount`) = 'integer' AND `amount` > 0 AND `amount` <= 9007199254740991),
	CONSTRAINT `recurring_currency_cop` CHECK(`currency` = 'COP'),
	CONSTRAINT `recurring_interval_positive` CHECK(`interval` > 0),
	CONSTRAINT `recurring_start_date_valid` CHECK(`start_date` GLOB '????-??-??' AND date(`start_date`) = `start_date`),
	CONSTRAINT `recurring_next_date_valid` CHECK(`next_occurrence_date` GLOB '????-??-??' AND date(`next_occurrence_date`) = `next_occurrence_date`),
	CONSTRAINT `recurring_end_date_valid` CHECK(`end_date` IS NULL OR (`end_date` GLOB '????-??-??' AND date(`end_date`) = `end_date` AND `end_date` >= `start_date`)),
	CONSTRAINT `recurring_created_at_utc` CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `recurring_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `recurring_ended_at_utc` CHECK(`ended_at` IS NULL OR `ended_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `recurring_shape_valid` CHECK((
		(`type` IN ('income', 'expense') AND `destination_account_id` IS NULL AND `category_id` IS NOT NULL)
		OR
		(`type` = 'transfer' AND `destination_account_id` IS NOT NULL AND `account_id` <> `destination_account_id` AND `category_id` IS NULL)
	))
);--> statement-breakpoint
CREATE INDEX `recurring_next_date_idx` ON `recurring_transactions` (`is_active`,`next_occurrence_date`);--> statement-breakpoint
INSERT INTO `recurring_transactions` (
	`id`, `type`, `amount`, `currency`, `account_id`, `destination_account_id`,
	`category_id`, `note`, `frequency`, `interval`, `start_date`,
	`next_occurrence_date`, `end_date`, `is_active`, `ended_at`, `created_at`, `updated_at`
)
SELECT
	`id`, `type`, `amount`, `currency`, `account_id`, `destination_account_id`,
	`category_id`, `note`, `frequency`, `interval`, `next_transaction_date`,
	`next_transaction_date`, NULL, `is_active`, NULL, `created_at`, `updated_at`
FROM `recurring_transactions_legacy`;--> statement-breakpoint
DROP TABLE `recurring_transactions_legacy`;--> statement-breakpoint
CREATE TABLE `recurring_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`recurring_transaction_id` text NOT NULL,
	`scheduled_date` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'COP' NOT NULL,
	`account_id` text NOT NULL,
	`destination_account_id` text,
	`category_id` text,
	`note` text,
	`transaction_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `recurring_occurrences_recurring_transaction_id_recurring_transactions_id_fk` FOREIGN KEY (`recurring_transaction_id`) REFERENCES `recurring_transactions`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `recurring_occurrences_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `recurring_occurrences_destination_account_id_accounts_id_fk` FOREIGN KEY (`destination_account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `recurring_occurrences_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `recurring_occurrences_transaction_id_transactions_id_fk` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `recurring_occurrence_status_valid` CHECK(`status` IN ('pending', 'posted', 'skipped')),
	CONSTRAINT `recurring_occurrence_type_valid` CHECK(`type` IN ('income', 'expense', 'transfer')),
	CONSTRAINT `recurring_occurrence_amount_positive` CHECK(typeof(`amount`) = 'integer' AND `amount` > 0 AND `amount` <= 9007199254740991),
	CONSTRAINT `recurring_occurrence_currency_cop` CHECK(`currency` = 'COP'),
	CONSTRAINT `recurring_occurrence_date_valid` CHECK(`scheduled_date` GLOB '????-??-??' AND date(`scheduled_date`) = `scheduled_date`),
	CONSTRAINT `recurring_occurrence_created_at_utc` CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `recurring_occurrence_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `recurring_occurrence_shape_valid` CHECK((
		(`type` IN ('income', 'expense') AND `destination_account_id` IS NULL AND `category_id` IS NOT NULL)
		OR
		(`type` = 'transfer' AND `destination_account_id` IS NOT NULL AND `account_id` <> `destination_account_id` AND `category_id` IS NULL)
	)),
	CONSTRAINT `recurring_occurrence_transaction_link_valid` CHECK((
		(`status` = 'posted' AND `transaction_id` IS NOT NULL)
		OR
		(`status` IN ('pending', 'skipped') AND `transaction_id` IS NULL)
	))
);--> statement-breakpoint
CREATE UNIQUE INDEX `recurring_occurrences_rule_date_uidx` ON `recurring_occurrences` (`recurring_transaction_id`,`scheduled_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `recurring_occurrences_transaction_uidx` ON `recurring_occurrences` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_status_date_idx` ON `recurring_occurrences` (`status`,`scheduled_date`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_rule_status_idx` ON `recurring_occurrences` (`recurring_transaction_id`,`status`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_account_idx` ON `recurring_occurrences` (`account_id`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_destination_account_idx` ON `recurring_occurrences` (`destination_account_id`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_category_idx` ON `recurring_occurrences` (`category_id`);
