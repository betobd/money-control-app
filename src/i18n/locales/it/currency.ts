import type { currency as en } from '../en/currency';

export const currency: typeof en = {
  pickerTitle: 'Scegli una valuta',
  pickerInUse: 'In uso',
  pickerAllCurrencies: 'Tutte le valute',
  pickerClose: 'Chiudi selettore valuta',
  pickerSearchLabel: 'Cerca valute',
  pickerSearchPlaceholder: 'Cerca per nome o codice',
  pickerNoMatch: (query) => `Nessuna valuta corrisponde a “${query}”.`,
  accessibleMoney: (amount, englishName, localizedName, isOne) => `${amount}, ${localizedName}`,
  rateRequired: (code, baseCode) =>
    `Serve un tasso di cambio ${code}/${baseCode} per convertire ${code}.`,
  derivedRateOutOfRange: 'Il tasso di cambio calcolato è fuori dall’intervallo supportato.',
};
