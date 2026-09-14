import type { exchangeRates as en } from '../en/exchange-rates';

export const exchangeRates: typeof en = {
  title: 'Valuta e tassi',
  savedRate: (currency, base) => `Tasso ${currency}/${base} salvato.`,
  baseCurrencyNow: (code) => `La tua valuta principale ora è ${code}.`,
  cannotChangeBaseTitle: 'Impossibile cambiare la valuta principale',
  cannotChangeBaseFallback: 'Non è stato possibile cambiare la valuta principale.',
  confirmBaseTitle: (code) => `Usare ${code} come valuta principale?`,
  confirmBaseMessage: (code) =>
    `Tutti i totali consolidati (patrimonio netto, Home, Report e Budget) saranno mostrati in ${code}. Puoi cambiarla liberamente finché non registri il tuo primo movimento o budget.`,
  confirmBaseLabel: (code) => `Usa ${code}`,
  baseCurrency: 'Valuta principale',
  baseCurrencyBody: (name, code) =>
    `${name}. Tutti i totali consolidati (patrimonio netto, Home, Report e Budget) sono mostrati in ${code}. Ogni conto mantiene la propria valuta.`,
  changeBaseCurrency: 'Cambia valuta principale',
  baseCurrencyUnlockedHint:
    'Puoi cambiarla liberamente finché non registri il tuo primo movimento o budget. Dopo diventa fissa, perché ogni importo salvato è misurato rispetto a essa.',
  exchangeRatesTitle: 'Tassi di cambio',
  noRatesNeeded: (code) =>
    `Tutti i tuoi conti sono in ${code}, quindi non serve alcun tasso di cambio. Aggiungi un conto in un’altra valuta e il suo tasso comparirà qui.`,
  providerDisclaimer:
    'Frankfurter fornisce tassi di cambio di riferimento da fonti ufficiali. La tua banca potrebbe usare un tasso diverso.',
  alreadyBaseCurrency: 'È già la valuta principale',
  sourceFrankfurter: 'Tasso di riferimento Frankfurter',
  sourceManual: 'Inserimento manuale',
  staleBadge: 'Tasso forse non aggiornato',
  freshBadge: 'Aggiornato',
  source: 'Fonte',
  rateDate: 'Data del tasso',
  lastUpdated: 'Ultimo aggiornamento',
  noRateAvailable: (code) =>
    `Nessun tasso di cambio disponibile. I conti in ${code} restano esclusi dai totali consolidati finché non ne salvi uno.`,
  refreshFromFrankfurter: 'Aggiorna da Frankfurter',
  manualRateHint: (base, code) =>
    `Oppure inserisci quanti ${base} equivalgono a un ${code}. Fino a quattro decimali.`,
  manualRateLabel: (code, base) => `Tasso manuale da ${code} a ${base}`,
  manualRatePlaceholder: 'es. 4100',
  saveManualRate: 'Salva tasso manuale',
  loadError: 'Impossibile caricare i tassi di cambio.',
  refreshError: 'Impossibile aggiornare il tasso di cambio.',
  saveError: 'Impossibile salvare il tasso di cambio.',
  baseHasNoRate: 'La valuta principale non ha un tasso di cambio rispetto a se stessa.',
  refreshFailedCached: (currency, base) =>
    `Impossibile aggiornare il tasso di riferimento ${currency}/${base}. Si continua a usare l’ultimo tasso salvato.`,
  noRateEnterManually: (currency, base) =>
    `Nessun tasso di cambio disponibile per ${currency}. Inserisci manualmente un tasso ${currency}/${base}.`,
  invalidManualRate: (currency, base) =>
    `Inserisci un tasso ${currency}/${base} valido e maggiore di zero.`,
};
