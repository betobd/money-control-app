import type { currency as en } from '../en/currency';

export const currency: typeof en = {
  pickerTitle: 'Choisir une devise',
  pickerInUse: 'Utilisées',
  pickerAllCurrencies: 'Toutes les devises',
  pickerClose: 'Fermer le sélecteur de devise',
  pickerSearchLabel: 'Rechercher une devise',
  pickerSearchPlaceholder: 'Rechercher par nom ou code',
  pickerNoMatch: (query) => `Aucune devise ne correspond à « ${query} ».`,
  accessibleMoney: (amount, englishName, localizedName, isOne) => `${amount}, ${localizedName}`,
  rateRequired: (code, baseCode) =>
    `Un taux de change ${code}/${baseCode} est nécessaire pour convertir ${code}.`,
  derivedRateOutOfRange: 'Le taux de change calculé est hors de la plage prise en charge.',
};
