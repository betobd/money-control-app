CREATE TABLE `__linked_refund_splits_backup` AS
SELECT `id`, `transaction_id`, `account_id`, `amount`, `position`
FROM `transaction_splits`;--> statement-breakpoint
CREATE TABLE `__linked_refund_occurrences_backup` AS
SELECT
	`id`, `recurring_transaction_id`, `scheduled_date`, `status`, `type`,
	`amount`, `currency`, `account_id`, `destination_account_id`, `category_id`,
	`note`, `transaction_id`, `created_at`, `updated_at`
FROM `recurring_occurrences`;--> statement-breakpoint
DROP TABLE `recurring_occurrences`;--> statement-breakpoint
DROP TABLE `transaction_splits`;--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'posted' NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'COP' NOT NULL,
	`account_id` text,
	`destination_account_id` text,
	`category_id` text,
	`original_transaction_id` text,
	`note` text,
	`transaction_date` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`destination_account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`original_transaction_id`) REFERENCES `__new_transactions`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "transactions_type_valid" CHECK(`type` IN ('income', 'expense', 'transfer', 'refund')),
	CONSTRAINT "transactions_status_valid" CHECK(`status` IN ('posted', 'voided')),
	CONSTRAINT "transactions_amount_positive" CHECK(typeof(`amount`) = 'integer' AND `amount` > 0 AND `amount` <= 9007199254740991),
	CONSTRAINT "transactions_currency_cop" CHECK(`currency` = 'COP'),
	CONSTRAINT "transactions_date_valid" CHECK(`transaction_date` GLOB '????-??-??' AND date(`transaction_date`) = `transaction_date`),
	CONSTRAINT "transactions_created_at_utc" CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT "transactions_updated_at_utc" CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT "transactions_shape_valid" CHECK((
		(`type` IN ('income', 'expense') AND `account_id` IS NOT NULL AND `destination_account_id` IS NULL AND `category_id` IS NOT NULL AND `original_transaction_id` IS NULL)
		OR
		(`type` = 'transfer' AND `account_id` IS NOT NULL AND `destination_account_id` IS NOT NULL AND `account_id` <> `destination_account_id` AND `category_id` IS NULL AND `original_transaction_id` IS NULL)
		OR
		(`type` = 'refund' AND `account_id` IS NOT NULL AND `destination_account_id` IS NULL AND `category_id` IS NULL AND `original_transaction_id` IS NOT NULL AND `original_transaction_id` <> `id`)
	))
);--> statement-breakpoint
INSERT INTO `__new_transactions` (
	`id`, `type`, `status`, `amount`, `currency`, `account_id`,
	`destination_account_id`, `category_id`, `original_transaction_id`,
	`note`, `transaction_date`, `created_at`, `updated_at`
)
SELECT
	`id`, `type`, `status`, `amount`, `currency`, `account_id`,
	`destination_account_id`, `category_id`, NULL,
	`note`, `transaction_date`, `created_at`, `updated_at`
FROM `transactions`;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;--> statement-breakpoint
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
CREATE TABLE `transaction_splits` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`account_id` text NOT NULL,
	`amount` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE restrict ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "transaction_splits_amount_nonzero_safe" CHECK(typeof(`amount`) = 'integer' AND `amount` <> 0 AND `amount` BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "transaction_splits_position_nonnegative" CHECK(`position` >= 0)
);--> statement-breakpoint
INSERT INTO `transaction_splits` (`id`, `transaction_id`, `account_id`, `amount`, `position`)
SELECT `id`, `transaction_id`, `account_id`, `amount`, `position`
FROM `__linked_refund_splits_backup`;--> statement-breakpoint
DROP TABLE `__linked_refund_splits_backup`;--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_splits_transaction_position_uidx` ON `transaction_splits` (`transaction_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_splits_transaction_account_uidx` ON `transaction_splits` (`transaction_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `transaction_splits_account_idx` ON `transaction_splits` (`account_id`);--> statement-breakpoint
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
INSERT INTO `recurring_occurrences` (
	`id`, `recurring_transaction_id`, `scheduled_date`, `status`, `type`,
	`amount`, `currency`, `account_id`, `destination_account_id`, `category_id`,
	`note`, `transaction_id`, `created_at`, `updated_at`
)
SELECT
	`id`, `recurring_transaction_id`, `scheduled_date`, `status`, `type`,
	`amount`, `currency`, `account_id`, `destination_account_id`, `category_id`,
	`note`, `transaction_id`, `created_at`, `updated_at`
FROM `__linked_refund_occurrences_backup`;--> statement-breakpoint
DROP TABLE `__linked_refund_occurrences_backup`;--> statement-breakpoint
CREATE UNIQUE INDEX `recurring_occurrences_rule_date_uidx` ON `recurring_occurrences` (`recurring_transaction_id`,`scheduled_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `recurring_occurrences_transaction_uidx` ON `recurring_occurrences` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_status_date_idx` ON `recurring_occurrences` (`status`,`scheduled_date`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_rule_status_idx` ON `recurring_occurrences` (`recurring_transaction_id`,`status`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_account_idx` ON `recurring_occurrences` (`account_id`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_destination_account_idx` ON `recurring_occurrences` (`destination_account_id`);--> statement-breakpoint
CREATE INDEX `recurring_occurrences_category_idx` ON `recurring_occurrences` (`category_id`);--> statement-breakpoint
PRAGMA foreign_key_check;--> statement-breakpoint
PRAGMA integrity_check;
