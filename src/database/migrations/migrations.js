// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_initial_local_database.sql';
import m0001 from './0001_active_account_name_uniqueness.sql';
import m0002 from './0002_credit_card_debt_sign.sql';
import m0003 from './0003_active_category_type_name_uniqueness.sql';
import m0004 from './0004_one_category_monthly_budgets.sql';
import m0005 from './0005_recurring_occurrences.sql';
import m0006 from './0006_local_notifications.sql';
import m0007 from './0007_credit_card_management.sql';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
    m0005,
    m0006,
    m0007,
  },
};
