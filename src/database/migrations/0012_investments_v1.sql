-- Investments v1 (balance tracking).
-- Relaxes the `accounts_type_valid` CHECK to allow a new 'investment' account type
-- and adds the `investment_accounts` (1:1 metadata) and `investment_valuations`
-- (manual market-value history) tables.
--
-- SQLite cannot drop/alter a CHECK constraint, so `accounts` is rebuilt with the
-- create-copy-swap pattern (as in migration 0009). Every table that holds a foreign
-- key to `accounts` must be dropped before `accounts` (with foreign keys ON a DROP
-- performs an implicit row DELETE that would trip those references) and recreated
-- unchanged afterwards: `transactions`, `transaction_splits`,
-- `credit_card_statements`, `recurring_transactions`, `recurring_occurrences`.
-- Those five tables are byte-for-byte identical to their post-0009 definitions
-- (migrations 0010/0011 did not touch them); only the accounts type CHECK changes.
-- Existing data is preserved exactly: every row is copied back straight, no values
-- are transformed, and no investment rows are invented. See
-- docs/decisions/0006-investments-v1.md.

-- 1. Back up every table that must be dropped to release foreign keys.
CREATE TABLE `__mc12_accounts_backup` AS SELECT * FROM `accounts`;--> statement-breakpoint
CREATE TABLE `__mc12_transactions_backup` AS SELECT * FROM `transactions`;--> statement-breakpoint
CREATE TABLE `__mc12_transaction_splits_backup` AS SELECT * FROM `transaction_splits`;--> statement-breakpoint
CREATE TABLE `__mc12_credit_card_statements_backup` AS SELECT * FROM `credit_card_statements`;--> statement-breakpoint
CREATE TABLE `__mc12_recurring_transactions_backup` AS SELECT * FROM `recurring_transactions`;--> statement-breakpoint
CREATE TABLE `__mc12_recurring_occurrences_backup` AS SELECT * FROM `recurring_occurrences`;--> statement-breakpoint

-- 2. Drop dependents before parents (triggers drop with their table).
DROP TABLE `credit_card_statements`;--> statement-breakpoint
DROP TABLE `recurring_occurrences`;--> statement-breakpoint
DROP TABLE `transaction_splits`;--> statement-breakpoint
DROP TABLE `recurring_transactions`;--> statement-breakpoint
-- Refund rows self-reference their original expense with ON DELETE RESTRICT, so the
-- implicit row deletion during DROP TABLE would trip that constraint. The data is
-- already captured in __mc12_transactions_backup, so remove refunds first.
DELETE FROM `transactions` WHERE `type` = 'refund';--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
DROP TABLE `accounts`;--> statement-breakpoint

-- 3. Accounts (type now allows 'investment').
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`currency` text DEFAULT 'COP' NOT NULL,
	`opening_balance` integer DEFAULT 0 NOT NULL,
	`credit_limit` integer,
	`statement_closing_day` integer,
	`payment_due_day` integer,
	`is_archived` integer DEFAULT false NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `accounts_name_not_empty` CHECK(length(trim(`name`)) > 0),
	CONSTRAINT `accounts_currency_supported` CHECK(`currency` IN ('COP', 'USD')),
	CONSTRAINT `accounts_type_valid` CHECK(`type` IN ('checking', 'savings', 'credit_card', 'cash', 'investment', 'other')),
	CONSTRAINT `accounts_created_at_utc` CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `accounts_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `accounts_archived_at_utc` CHECK(`archived_at` IS NULL OR `archived_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `accounts_opening_balance_safe` CHECK(typeof(`opening_balance`) = 'integer' AND `opening_balance` BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT `accounts_credit_limit_valid` CHECK(`credit_limit` IS NULL OR (typeof(`credit_limit`) = 'integer' AND `type` = 'credit_card' AND `credit_limit` >= 0 AND `credit_limit` <= 9007199254740991)),
	CONSTRAINT `accounts_statement_closing_day_valid` CHECK(`statement_closing_day` IS NULL OR (typeof(`statement_closing_day`) = 'integer' AND `type` = 'credit_card' AND `statement_closing_day` BETWEEN 1 AND 31)),
	CONSTRAINT `accounts_payment_due_day_valid` CHECK(`payment_due_day` IS NULL OR (typeof(`payment_due_day`) = 'integer' AND `type` = 'credit_card' AND `payment_due_day` BETWEEN 1 AND 31))
);--> statement-breakpoint
INSERT INTO `accounts` (`id`, `name`, `type`, `currency`, `opening_balance`, `credit_limit`, `statement_closing_day`, `payment_due_day`, `is_archived`, `archived_at`, `created_at`, `updated_at`)
SELECT `id`, `name`, `type`, `currency`, `opening_balance`, `credit_limit`, `statement_closing_day`, `payment_due_day`, `is_archived`, `archived_at`, `created_at`, `updated_at`
FROM `__mc12_accounts_backup`;--> statement-breakpoint
DROP TABLE `__mc12_accounts_backup`;--> statement-breakpoint
CREATE INDEX `accounts_archived_idx` ON `accounts` (`is_archived`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_active_name_uidx` ON `accounts` (lower(trim(`name`))) WHERE `is_archived` = 0;--> statement-breakpoint

-- 4. Transactions (unchanged; recreated to restore its account/self FKs + triggers).
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'posted' NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'COP' NOT NULL,
	`account_id` text,
	`destination_account_id` text,
	`category_id` text,
	`original_transaction_id` text,
	`base_amount_minor` integer,
	`exchange_rate_scaled` integer,
	`exchange_rate_scale` integer,
	`exchange_rate_date` text,
	`exchange_rate_source` text,
	`destination_amount_minor` integer,
	`destination_currency_code` text,
	`note` text,
	`transaction_date` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`destination_account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`original_transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `transactions_type_valid` CHECK(`type` IN ('income', 'expense', 'transfer', 'refund')),
	CONSTRAINT `transactions_status_valid` CHECK(`status` IN ('posted', 'voided')),
	CONSTRAINT `transactions_amount_positive` CHECK(typeof(`amount`) = 'integer' AND `amount` > 0 AND `amount` <= 9007199254740991),
	CONSTRAINT `transactions_currency_supported` CHECK(`currency` IN ('COP', 'USD')),
	CONSTRAINT `transactions_date_valid` CHECK(`transaction_date` GLOB '????-??-??' AND date(`transaction_date`) = `transaction_date`),
	CONSTRAINT `transactions_created_at_utc` CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `transactions_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `transactions_shape_valid` CHECK((
		(`type` IN ('income', 'expense') AND `account_id` IS NOT NULL AND `destination_account_id` IS NULL AND `category_id` IS NOT NULL AND `original_transaction_id` IS NULL)
		OR
		(`type` = 'transfer' AND `account_id` IS NOT NULL AND `destination_account_id` IS NOT NULL AND `account_id` <> `destination_account_id` AND `category_id` IS NULL AND `original_transaction_id` IS NULL)
		OR
		(`type` = 'refund' AND `account_id` IS NOT NULL AND `destination_account_id` IS NULL AND `category_id` IS NULL AND `original_transaction_id` IS NOT NULL AND `original_transaction_id` <> `id`)
	)),
	CONSTRAINT `transactions_base_amount_valid` CHECK((
		(`type` = 'transfer' AND `base_amount_minor` IS NULL)
		OR
		(`type` <> 'transfer' AND (`base_amount_minor` IS NULL OR (typeof(`base_amount_minor`) = 'integer' AND `base_amount_minor` > 0 AND `base_amount_minor` <= 9007199254740991)))
	)),
	CONSTRAINT `transactions_destination_leg_valid` CHECK((
		(`type` = 'transfer' AND (`destination_amount_minor` IS NULL OR (typeof(`destination_amount_minor`) = 'integer' AND `destination_amount_minor` > 0 AND `destination_amount_minor` <= 9007199254740991)) AND (`destination_currency_code` IS NULL OR `destination_currency_code` IN ('COP', 'USD')))
		OR
		(`type` <> 'transfer' AND `destination_amount_minor` IS NULL AND `destination_currency_code` IS NULL)
	)),
	CONSTRAINT `transactions_foreign_snapshot_present` CHECK((
		`type` = 'transfer'
		OR `currency` = 'COP'
		OR (`base_amount_minor` IS NOT NULL AND typeof(`exchange_rate_scaled`) = 'integer' AND `exchange_rate_scaled` > 0 AND typeof(`exchange_rate_scale`) = 'integer' AND `exchange_rate_scale` > 0 AND `exchange_rate_date` IS NOT NULL)
	)),
	CONSTRAINT `transactions_transfer_rate_present` CHECK((
		`type` <> 'transfer'
		OR coalesce(`destination_currency_code`, `currency`) = `currency`
		OR (typeof(`exchange_rate_scaled`) = 'integer' AND `exchange_rate_scaled` > 0 AND typeof(`exchange_rate_scale`) = 'integer' AND `exchange_rate_scale` > 0 AND `exchange_rate_date` IS NOT NULL)
	)),
	CONSTRAINT `transactions_rate_columns_valid` CHECK((
		(`exchange_rate_scaled` IS NULL OR (typeof(`exchange_rate_scaled`) = 'integer' AND `exchange_rate_scaled` > 0 AND `exchange_rate_scaled` <= 9007199254740991))
		AND (`exchange_rate_scale` IS NULL OR (typeof(`exchange_rate_scale`) = 'integer' AND `exchange_rate_scale` > 0 AND `exchange_rate_scale` <= 9007199254740991))
		AND (`exchange_rate_date` IS NULL OR (`exchange_rate_date` GLOB '????-??-??' AND date(`exchange_rate_date`) = `exchange_rate_date`))
		AND (`exchange_rate_source` IS NULL OR `exchange_rate_source` IN ('frankfurter', 'manual', 'transfer_effective', 'frankfurter_prefill'))
	))
);--> statement-breakpoint
INSERT INTO `transactions` (
	`id`, `type`, `status`, `amount`, `currency`, `account_id`, `destination_account_id`,
	`category_id`, `original_transaction_id`, `base_amount_minor`, `exchange_rate_scaled`,
	`exchange_rate_scale`, `exchange_rate_date`, `exchange_rate_source`,
	`destination_amount_minor`, `destination_currency_code`, `note`, `transaction_date`,
	`created_at`, `updated_at`
)
SELECT
	`id`, `type`, `status`, `amount`, `currency`, `account_id`, `destination_account_id`,
	`category_id`, `original_transaction_id`, `base_amount_minor`, `exchange_rate_scaled`,
	`exchange_rate_scale`, `exchange_rate_date`, `exchange_rate_source`,
	`destination_amount_minor`, `destination_currency_code`, `note`, `transaction_date`,
	`created_at`, `updated_at`
FROM `__mc12_transactions_backup`
ORDER BY (`type` = 'refund');--> statement-breakpoint
DROP TABLE `__mc12_transactions_backup`;--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`transaction_date`);--> statement-breakpoint
CREATE INDEX `transactions_type_date_idx` ON `transactions` (`type`,`transaction_date`);--> statement-breakpoint
CREATE INDEX `transactions_account_idx` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `transactions_destination_account_idx` ON `transactions` (`destination_account_id`);--> statement-breakpoint
CREATE INDEX `transactions_category_idx` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `transactions_original_status_idx` ON `transactions` (`original_transaction_id`,`status`);--> statement-breakpoint
CREATE TRIGGER `transactions_refund_insert_guard`
BEFORE INSERT ON `transactions`
WHEN NEW.`type` = 'refund'
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1
		FROM `transactions` AS original
		WHERE original.`id` = NEW.`original_transaction_id`
		  AND original.`type` = 'expense'
		  AND (NEW.`status` = 'voided' OR original.`status` = 'posted')
		  AND original.`account_id` = NEW.`account_id`
		  AND original.`transaction_date` <= NEW.`transaction_date`
		  AND NEW.`amount` <= original.`amount`
	) THEN RAISE(ABORT, 'invalid_refund_original') END;
	SELECT CASE WHEN NEW.`status` = 'posted' AND NEW.`amount` + coalesce((
		SELECT sum(existing.`amount`)
		FROM `transactions` AS existing
		WHERE existing.`original_transaction_id` = NEW.`original_transaction_id`
		  AND existing.`type` = 'refund'
		  AND existing.`status` = 'posted'
	), 0) > (
		SELECT original.`amount`
		FROM `transactions` AS original
		WHERE original.`id` = NEW.`original_transaction_id`
	) THEN RAISE(ABORT, 'refund_exceeds_original') END;
END;--> statement-breakpoint
CREATE TRIGGER `transactions_refund_update_guard`
BEFORE UPDATE ON `transactions`
WHEN OLD.`type` = 'refund' AND NOT (
	OLD.`status` = 'posted'
	AND NEW.`status` = 'voided'
	AND NEW.`id` IS OLD.`id`
	AND NEW.`type` IS OLD.`type`
	AND NEW.`amount` IS OLD.`amount`
	AND NEW.`currency` IS OLD.`currency`
	AND NEW.`account_id` IS OLD.`account_id`
	AND NEW.`destination_account_id` IS OLD.`destination_account_id`
	AND NEW.`category_id` IS OLD.`category_id`
	AND NEW.`original_transaction_id` IS OLD.`original_transaction_id`
	AND NEW.`note` IS OLD.`note`
	AND NEW.`transaction_date` IS OLD.`transaction_date`
	AND NEW.`created_at` IS OLD.`created_at`
)
BEGIN
	SELECT RAISE(ABORT, 'refund_update_not_allowed');
END;--> statement-breakpoint
CREATE TRIGGER `transactions_refunded_expense_update_guard`
BEFORE UPDATE ON `transactions`
WHEN OLD.`type` = 'expense' AND EXISTS (
	SELECT 1
	FROM `transactions` AS linked_refunds
	WHERE linked_refunds.`original_transaction_id` = OLD.`id`
	  AND linked_refunds.`type` = 'refund'
	  AND linked_refunds.`status` = 'posted'
)
BEGIN
	SELECT RAISE(ABORT, 'expense_has_posted_refunds');
END;--> statement-breakpoint

-- 5. Transaction splits (unchanged; recreated to restore its account/transaction FKs).
CREATE TABLE `transaction_splits` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`account_id` text NOT NULL,
	`amount` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE restrict ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `transaction_splits_amount_nonzero_safe` CHECK(typeof(`amount`) = 'integer' AND `amount` <> 0 AND `amount` BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT `transaction_splits_position_nonnegative` CHECK(`position` >= 0)
);--> statement-breakpoint
INSERT INTO `transaction_splits` (`id`, `transaction_id`, `account_id`, `amount`, `position`)
SELECT `id`, `transaction_id`, `account_id`, `amount`, `position` FROM `__mc12_transaction_splits_backup`;--> statement-breakpoint
DROP TABLE `__mc12_transaction_splits_backup`;--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_splits_transaction_position_uidx` ON `transaction_splits` (`transaction_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_splits_transaction_account_uidx` ON `transaction_splits` (`transaction_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `transaction_splits_account_idx` ON `transaction_splits` (`account_id`);--> statement-breakpoint

-- 6. Credit-card statements (unchanged; recreated to restore its account FK).
CREATE TABLE `credit_card_statements` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`closing_date` text NOT NULL,
	`due_date` text NOT NULL,
	`statement_balance` integer NOT NULL,
	`minimum_payment` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `credit_card_statements_period_start_valid` CHECK(`period_start` GLOB '????-??-??' AND date(`period_start`) = `period_start`),
	CONSTRAINT `credit_card_statements_period_end_valid` CHECK(`period_end` GLOB '????-??-??' AND date(`period_end`) = `period_end`),
	CONSTRAINT `credit_card_statements_closing_date_valid` CHECK(`closing_date` GLOB '????-??-??' AND date(`closing_date`) = `closing_date`),
	CONSTRAINT `credit_card_statements_due_date_valid` CHECK(`due_date` GLOB '????-??-??' AND date(`due_date`) = `due_date`),
	CONSTRAINT `credit_card_statements_period_valid` CHECK(`period_start` <= `period_end` AND `closing_date` >= `period_end` AND `due_date` >= `closing_date`),
	CONSTRAINT `credit_card_statements_balance_valid` CHECK(typeof(`statement_balance`) = 'integer' AND `statement_balance` BETWEEN 0 AND 9007199254740991),
	CONSTRAINT `credit_card_statements_minimum_valid` CHECK(typeof(`minimum_payment`) = 'integer' AND `minimum_payment` BETWEEN 0 AND `statement_balance`),
	CONSTRAINT `credit_card_statements_created_at_utc` CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `credit_card_statements_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z')
);--> statement-breakpoint
INSERT INTO `credit_card_statements` (`id`, `account_id`, `period_start`, `period_end`, `closing_date`, `due_date`, `statement_balance`, `minimum_payment`, `created_at`, `updated_at`)
SELECT `id`, `account_id`, `period_start`, `period_end`, `closing_date`, `due_date`, `statement_balance`, `minimum_payment`, `created_at`, `updated_at` FROM `__mc12_credit_card_statements_backup`;--> statement-breakpoint
DROP TABLE `__mc12_credit_card_statements_backup`;--> statement-breakpoint
CREATE UNIQUE INDEX `credit_card_statements_account_closing_uidx` ON `credit_card_statements` (`account_id`, `closing_date`);--> statement-breakpoint
CREATE INDEX `credit_card_statements_account_period_idx` ON `credit_card_statements` (`account_id`, `period_end`);--> statement-breakpoint
CREATE INDEX `credit_card_statements_due_date_idx` ON `credit_card_statements` (`due_date`);--> statement-breakpoint

-- 7. Recurring transactions (unchanged; recreated to restore its account FKs).
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
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`destination_account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `recurring_type_valid` CHECK(`type` IN ('income', 'expense', 'transfer')),
	CONSTRAINT `recurring_frequency_valid` CHECK(`frequency` IN ('daily', 'weekly', 'monthly', 'yearly')),
	CONSTRAINT `recurring_amount_positive` CHECK(typeof(`amount`) = 'integer' AND `amount` > 0 AND `amount` <= 9007199254740991),
	CONSTRAINT `recurring_currency_supported` CHECK(`currency` IN ('COP', 'USD')),
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
INSERT INTO `recurring_transactions` (`id`, `type`, `amount`, `currency`, `account_id`, `destination_account_id`, `category_id`, `note`, `frequency`, `interval`, `start_date`, `next_occurrence_date`, `end_date`, `is_active`, `ended_at`, `created_at`, `updated_at`)
SELECT `id`, `type`, `amount`, `currency`, `account_id`, `destination_account_id`, `category_id`, `note`, `frequency`, `interval`, `start_date`, `next_occurrence_date`, `end_date`, `is_active`, `ended_at`, `created_at`, `updated_at` FROM `__mc12_recurring_transactions_backup`;--> statement-breakpoint
DROP TABLE `__mc12_recurring_transactions_backup`;--> statement-breakpoint
CREATE INDEX `recurring_next_date_idx` ON `recurring_transactions` (`is_active`, `next_occurrence_date`);--> statement-breakpoint

-- 8. Recurring occurrences (unchanged; recreated to restore its account FKs).
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
	CONSTRAINT `recurring_occurrence_currency_supported` CHECK(`currency` IN ('COP', 'USD')),
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
INSERT INTO `recurring_occurrences` (`id`, `recurring_transaction_id`, `scheduled_date`, `status`, `type`, `amount`, `currency`, `account_id`, `destination_account_id`, `category_id`, `note`, `transaction_id`, `created_at`, `updated_at`)
SELECT `id`, `recurring_transaction_id`, `scheduled_date`, `status`, `type`, `amount`, `currency`, `account_id`, `destination_account_id`, `category_id`, `note`, `transaction_id`, `created_at`, `updated_at` FROM `__mc12_recurring_occurrences_backup`;--> statement-breakpoint
DROP TABLE `__mc12_recurring_occurrences_backup`;--> statement-breakpoint
CREATE UNIQUE INDEX `recurring_occurrences_rule_date_uidx` ON `recurring_occurrences` (`recurring_transaction_id`,`scheduled_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `recurring_occurrences_transaction_uidx` ON `recurring_occurrences` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_status_date_idx` ON `recurring_occurrences` (`status`,`scheduled_date`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_rule_status_idx` ON `recurring_occurrences` (`recurring_transaction_id`,`status`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_account_idx` ON `recurring_occurrences` (`account_id`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_destination_account_idx` ON `recurring_occurrences` (`destination_account_id`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_category_idx` ON `recurring_occurrences` (`category_id`);--> statement-breakpoint

-- 9. Investment-account metadata (1:1 with an 'investment'-type account).
CREATE TABLE `investment_accounts` (
	`account_id` text PRIMARY KEY NOT NULL,
	`investment_type` text NOT NULL,
	`tracking_mode` text DEFAULT 'balance' NOT NULL,
	`liquidity` text NOT NULL,
	`provider_name` text,
	`start_date` text,
	`maturity_date` text,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `investment_accounts_type_valid` CHECK(`investment_type` IN ('brokerage', 'fixed_term_deposit', 'voluntary_pension', 'investment_fund', 'private_investment', 'other')),
	CONSTRAINT `investment_accounts_tracking_mode_valid` CHECK(`tracking_mode` IN ('balance')),
	CONSTRAINT `investment_accounts_liquidity_valid` CHECK(`liquidity` IN ('liquid', 'restricted', 'locked')),
	CONSTRAINT `investment_accounts_start_date_valid` CHECK(`start_date` IS NULL OR (`start_date` GLOB '????-??-??' AND date(`start_date`) = `start_date`)),
	CONSTRAINT `investment_accounts_maturity_date_valid` CHECK(`maturity_date` IS NULL OR (`maturity_date` GLOB '????-??-??' AND date(`maturity_date`) = `maturity_date`)),
	CONSTRAINT `investment_accounts_maturity_after_start` CHECK(`start_date` IS NULL OR `maturity_date` IS NULL OR `maturity_date` >= `start_date`),
	CONSTRAINT `investment_accounts_created_at_utc` CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `investment_accounts_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z')
);--> statement-breakpoint

-- 10. Investment valuations (manual market-value history, native currency minor units).
CREATE TABLE `investment_valuations` (
	`id` text PRIMARY KEY NOT NULL,
	`investment_account_id` text NOT NULL,
	`value_minor` integer NOT NULL,
	`basis_minor` integer NOT NULL,
	`currency_code` text NOT NULL,
	`valuation_date` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`investment_account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `investment_valuations_value_safe` CHECK(typeof(`value_minor`) = 'integer' AND `value_minor` >= 0 AND `value_minor` <= 9007199254740991),
	CONSTRAINT `investment_valuations_basis_safe` CHECK(typeof(`basis_minor`) = 'integer' AND `basis_minor` BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT `investment_valuations_currency_supported` CHECK(`currency_code` IN ('COP', 'USD')),
	CONSTRAINT `investment_valuations_date_valid` CHECK(`valuation_date` GLOB '????-??-??' AND date(`valuation_date`) = `valuation_date`),
	CONSTRAINT `investment_valuations_created_at_utc` CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `investment_valuations_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z')
);--> statement-breakpoint
CREATE UNIQUE INDEX `investment_valuations_account_date_uidx` ON `investment_valuations` (`investment_account_id`, `valuation_date`);--> statement-breakpoint

PRAGMA foreign_key_check;--> statement-breakpoint
PRAGMA integrity_check;
