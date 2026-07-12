CREATE UNIQUE INDEX `categories_active_type_name_uidx`
ON `categories` (`type`, lower(trim(`name`)))
WHERE `is_archived` = 0;
