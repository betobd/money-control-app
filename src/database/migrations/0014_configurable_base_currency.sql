-- Configurable base currency, and any ISO-4217 currency on accounts.
--
-- Replaces the closed `IN ('COP','USD')` enumeration on every monetary table with
-- a structural three-letter check, so adding a currency is a change to the
-- TypeScript registry rather than a schema migration. The set of allowed codes is
-- validated in the repository layer against that registry; the database only
-- guarantees the shape.
--
-- SQLite cannot alter a CHECK, so each affected table is rebuilt with the
-- create-copy-swap pattern used by 0008/0009/0012. Every CREATE here is the exact
-- DDL of the table it replaces, with only the currency constraint rewritten.
--
-- `transactions` also gains `base_currency_code`. The old rule "a foreign-currency
-- row must carry a rate snapshot" was written as `currency = 'COP'`, which stops
-- being true once the base is a user setting, and a CHECK cannot read a settings
-- table. Recording the base on the row makes the snapshot self-describing and the
-- rule expressible again. It is backfilled to 'COP' for every existing
-- non-transfer row, which is what those rows have always meant.
--
-- For the same reason the rate snapshot gains `exchange_rate_base_code` and
-- `exchange_rate_quote_code`. `exchange_rate_scaled` alone is a bare number whose
-- meaning was carried by the fact that USD/COP was the only possible pair; a
-- transfer between two currencies that are both non-base has no such convention to
-- fall back on. Existing snapshots are backfilled as "1 USD = r COP", which is the
-- orientation every one of them was written in.
--
-- Existing data is preserved exactly: no amount, ID, date or relationship changes.
-- See docs/decisions/0008-configurable-base-currency.md.

-- 1. Back up every table that must be dropped, either to relax its own CHECK or to
-- release a foreign key into one that is being rebuilt.
--> statement-breakpoint
CREATE TABLE `__mc14_accounts` AS SELECT * FROM `accounts`;
--> statement-breakpoint
CREATE TABLE `__mc14_transactions` AS SELECT * FROM `transactions`;
--> statement-breakpoint
CREATE TABLE `__mc14_transaction_splits` AS SELECT * FROM `transaction_splits`;
--> statement-breakpoint
CREATE TABLE `__mc14_credit_card_statements` AS SELECT * FROM `credit_card_statements`;
--> statement-breakpoint
CREATE TABLE `__mc14_investment_accounts` AS SELECT * FROM `investment_accounts`;
--> statement-breakpoint
CREATE TABLE `__mc14_investment_valuations` AS SELECT * FROM `investment_valuations`;
--> statement-breakpoint
CREATE TABLE `__mc14_recurring_transactions` AS SELECT * FROM `recurring_transactions`;
--> statement-breakpoint
CREATE TABLE `__mc14_recurring_occurrences` AS SELECT * FROM `recurring_occurrences`;
--> statement-breakpoint
CREATE TABLE `__mc14_exchange_rates` AS SELECT * FROM `exchange_rates`;
--> statement-breakpoint
-- 2. Drop dependents before parents. Triggers and indexes drop with their table.
--> statement-breakpoint
-- Refund rows self-reference their original expense with ON DELETE RESTRICT, and
-- SQLite enforces that per row during the implicit delete inside DROP TABLE. The
-- rows are already captured above.
--> statement-breakpoint
DELETE FROM `transactions` WHERE `type` = 'refund';
--> statement-breakpoint
DROP TABLE `exchange_rates`;
--> statement-breakpoint
DROP TABLE `recurring_occurrences`;
--> statement-breakpoint
DROP TABLE `recurring_transactions`;
--> statement-breakpoint
DROP TABLE `investment_valuations`;
--> statement-breakpoint
DROP TABLE `investment_accounts`;
--> statement-breakpoint
DROP TABLE `credit_card_statements`;
--> statement-breakpoint
DROP TABLE `transaction_splits`;
--> statement-breakpoint
DROP TABLE `transactions`;
--> statement-breakpoint
DROP TABLE `accounts`;
--> statement-breakpoint
-- 3. Recreate each table, parents first, and restore its rows verbatim.
--> statement-breakpoint
-- accounts
--> statement-breakpoint
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
	CONSTRAINT `accounts_currency_supported` CHECK(`currency` GLOB '[A-Z][A-Z][A-Z]'),
	CONSTRAINT `accounts_type_valid` CHECK(`type` IN ('checking', 'savings', 'credit_card', 'cash', 'investment', 'other')),
	CONSTRAINT `accounts_created_at_utc` CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `accounts_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `accounts_archived_at_utc` CHECK(`archived_at` IS NULL OR `archived_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `accounts_opening_balance_safe` CHECK(typeof(`opening_balance`) = 'integer' AND `opening_balance` BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT `accounts_credit_limit_valid` CHECK(`credit_limit` IS NULL OR (typeof(`credit_limit`) = 'integer' AND `type` = 'credit_card' AND `credit_limit` >= 0 AND `credit_limit` <= 9007199254740991)),
	CONSTRAINT `accounts_statement_closing_day_valid` CHECK(`statement_closing_day` IS NULL OR (typeof(`statement_closing_day`) = 'integer' AND `type` = 'credit_card' AND `statement_closing_day` BETWEEN 1 AND 31)),
	CONSTRAINT `accounts_payment_due_day_valid` CHECK(`payment_due_day` IS NULL OR (typeof(`payment_due_day`) = 'integer' AND `type` = 'credit_card' AND `payment_due_day` BETWEEN 1 AND 31))
);
--> statement-breakpoint
INSERT INTO `accounts` (`id`, `name`, `type`, `currency`, `opening_balance`, `credit_limit`, `statement_closing_day`, `payment_due_day`, `is_archived`, `archived_at`, `created_at`, `updated_at`)
	SELECT `id`, `name`, `type`, `currency`, `opening_balance`, `credit_limit`, `statement_closing_day`, `payment_due_day`, `is_archived`, `archived_at`, `created_at`, `updated_at` FROM `__mc14_accounts`;
--> statement-breakpoint
DROP TABLE `__mc14_accounts`;
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_active_name_uidx` ON `accounts` (lower(trim(`name`))) WHERE `is_archived` = 0;
--> statement-breakpoint
CREATE INDEX `accounts_archived_idx` ON `accounts` (`is_archived`);
--> statement-breakpoint
-- transactions
--> statement-breakpoint
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
	`base_currency_code` text,
	`exchange_rate_base_code` text,
	`exchange_rate_quote_code` text,
	`destination_amount_minor` integer,
	`destination_currency_code` text,
	`note` text,
	`transaction_date` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL, `subcategory_id` text REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict CHECK(`subcategory_id` IS NULL OR `category_id` IS NOT NULL),
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`destination_account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`original_transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `transactions_type_valid` CHECK(`type` IN ('income', 'expense', 'transfer', 'refund')),
	CONSTRAINT `transactions_status_valid` CHECK(`status` IN ('posted', 'voided')),
	CONSTRAINT `transactions_amount_positive` CHECK(typeof(`amount`) = 'integer' AND `amount` > 0 AND `amount` <= 9007199254740991),
	CONSTRAINT `transactions_currency_supported` CHECK(`currency` GLOB '[A-Z][A-Z][A-Z]'),
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
		(`type` = 'transfer' AND (`destination_amount_minor` IS NULL OR (typeof(`destination_amount_minor`) = 'integer' AND `destination_amount_minor` > 0 AND `destination_amount_minor` <= 9007199254740991)) AND (`destination_currency_code` IS NULL OR `destination_currency_code` GLOB '[A-Z][A-Z][A-Z]'))
		OR
		(`type` <> 'transfer' AND `destination_amount_minor` IS NULL AND `destination_currency_code` IS NULL)
	)),
	CONSTRAINT `transactions_base_currency_valid` CHECK(`base_currency_code` IS NULL OR `base_currency_code` GLOB '[A-Z][A-Z][A-Z]'),
	-- The IS NOT NULL guards come before the GLOBs on purpose. A CHECK rejects only
	-- a FALSE result, never a NULL one, and `NULL GLOB '...'` is NULL: without them
	-- a rate with no pair would evaluate to NULL and be silently accepted.
	CONSTRAINT `transactions_rate_pair_valid` CHECK((
		(`exchange_rate_scaled` IS NULL AND `exchange_rate_base_code` IS NULL AND `exchange_rate_quote_code` IS NULL)
		OR (`exchange_rate_scaled` IS NOT NULL AND `exchange_rate_base_code` IS NOT NULL AND `exchange_rate_quote_code` IS NOT NULL AND `exchange_rate_base_code` GLOB '[A-Z][A-Z][A-Z]' AND `exchange_rate_quote_code` GLOB '[A-Z][A-Z][A-Z]' AND `exchange_rate_base_code` <> `exchange_rate_quote_code`)
	)),
	CONSTRAINT `transactions_foreign_snapshot_present` CHECK((
		(`type` = 'transfer' AND `base_currency_code` IS NULL)
		OR (`type` <> 'transfer' AND `base_currency_code` IS NOT NULL AND (
			`currency` = `base_currency_code`
			OR (`base_amount_minor` IS NOT NULL AND typeof(`exchange_rate_scaled`) = 'integer' AND `exchange_rate_scaled` > 0 AND typeof(`exchange_rate_scale`) = 'integer' AND `exchange_rate_scale` > 0 AND `exchange_rate_date` IS NOT NULL)
		))
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
);
--> statement-breakpoint
INSERT INTO `transactions` (`id`, `type`, `status`, `amount`, `currency`, `account_id`, `destination_account_id`, `category_id`, `original_transaction_id`, `base_amount_minor`, `exchange_rate_scaled`, `exchange_rate_scale`, `exchange_rate_date`, `exchange_rate_source`, `destination_amount_minor`, `destination_currency_code`, `note`, `transaction_date`, `created_at`, `updated_at`, `subcategory_id`, `base_currency_code`, `exchange_rate_base_code`, `exchange_rate_quote_code`)
	SELECT `id`, `type`, `status`, `amount`, `currency`, `account_id`, `destination_account_id`, `category_id`, `original_transaction_id`, `base_amount_minor`, `exchange_rate_scaled`, `exchange_rate_scale`, `exchange_rate_date`, `exchange_rate_source`, `destination_amount_minor`, `destination_currency_code`, `note`, `transaction_date`, `created_at`, `updated_at`, `subcategory_id`, CASE WHEN `type` = 'transfer' THEN NULL ELSE 'COP' END, CASE WHEN `exchange_rate_scaled` IS NULL THEN NULL ELSE 'USD' END, CASE WHEN `exchange_rate_scaled` IS NULL THEN NULL ELSE 'COP' END FROM `__mc14_transactions`;
--> statement-breakpoint
DROP TABLE `__mc14_transactions`;
--> statement-breakpoint
CREATE INDEX `transactions_account_idx` ON `transactions` (`account_id`);
--> statement-breakpoint
CREATE INDEX `transactions_category_idx` ON `transactions` (`category_id`);
--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`transaction_date`);
--> statement-breakpoint
CREATE INDEX `transactions_destination_account_idx` ON `transactions` (`destination_account_id`);
--> statement-breakpoint
CREATE INDEX `transactions_original_status_idx` ON `transactions` (`original_transaction_id`,`status`);
--> statement-breakpoint
CREATE INDEX `transactions_subcategory_idx` ON `transactions` (`subcategory_id`);
--> statement-breakpoint
CREATE INDEX `transactions_type_date_idx` ON `transactions` (`type`,`transaction_date`);
--> statement-breakpoint
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
END;
--> statement-breakpoint
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
END;
--> statement-breakpoint
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
END;
--> statement-breakpoint
CREATE TRIGGER `transactions_subcategory_insert_guard`
BEFORE INSERT ON `transactions`
WHEN NEW.`subcategory_id` IS NOT NULL
BEGIN
	SELECT RAISE(ABORT, 'The subcategory must belong to the transaction category.')
	WHERE (SELECT `parent_category_id` FROM `categories` WHERE `id` = NEW.`subcategory_id`) IS NOT NEW.`category_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `transactions_subcategory_update_guard`
BEFORE UPDATE ON `transactions`
WHEN NEW.`subcategory_id` IS NOT NULL
BEGIN
	SELECT RAISE(ABORT, 'The subcategory must belong to the transaction category.')
	WHERE (SELECT `parent_category_id` FROM `categories` WHERE `id` = NEW.`subcategory_id`) IS NOT NEW.`category_id`;
END;
--> statement-breakpoint
-- transaction_splits
--> statement-breakpoint
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
);
--> statement-breakpoint
INSERT INTO `transaction_splits` (`id`, `transaction_id`, `account_id`, `amount`, `position`)
	SELECT `id`, `transaction_id`, `account_id`, `amount`, `position` FROM `__mc14_transaction_splits`;
--> statement-breakpoint
DROP TABLE `__mc14_transaction_splits`;
--> statement-breakpoint
CREATE INDEX `transaction_splits_account_idx` ON `transaction_splits` (`account_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_splits_transaction_account_uidx` ON `transaction_splits` (`transaction_id`,`account_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_splits_transaction_position_uidx` ON `transaction_splits` (`transaction_id`,`position`);
--> statement-breakpoint
-- credit_card_statements
--> statement-breakpoint
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
);
--> statement-breakpoint
INSERT INTO `credit_card_statements` (`id`, `account_id`, `period_start`, `period_end`, `closing_date`, `due_date`, `statement_balance`, `minimum_payment`, `created_at`, `updated_at`)
	SELECT `id`, `account_id`, `period_start`, `period_end`, `closing_date`, `due_date`, `statement_balance`, `minimum_payment`, `created_at`, `updated_at` FROM `__mc14_credit_card_statements`;
--> statement-breakpoint
DROP TABLE `__mc14_credit_card_statements`;
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_card_statements_account_closing_uidx` ON `credit_card_statements` (`account_id`, `closing_date`);
--> statement-breakpoint
CREATE INDEX `credit_card_statements_account_period_idx` ON `credit_card_statements` (`account_id`, `period_end`);
--> statement-breakpoint
CREATE INDEX `credit_card_statements_due_date_idx` ON `credit_card_statements` (`due_date`);
--> statement-breakpoint
-- investment_accounts
--> statement-breakpoint
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
);
--> statement-breakpoint
INSERT INTO `investment_accounts` (`account_id`, `investment_type`, `tracking_mode`, `liquidity`, `provider_name`, `start_date`, `maturity_date`, `note`, `created_at`, `updated_at`)
	SELECT `account_id`, `investment_type`, `tracking_mode`, `liquidity`, `provider_name`, `start_date`, `maturity_date`, `note`, `created_at`, `updated_at` FROM `__mc14_investment_accounts`;
--> statement-breakpoint
DROP TABLE `__mc14_investment_accounts`;
--> statement-breakpoint
-- investment_valuations
--> statement-breakpoint
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
	CONSTRAINT `investment_valuations_currency_supported` CHECK(`currency_code` GLOB '[A-Z][A-Z][A-Z]'),
	CONSTRAINT `investment_valuations_date_valid` CHECK(`valuation_date` GLOB '????-??-??' AND date(`valuation_date`) = `valuation_date`),
	CONSTRAINT `investment_valuations_created_at_utc` CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `investment_valuations_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z')
);
--> statement-breakpoint
INSERT INTO `investment_valuations` (`id`, `investment_account_id`, `value_minor`, `basis_minor`, `currency_code`, `valuation_date`, `note`, `created_at`, `updated_at`)
	SELECT `id`, `investment_account_id`, `value_minor`, `basis_minor`, `currency_code`, `valuation_date`, `note`, `created_at`, `updated_at` FROM `__mc14_investment_valuations`;
--> statement-breakpoint
DROP TABLE `__mc14_investment_valuations`;
--> statement-breakpoint
CREATE UNIQUE INDEX `investment_valuations_account_date_uidx` ON `investment_valuations` (`investment_account_id`, `valuation_date`);
--> statement-breakpoint
-- recurring_transactions
--> statement-breakpoint
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
	`updated_at` text NOT NULL, `subcategory_id` text REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict CHECK(`subcategory_id` IS NULL OR `category_id` IS NOT NULL),
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`destination_account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `recurring_type_valid` CHECK(`type` IN ('income', 'expense', 'transfer')),
	CONSTRAINT `recurring_frequency_valid` CHECK(`frequency` IN ('daily', 'weekly', 'monthly', 'yearly')),
	CONSTRAINT `recurring_amount_positive` CHECK(typeof(`amount`) = 'integer' AND `amount` > 0 AND `amount` <= 9007199254740991),
	CONSTRAINT `recurring_currency_supported` CHECK(`currency` GLOB '[A-Z][A-Z][A-Z]'),
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
);
--> statement-breakpoint
INSERT INTO `recurring_transactions` (`id`, `type`, `amount`, `currency`, `account_id`, `destination_account_id`, `category_id`, `note`, `frequency`, `interval`, `start_date`, `next_occurrence_date`, `end_date`, `is_active`, `ended_at`, `created_at`, `updated_at`, `subcategory_id`)
	SELECT `id`, `type`, `amount`, `currency`, `account_id`, `destination_account_id`, `category_id`, `note`, `frequency`, `interval`, `start_date`, `next_occurrence_date`, `end_date`, `is_active`, `ended_at`, `created_at`, `updated_at`, `subcategory_id` FROM `__mc14_recurring_transactions`;
--> statement-breakpoint
DROP TABLE `__mc14_recurring_transactions`;
--> statement-breakpoint
CREATE INDEX `recurring_next_date_idx` ON `recurring_transactions` (`is_active`, `next_occurrence_date`);
--> statement-breakpoint
CREATE INDEX `recurring_transactions_subcategory_idx` ON `recurring_transactions` (`subcategory_id`);
--> statement-breakpoint
CREATE TRIGGER `recurring_transactions_subcategory_insert_guard`
BEFORE INSERT ON `recurring_transactions`
WHEN NEW.`subcategory_id` IS NOT NULL
BEGIN
	SELECT RAISE(ABORT, 'The subcategory must belong to the recurring rule category.')
	WHERE (SELECT `parent_category_id` FROM `categories` WHERE `id` = NEW.`subcategory_id`) IS NOT NEW.`category_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `recurring_transactions_subcategory_update_guard`
BEFORE UPDATE ON `recurring_transactions`
WHEN NEW.`subcategory_id` IS NOT NULL
BEGIN
	SELECT RAISE(ABORT, 'The subcategory must belong to the recurring rule category.')
	WHERE (SELECT `parent_category_id` FROM `categories` WHERE `id` = NEW.`subcategory_id`) IS NOT NEW.`category_id`;
END;
--> statement-breakpoint
-- recurring_occurrences
--> statement-breakpoint
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
	`updated_at` text NOT NULL, `subcategory_id` text REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict CHECK(`subcategory_id` IS NULL OR `category_id` IS NOT NULL),
	CONSTRAINT `recurring_occurrences_recurring_transaction_id_recurring_transactions_id_fk` FOREIGN KEY (`recurring_transaction_id`) REFERENCES `recurring_transactions`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `recurring_occurrences_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `recurring_occurrences_destination_account_id_accounts_id_fk` FOREIGN KEY (`destination_account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `recurring_occurrences_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `recurring_occurrences_transaction_id_transactions_id_fk` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT `recurring_occurrence_status_valid` CHECK(`status` IN ('pending', 'posted', 'skipped')),
	CONSTRAINT `recurring_occurrence_type_valid` CHECK(`type` IN ('income', 'expense', 'transfer')),
	CONSTRAINT `recurring_occurrence_amount_positive` CHECK(typeof(`amount`) = 'integer' AND `amount` > 0 AND `amount` <= 9007199254740991),
	CONSTRAINT `recurring_occurrence_currency_supported` CHECK(`currency` GLOB '[A-Z][A-Z][A-Z]'),
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
);
--> statement-breakpoint
INSERT INTO `recurring_occurrences` (`id`, `recurring_transaction_id`, `scheduled_date`, `status`, `type`, `amount`, `currency`, `account_id`, `destination_account_id`, `category_id`, `note`, `transaction_id`, `created_at`, `updated_at`, `subcategory_id`)
	SELECT `id`, `recurring_transaction_id`, `scheduled_date`, `status`, `type`, `amount`, `currency`, `account_id`, `destination_account_id`, `category_id`, `note`, `transaction_id`, `created_at`, `updated_at`, `subcategory_id` FROM `__mc14_recurring_occurrences`;
--> statement-breakpoint
DROP TABLE `__mc14_recurring_occurrences`;
--> statement-breakpoint
CREATE INDEX `recurring_occurrences_account_idx` ON `recurring_occurrences` (`account_id`);
--> statement-breakpoint
CREATE INDEX `recurring_occurrences_category_idx` ON `recurring_occurrences` (`category_id`);
--> statement-breakpoint
CREATE INDEX `recurring_occurrences_destination_account_idx` ON `recurring_occurrences` (`destination_account_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `recurring_occurrences_rule_date_uidx` ON `recurring_occurrences` (`recurring_transaction_id`,`scheduled_date`);
--> statement-breakpoint
CREATE INDEX `recurring_occurrences_rule_status_idx` ON `recurring_occurrences` (`recurring_transaction_id`,`status`);
--> statement-breakpoint
CREATE INDEX `recurring_occurrences_status_date_idx` ON `recurring_occurrences` (`status`,`scheduled_date`);
--> statement-breakpoint
CREATE INDEX `recurring_occurrences_subcategory_idx` ON `recurring_occurrences` (`subcategory_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `recurring_occurrences_transaction_uidx` ON `recurring_occurrences` (`transaction_id`);
--> statement-breakpoint
CREATE TRIGGER `recurring_occurrences_subcategory_insert_guard`
BEFORE INSERT ON `recurring_occurrences`
WHEN NEW.`subcategory_id` IS NOT NULL
BEGIN
	SELECT RAISE(ABORT, 'The subcategory must belong to the occurrence category.')
	WHERE (SELECT `parent_category_id` FROM `categories` WHERE `id` = NEW.`subcategory_id`) IS NOT NEW.`category_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `recurring_occurrences_subcategory_update_guard`
BEFORE UPDATE ON `recurring_occurrences`
WHEN NEW.`subcategory_id` IS NOT NULL
BEGIN
	SELECT RAISE(ABORT, 'The subcategory must belong to the occurrence category.')
	WHERE (SELECT `parent_category_id` FROM `categories` WHERE `id` = NEW.`subcategory_id`) IS NOT NEW.`category_id`;
END;
--> statement-breakpoint
-- exchange_rates
--> statement-breakpoint
CREATE TABLE `exchange_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`base_currency_code` text NOT NULL,
	`quote_currency_code` text NOT NULL,
	`rate_scaled` integer NOT NULL,
	`rate_scale` integer NOT NULL,
	`effective_date` text NOT NULL,
	`fetched_at` text NOT NULL,
	`provider` text,
	`source` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `exchange_rates_base_supported` CHECK(`base_currency_code` GLOB '[A-Z][A-Z][A-Z]'),
	CONSTRAINT `exchange_rates_quote_supported` CHECK(`quote_currency_code` GLOB '[A-Z][A-Z][A-Z]'),
	CONSTRAINT `exchange_rates_pair_distinct` CHECK(`base_currency_code` <> `quote_currency_code`),
	CONSTRAINT `exchange_rates_scaled_valid` CHECK(typeof(`rate_scaled`) = 'integer' AND `rate_scaled` > 0 AND `rate_scaled` <= 9007199254740991),
	CONSTRAINT `exchange_rates_scale_valid` CHECK(typeof(`rate_scale`) = 'integer' AND `rate_scale` > 0 AND `rate_scale` <= 9007199254740991),
	CONSTRAINT `exchange_rates_effective_date_valid` CHECK(`effective_date` GLOB '????-??-??' AND date(`effective_date`) = `effective_date`),
	CONSTRAINT `exchange_rates_fetched_at_utc` CHECK(`fetched_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `exchange_rates_source_valid` CHECK(`source` IN ('frankfurter', 'manual')),
	CONSTRAINT `exchange_rates_created_at_utc` CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `exchange_rates_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z')
);
--> statement-breakpoint
INSERT INTO `exchange_rates` (`id`, `base_currency_code`, `quote_currency_code`, `rate_scaled`, `rate_scale`, `effective_date`, `fetched_at`, `provider`, `source`, `created_at`, `updated_at`)
	SELECT `id`, `base_currency_code`, `quote_currency_code`, `rate_scaled`, `rate_scale`, `effective_date`, `fetched_at`, `provider`, `source`, `created_at`, `updated_at` FROM `__mc14_exchange_rates`;
--> statement-breakpoint
DROP TABLE `__mc14_exchange_rates`;
--> statement-breakpoint
-- 4. The base currency itself.
-- Seeded from the data: an install that already has accounts has always been COP,
-- and must stay COP because every base_amount_minor snapshot is denominated in it.
-- A fresh install gets a neutral default the user can change freely, which stays
-- allowed for exactly as long as there is no financial history to invalidate.
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`base_currency_code` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `app_settings_singleton` CHECK(`id` = 'device'),
	CONSTRAINT `app_settings_base_currency_valid` CHECK(`base_currency_code` GLOB '[A-Z][A-Z][A-Z]'),
	CONSTRAINT `app_settings_created_at_utc` CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `app_settings_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z')
);
--> statement-breakpoint
INSERT INTO `app_settings` (`id`, `base_currency_code`, `created_at`, `updated_at`)
SELECT
	'device',
	CASE WHEN EXISTS (SELECT 1 FROM `accounts`) THEN 'COP' ELSE 'USD' END,
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
