import type { currency as en } from '../en/currency';

export const currency: typeof en = {
  pickerTitle: 'Währung wählen',
  pickerInUse: 'Verwendet',
  pickerAllCurrencies: 'Alle Währungen',
  pickerClose: 'Währungsauswahl schließen',
  pickerSearchLabel: 'Währungen suchen',
  pickerSearchPlaceholder: 'Nach Name oder Code suchen',
  pickerNoMatch: (query) => `Keine Währung passt zu „${query}“.`,
  accessibleMoney: (amount, englishName, localizedName, isOne) => `${amount}, ${localizedName}`,
  rateRequired: (code, baseCode) =>
    `Zum Umrechnen von ${code} wird ein Wechselkurs ${code}/${baseCode} benötigt.`,
  derivedRateOutOfRange: 'Der berechnete Wechselkurs liegt außerhalb des unterstützten Bereichs.',
};
