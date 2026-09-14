import type { currency as en } from '../en/currency';

export const currency: typeof en = {
  pickerTitle: 'Escolha uma moeda',
  pickerInUse: 'Em uso',
  pickerAllCurrencies: 'Todas as moedas',
  pickerClose: 'Fechar seletor de moeda',
  pickerSearchLabel: 'Buscar moedas',
  pickerSearchPlaceholder: 'Busque por nome ou código',
  pickerNoMatch: (query) => `Nenhuma moeda corresponde a “${query}”.`,
  accessibleMoney: (amount, englishName, localizedName, isOne) => `${amount}, ${localizedName}`,
  rateRequired: (code, baseCode) =>
    `É necessária uma taxa de câmbio ${code}/${baseCode} para converter ${code}.`,
  derivedRateOutOfRange: 'A taxa de câmbio calculada está fora do intervalo aceito.',
};
