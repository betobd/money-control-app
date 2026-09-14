export const exchangeRates = {
  title: 'Currency & Rates',
  savedRate: (currency: string, base: string) => `Saved the ${currency}/${base} rate.`,
  baseCurrencyNow: (code: string) => `Base currency is now ${code}.`,
  cannotChangeBaseTitle: 'Cannot change the base currency',
  cannotChangeBaseFallback: 'Unable to change the base currency.',
  confirmBaseTitle: (code: string) => `Use ${code} as the base currency?`,
  confirmBaseMessage: (code: string) =>
    `Every consolidated total — net worth, Home, Reports and Budgets — will be shown in ${code}. You can change this freely until you record your first transaction or budget.`,
  confirmBaseLabel: (code: string) => `Use ${code}`,
  baseCurrency: 'Base currency',
  baseCurrencyBody: (name: string, code: string) =>
    `${name}. All consolidated totals — net worth, Home, Reports and Budgets — are shown in ${code}. Each account keeps its own currency.`,
  changeBaseCurrency: 'Change base currency',
  baseCurrencyUnlockedHint:
    'This can be changed freely until you record your first transaction or budget. After that it is fixed, because every stored amount is measured against it.',
  exchangeRatesTitle: 'Exchange rates',
  noRatesNeeded: (code: string) =>
    `All of your accounts are in ${code}, so no exchange rate is needed. Add an account in another currency and its rate will appear here.`,
  providerDisclaimer:
    'Frankfurter provides reference exchange rates from official sources. Your bank may use a different rate.',
  alreadyBaseCurrency: 'Already the base currency',
  sourceFrankfurter: 'Frankfurter reference rate',
  sourceManual: 'Manual entry',
  staleBadge: 'Rate may be out of date',
  freshBadge: 'Up to date',
  source: 'Source',
  rateDate: 'Rate date',
  lastUpdated: 'Last updated',
  noRateAvailable: (code: string) =>
    `No exchange rate is available. Accounts in ${code} are left out of consolidated totals until one is saved.`,
  refreshFromFrankfurter: 'Refresh from Frankfurter',
  manualRateHint: (base: string, code: string) =>
    `Or enter how many ${base} equal one ${code}. Up to four decimal places.`,
  manualRateLabel: (code: string, base: string) => `Manual ${code} to ${base} rate`,
  manualRatePlaceholder: 'e.g. 4100',
  saveManualRate: 'Save manual rate',
  loadError: 'Unable to load exchange rates.',
  refreshError: 'Could not update the exchange rate.',
  saveError: 'Could not save the exchange rate.',
  baseHasNoRate: 'The base currency has no exchange rate against itself.',
  refreshFailedCached: (currency: string, base: string) =>
    `Could not update the ${currency}/${base} reference rate. The last saved rate is still being used.`,
  noRateEnterManually: (currency: string, base: string) =>
    `No exchange rate is available for ${currency}. Enter a ${currency}/${base} rate manually.`,
  invalidManualRate: (currency: string, base: string) =>
    `Enter a valid ${currency}/${base} rate greater than zero.`,
};
