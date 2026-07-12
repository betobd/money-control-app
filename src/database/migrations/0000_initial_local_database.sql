CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`currency` text DEFAULT 'COP' NOT NULL,
	`opening_balance` integer DEFAULT 0 NOT NULL,
	`credit_limit` integer,
	`is_archived` integer DEFAULT false NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "accounts_name_not_empty" CHECK(length(trim("accounts"."name")) > 0),
	CONSTRAINT "accounts_currency_cop" CHECK("accounts"."currency" = 'COP'),
	CONSTRAINT "accounts_type_valid" CHECK("accounts"."type" IN ('checking', 'savings', 'credit_card', 'cash', 'other')),
	CONSTRAINT "accounts_created_at_utc" CHECK("accounts"."created_at" GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT "accounts_updated_at_utc" CHECK("accounts"."updated_at" GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT "accounts_archived_at_utc" CHECK("accounts"."archived_at" IS NULL OR "accounts"."archived_at" GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT "accounts_opening_balance_safe" CHECK(typeof("accounts"."opening_balance") = 'integer' AND "accounts"."opening_balance" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "accounts_credit_limit_valid" CHECK("accounts"."credit_limit" IS NULL OR (typeof("accounts"."credit_limit") = 'integer' AND "accounts"."type" = 'credit_card' AND "accounts"."credit_limit" >= 0 AND "accounts"."credit_limit" <= 9007199254740991))
);
--> statement-breakpoint
CREATE INDEX `accounts_archived_idx` ON `accounts` (`is_archived`);--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`month` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'COP' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "budgets_amount_positive" CHECK(typeof("budgets"."amount") = 'integer' AND "budgets"."amount" > 0 AND "budgets"."amount" <= 9007199254740991),
	CONSTRAINT "budgets_currency_cop" CHECK("budgets"."currency" = 'COP'),
	CONSTRAINT "budgets_month_format" CHECK("budgets"."month" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "budgets_created_at_utc" CHECK("budgets"."created_at" GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT "budgets_updated_at_utc" CHECK("budgets"."updated_at" GLOB '????-??-??T??:??:??*Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budgets_category_month_uidx` ON `budgets` (`category_id`,`month`);--> statement-breakpoint
CREATE INDEX `budgets_month_idx` ON `budgets` (`month`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`icon` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "categories_name_not_empty" CHECK(length(trim("categories"."name")) > 0),
	CONSTRAINT "categories_type_valid" CHECK("categories"."type" IN ('expense', 'income')),
	CONSTRAINT "categories_created_at_utc" CHECK("categories"."created_at" GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT "categories_updated_at_utc" CHECK("categories"."updated_at" GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT "categories_archived_at_utc" CHECK("categories"."archived_at" IS NULL OR "categories"."archived_at" GLOB '????-??-??T??:??:??*Z')
);
--> statement-breakpoint
CREATE INDEX `categories_archived_idx` ON `categories` (`is_archived`);--> statement-breakpoint
CREATE INDEX `categories_type_idx` ON `categories` (`type`);--> statement-breakpoint
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
	`next_transaction_date` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`destination_account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "recurring_type_valid" CHECK("recurring_transactions"."type" IN ('income', 'expense', 'transfer')),
	CONSTRAINT "recurring_frequency_valid" CHECK("recurring_transactions"."frequency" IN ('daily', 'weekly', 'monthly', 'yearly')),
	CONSTRAINT "recurring_amount_positive" CHECK(typeof("recurring_transactions"."amount") = 'integer' AND "recurring_transactions"."amount" > 0 AND "recurring_transactions"."amount" <= 9007199254740991),
	CONSTRAINT "recurring_currency_cop" CHECK("recurring_transactions"."currency" = 'COP'),
	CONSTRAINT "recurring_interval_positive" CHECK("recurring_transactions"."interval" > 0),
	CONSTRAINT "recurring_created_at_utc" CHECK("recurring_transactions"."created_at" GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT "recurring_updated_at_utc" CHECK("recurring_transactions"."updated_at" GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT "recurring_shape_valid" CHECK((
        ("recurring_transactions"."type" IN ('income', 'expense') AND "recurring_transactions"."destination_account_id" IS NULL AND "recurring_transactions"."category_id" IS NOT NULL)
        OR
        ("recurring_transactions"."type" = 'transfer' AND "recurring_transactions"."destination_account_id" IS NOT NULL AND "recurring_transactions"."account_id" <> "recurring_transactions"."destination_account_id" AND "recurring_transactions"."category_id" IS NULL)
      ))
);
--> statement-breakpoint
CREATE INDEX `recurring_next_date_idx` ON `recurring_transactions` (`is_active`,`next_transaction_date`);--> statement-breakpoint
CREATE TABLE `transaction_splits` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`account_id` text NOT NULL,
	`amount` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE restrict ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "transaction_splits_amount_nonzero_safe" CHECK(typeof("transaction_splits"."amount") = 'integer' AND "transaction_splits"."amount" <> 0 AND "transaction_splits"."amount" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "transaction_splits_position_nonnegative" CHECK("transaction_splits"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_splits_transaction_position_uidx` ON `transaction_splits` (`transaction_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_splits_transaction_account_uidx` ON `transaction_splits` (`transaction_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `transaction_splits_account_idx` ON `transaction_splits` (`account_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'posted' NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'COP' NOT NULL,
	`account_id` text,
	`destination_account_id` text,
	`category_id` text,
	`note` text,
	`transaction_date` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`destination_account_id`) REFERENCES `accounts`(`id`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "transactions_type_valid" CHECK("transactions"."type" IN ('income', 'expense', 'transfer')),
	CONSTRAINT "transactions_status_valid" CHECK("transactions"."status" IN ('posted', 'voided')),
	CONSTRAINT "transactions_amount_positive" CHECK(typeof("transactions"."amount") = 'integer' AND "transactions"."amount" > 0 AND "transactions"."amount" <= 9007199254740991),
	CONSTRAINT "transactions_currency_cop" CHECK("transactions"."currency" = 'COP'),
	CONSTRAINT "transactions_date_valid" CHECK("transactions"."transaction_date" GLOB '????-??-??' AND date("transactions"."transaction_date") = "transactions"."transaction_date"),
	CONSTRAINT "transactions_created_at_utc" CHECK("transactions"."created_at" GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT "transactions_updated_at_utc" CHECK("transactions"."updated_at" GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT "transactions_shape_valid" CHECK((
        ("transactions"."type" IN ('income', 'expense') AND "transactions"."account_id" IS NOT NULL AND "transactions"."destination_account_id" IS NULL AND "transactions"."category_id" IS NOT NULL)
        OR
        ("transactions"."type" = 'transfer' AND "transactions"."account_id" IS NOT NULL AND "transactions"."destination_account_id" IS NOT NULL AND "transactions"."account_id" <> "transactions"."destination_account_id" AND "transactions"."category_id" IS NULL)
      ))
);
--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`transaction_date`);--> statement-breakpoint
CREATE INDEX `transactions_type_date_idx` ON `transactions` (`type`,`transaction_date`);--> statement-breakpoint
CREATE INDEX `transactions_account_idx` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `transactions_destination_account_idx` ON `transactions` (`destination_account_id`);--> statement-breakpoint
CREATE INDEX `transactions_category_idx` ON `transactions` (`category_id`);