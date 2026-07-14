// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_initial_local_database.sql';
import m0001 from './0001_active_account_name_uniqueness.sql';
import m0002 from './0002_credit_card_debt_sign.sql';
import m0003 from './0003_active_category_type_name_uniqueness.sql';
import m0004 from './0004_one_category_monthly_budgets.sql';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
  },
};
