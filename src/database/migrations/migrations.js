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
import m0008 from './0008_linked_refunds.sql';
import m0009 from './0009_multi_currency.sql';
import m0010 from './0010_budget_colors.sql';
import m0011 from './0011_recurring_budgets.sql';
import m0012 from './0012_investments_v1.sql';
import m0013 from './0013_category_subcategories.sql';
import m0014 from './0014_configurable_base_currency.sql';
import m0015 from './0015_monthly_budget_ceiling.sql';

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
    m0008,
    m0009,
    m0010,
    m0011,
    m0012,
    m0013,
    m0014,
    m0015,
  },
};
