/**
 * Public barrel for application settings. Import from here rather than reaching
 * into modules.
 */
import { SettingsService } from './settings.service';
import { SQLiteSettingsRepository } from './sqlite-settings.repository';

export const settingsService = new SettingsService(new SQLiteSettingsRepository());

export * from './base-currency';
export * from './settings.types';
export {
  SettingsError,
  isSettingsError,
  baseCurrencyLockMessage,
  type SettingsErrorCode,
} from './settings.service';
