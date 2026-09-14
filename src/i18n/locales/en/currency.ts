export const currency = {
  pickerTitle: 'Select currency',
  pickerInUse: 'In use',
  pickerAllCurrencies: 'All currencies',
  pickerClose: 'Close currency picker',
  pickerSearchLabel: 'Search currencies',
  pickerSearchPlaceholder: 'Search by name or code',
  pickerNoMatch: (query: string) => `No currency matches “${query}”.`,
  /**
   * Screen-reader text for an amount, e.g. `1.250.000 Colombian pesos`.
   * `englishName` is the registry name, `localizedName` the name in this language,
   * and `isOne` whether the amount is exactly one major unit. English pluralizes the
   * registry name; other languages have no plural currency names, so they pair the
   * amount with the localized name instead.
   */
  accessibleMoney: (amount: string, englishName: string, localizedName: string, isOne: boolean) =>
    `${amount} ${englishName}${isOne ? '' : 's'}`,
  rateRequired: (code: string, baseCode: string) =>
    `A ${code}/${baseCode} exchange rate is required to convert ${code}.`,
  derivedRateOutOfRange: 'The derived exchange rate is outside the supported range.',
};
