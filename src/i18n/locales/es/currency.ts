import type { currency as en } from '../en/currency';

export const currency: typeof en = {
  pickerTitle: 'Elige una moneda',
  pickerInUse: 'En uso',
  pickerAllCurrencies: 'Todas las monedas',
  pickerClose: 'Cerrar selector de moneda',
  pickerSearchLabel: 'Buscar monedas',
  pickerSearchPlaceholder: 'Busca por nombre o código',
  pickerNoMatch: (query) => `Ninguna moneda coincide con “${query}”.`,
  accessibleMoney: (amount, englishName, localizedName, isOne) => `${amount}, ${localizedName}`,
  rateRequired: (code, baseCode) =>
    `Se necesita una tasa de cambio ${code}/${baseCode} para convertir ${code}.`,
  derivedRateOutOfRange: 'La tasa de cambio calculada está fuera del rango admitido.',
};
