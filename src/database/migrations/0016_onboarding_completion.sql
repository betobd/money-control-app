-- First-run onboarding.
-- `onboarding_completed_at` records when the user finished the welcome flow, where
-- they choose the base currency before anything can lock it. NULL means the flow
-- has not been completed and the app shows it on launch.
--
-- Installs that already hold data are backfilled as completed: they were set up
-- before onboarding existed, and their base currency is already locked or chosen.
-- Default categories are seeded on every launch, so they do not count as data.
-- A non-default base currency counts, because it was chosen deliberately.
-- Additive: no existing row or column changes.
ALTER TABLE `app_settings` ADD `onboarding_completed_at` text
	CONSTRAINT `app_settings_onboarding_completed_at_utc` CHECK(`onboarding_completed_at` IS NULL OR `onboarding_completed_at` GLOB '????-??-??T??:??:??*Z');--> statement-breakpoint
UPDATE `app_settings`
SET `onboarding_completed_at` = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE EXISTS (SELECT 1 FROM `accounts`)
	OR EXISTS (SELECT 1 FROM `transactions`)
	OR EXISTS (SELECT 1 FROM `budgets`)
	OR EXISTS (SELECT 1 FROM `monthly_budgets`)
	OR `base_currency_code` <> 'USD';
