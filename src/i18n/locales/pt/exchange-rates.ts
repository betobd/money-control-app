import type { exchangeRates as en } from '../en/exchange-rates';

export const exchangeRates: typeof en = {
  title: 'Moeda e câmbio',
  savedRate: (currency, base) => `Taxa ${currency}/${base} salva.`,
  baseCurrencyNow: (code) => `Sua moeda principal agora é ${code}.`,
  cannotChangeBaseTitle: 'Não é possível alterar a moeda principal',
  cannotChangeBaseFallback: 'Não foi possível alterar a moeda principal.',
  confirmBaseTitle: (code) => `Usar ${code} como moeda principal?`,
  confirmBaseMessage: (code) =>
    `Todos os totais consolidados (patrimônio líquido, Início, Relatórios e Orçamentos) serão exibidos em ${code}. Você pode alterá-la livremente até registrar sua primeira transação ou orçamento.`,
  confirmBaseLabel: (code) => `Usar ${code}`,
  baseCurrency: 'Moeda principal',
  baseCurrencyBody: (name, code) =>
    `${name}. Todos os totais consolidados (patrimônio líquido, Início, Relatórios e Orçamentos) são exibidos em ${code}. Cada conta mantém sua própria moeda.`,
  changeBaseCurrency: 'Alterar moeda principal',
  baseCurrencyUnlockedHint:
    'Você pode alterá-la livremente até registrar sua primeira transação ou orçamento. Depois disso, ela fica fixa, porque todos os valores salvos são medidos com base nela.',
  exchangeRatesTitle: 'Taxas de câmbio',
  noRatesNeeded: (code) =>
    `Todas as suas contas estão em ${code}, então nenhuma taxa de câmbio é necessária. Adicione uma conta em outra moeda e a taxa dela aparecerá aqui.`,
  providerDisclaimer:
    'A Frankfurter fornece taxas de câmbio de referência de fontes oficiais. Seu banco pode usar uma taxa diferente.',
  alreadyBaseCurrency: 'Já é a moeda principal',
  sourceFrankfurter: 'Taxa de referência da Frankfurter',
  sourceManual: 'Inserida manualmente',
  staleBadge: 'A taxa pode estar desatualizada',
  freshBadge: 'Atualizada',
  source: 'Origem',
  rateDate: 'Data da taxa',
  lastUpdated: 'Última atualização',
  noRateAvailable: (code) =>
    `Nenhuma taxa de câmbio disponível. Contas em ${code} ficam fora dos totais consolidados até que uma seja salva.`,
  refreshFromFrankfurter: 'Atualizar pela Frankfurter',
  manualRateHint: (base, code) =>
    `Ou informe quantos ${base} equivalem a um ${code}. Até quatro casas decimais.`,
  manualRateLabel: (code, base) => `Taxa manual de ${code} para ${base}`,
  manualRatePlaceholder: 'ex.: 4100',
  saveManualRate: 'Salvar taxa manual',
  loadError: 'Não foi possível carregar as taxas de câmbio.',
  refreshError: 'Não foi possível atualizar a taxa de câmbio.',
  saveError: 'Não foi possível salvar a taxa de câmbio.',
  baseHasNoRate: 'A moeda principal não tem taxa de câmbio em relação a si mesma.',
  refreshFailedCached: (currency, base) =>
    `Não foi possível atualizar a taxa de referência ${currency}/${base}. A última taxa salva continua sendo usada.`,
  noRateEnterManually: (currency, base) =>
    `Nenhuma taxa de câmbio disponível para ${currency}. Informe uma taxa ${currency}/${base} manualmente.`,
  invalidManualRate: (currency, base) =>
    `Informe uma taxa ${currency}/${base} válida e maior que zero.`,
};
