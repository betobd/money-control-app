CREATE TABLE `notification_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`settings_version` integer DEFAULT 1 NOT NULL,
	`notifications_enabled` integer DEFAULT false NOT NULL,
	`recurring_reminders_enabled` integer DEFAULT false NOT NULL,
	`recurring_reminder_time` text DEFAULT '09:00' NOT NULL,
	`recurring_advance_days` integer DEFAULT 0 NOT NULL,
	`budget_alerts_enabled` integer DEFAULT false NOT NULL,
	`daily_reminder_enabled` integer DEFAULT false NOT NULL,
	`daily_reminder_time` text DEFAULT '19:00' NOT NULL,
	`notification_content_mode` text DEFAULT 'private' NOT NULL,
	`permission_prompted` integer DEFAULT false NOT NULL,
	`last_error_code` text,
	`last_error_at` text,
	`updated_at` text NOT NULL,
	CONSTRAINT `notification_settings_singleton` CHECK(`id` = 'device'),
	CONSTRAINT `notification_settings_version_valid` CHECK(`settings_version` = 1),
	CONSTRAINT `notification_recurring_time_valid` CHECK(`recurring_reminder_time` GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(`recurring_reminder_time`, 1, 2) <= '23'),
	CONSTRAINT `notification_daily_time_valid` CHECK(`daily_reminder_time` GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(`daily_reminder_time`, 1, 2) <= '23'),
	CONSTRAINT `notification_advance_days_valid` CHECK(`recurring_advance_days` BETWEEN 0 AND 3),
	CONSTRAINT `notification_content_mode_valid` CHECK(`notification_content_mode` IN ('private', 'detailed')),
	CONSTRAINT `notification_settings_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `notification_settings_error_at_utc` CHECK(`last_error_at` IS NULL OR `last_error_at` GLOB '????-??-??T??:??:??*Z')
);--> statement-breakpoint
CREATE TABLE `scheduled_notifications` (
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
	CONSTRAINT `scheduled_notification_domain_valid` CHECK(`domain_type` IN ('recurring-occurrence', 'daily-reminder', 'test-notification')),
	CONSTRAINT `scheduled_notification_created_at_utc` CHECK(`created_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `scheduled_notification_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z'),
	CONSTRAINT `scheduled_notification_scheduled_at_utc` CHECK(`scheduled_at` GLOB '????-??-??T??:??:??*Z')
);--> statement-breakpoint
CREATE UNIQUE INDEX `scheduled_notifications_domain_uidx` ON `scheduled_notifications` (`domain_type`,`domain_id`,`notification_kind`);--> statement-breakpoint
CREATE UNIQUE INDEX `scheduled_notifications_native_id_uidx` ON `scheduled_notifications` (`scheduled_notification_id`);--> statement-breakpoint
CREATE TABLE `budget_notification_state` (
	`budget_id` text NOT NULL,
	`month` text NOT NULL,
	`threshold_80_notified` integer DEFAULT false NOT NULL,
	`threshold_100_notified` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`budget_id`, `month`),
	CONSTRAINT `budget_notification_month_valid` CHECK(`month` GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' AND substr(`month`, 6, 2) BETWEEN '01' AND '12'),
	CONSTRAINT `budget_notification_updated_at_utc` CHECK(`updated_at` GLOB '????-??-??T??:??:??*Z')
);
