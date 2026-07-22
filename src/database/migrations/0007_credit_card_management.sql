ALTER TABLE `accounts` ADD `statement_closing_day` integer
  CONSTRAINT `accounts_statement_closing_day_valid`
  CHECK(`statement_closing_day` IS NULL OR (
    typeof(`statement_closing_day`) = 'integer'
    AND `type` = 'credit_card'
    AND `statement_closing_day` BETWEEN 1 AND 31
  ));--> statement-breakpoint
ALTER TABLE `accounts` ADD `payment_due_day` integer
  CONSTRAINT `accounts_payment_due_day_valid`
  CHECK(`payment_due_day` IS NULL OR (
    typeof(`payment_due_day`) = 'integer'
    AND `type` = 'credit_card'
    AND `payment_due_day` BETWEEN 1 AND 31
  ));--> statement-breakpoint
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
CREATE UNIQUE INDEX `credit_card_statements_account_closing_uidx` ON `credit_card_statements` (`account_id`, `closing_date`);--> statement-breakpoint
CREATE INDEX `credit_card_statements_account_period_idx` ON `credit_card_statements` (`account_id`, `period_end`);--> statement-breakpoint
CREATE INDEX `credit_card_statements_due_date_idx` ON `credit_card_statements` (`due_date`);--> statement-breakpoint
ALTER TABLE `notification_settings` ADD `credit_card_reminders_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_settings` ADD `credit_card_closing_reminder_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_settings` ADD `credit_card_due_three_days_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_settings` ADD `credit_card_due_one_day_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_settings` ADD `credit_card_due_today_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
CREATE TABLE `scheduled_notifications_new` (
  `id` text PRIMARY KEY NOT NULL,
  `domain_type` text NOT NULL,
  `domain_id` text NOT NULL,
  `notification_kind` text NOT NULL,
  `scheduled_notification_id` text NOT NULL,
  `scheduled_at` text NOT NULL,
  `trigger_at` text NOT NULL,
  `revision` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  CONSTRAINT `scheduled_notification_domain_valid` CHECK(`domain_type` IN ('recurring-occurrence', 'daily-reminder', 'test-notification', 'credit-card-reminder')),
  CONSTRAINT `scheduled_notification_created_at_utc` CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
  CONSTRAINT `scheduled_notification_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z'),
  CONSTRAINT `scheduled_notification_scheduled_at_utc` CHECK(`scheduled_at` GLOB '????-??-??T??:??:??*Z')
);--> statement-breakpoint
INSERT INTO `scheduled_notifications_new`
SELECT `id`, `domain_type`, `domain_id`, `notification_kind`, `scheduled_notification_id`, `scheduled_at`, `trigger_at`, `revision`, `created_at`, `updated_at`
FROM `scheduled_notifications`;--> statement-breakpoint
DROP TABLE `scheduled_notifications`;--> statement-breakpoint
ALTER TABLE `scheduled_notifications_new` RENAME TO `scheduled_notifications`;--> statement-breakpoint
CREATE UNIQUE INDEX `scheduled_notifications_domain_uidx` ON `scheduled_notifications` (`domain_type`, `domain_id`, `notification_kind`);--> statement-breakpoint
CREATE UNIQUE INDEX `scheduled_notifications_native_id_uidx` ON `scheduled_notifications` (`scheduled_notification_id`);
