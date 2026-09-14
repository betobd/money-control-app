import type { exchangeRates as en } from '../en/exchange-rates';

export const exchangeRates: typeof en = {
  title: 'Devise et taux',
  savedRate: (currency, base) => `Taux ${currency}/${base} enregistré.`,
  baseCurrencyNow: (code) => `Votre devise principale est désormais ${code}.`,
  cannotChangeBaseTitle: 'Impossible de changer la devise principale',
  cannotChangeBaseFallback: 'Impossible de changer la devise principale.',
  confirmBaseTitle: (code) => `Utiliser ${code} comme devise principale ?`,
  confirmBaseMessage: (code) =>
    `Tous les totaux consolidés (patrimoine net, Accueil, Rapports et Budgets) seront affichés en ${code}. Vous pouvez la changer librement jusqu’à votre première transaction ou votre premier budget.`,
  confirmBaseLabel: (code) => `Utiliser ${code}`,
  baseCurrency: 'Devise principale',
  baseCurrencyBody: (name, code) =>
    `${name}. Tous les totaux consolidés (patrimoine net, Accueil, Rapports et Budgets) sont affichés en ${code}. Chaque compte conserve sa propre devise.`,
  changeBaseCurrency: 'Changer de devise principale',
  baseCurrencyUnlockedHint:
    'Vous pouvez la changer librement jusqu’à votre première transaction ou votre premier budget. Ensuite, elle est fixée, car chaque montant enregistré est mesuré par rapport à elle.',
  exchangeRatesTitle: 'Taux de change',
  noRatesNeeded: (code) =>
    `Tous vos comptes sont en ${code} : aucun taux de change n’est nécessaire. Ajoutez un compte dans une autre devise et son taux apparaîtra ici.`,
  providerDisclaimer:
    'Frankfurter fournit des taux de change de référence issus de sources officielles. Votre banque peut appliquer un taux différent.',
  alreadyBaseCurrency: 'Déjà la devise principale',
  sourceFrankfurter: 'Taux de référence Frankfurter',
  sourceManual: 'Saisie manuelle',
  staleBadge: 'Taux peut-être obsolète',
  freshBadge: 'À jour',
  source: 'Source',
  rateDate: 'Date du taux',
  lastUpdated: 'Dernière mise à jour',
  noRateAvailable: (code) =>
    `Aucun taux de change disponible. Les comptes en ${code} sont exclus des totaux consolidés tant qu’aucun taux n’est enregistré.`,
  refreshFromFrankfurter: 'Actualiser via Frankfurter',
  manualRateHint: (base, code) =>
    `Ou indiquez combien de ${base} valent un ${code}. Jusqu’à quatre décimales.`,
  manualRateLabel: (code, base) => `Taux manuel ${code} vers ${base}`,
  manualRatePlaceholder: 'ex. 4100',
  saveManualRate: 'Enregistrer le taux',
  loadError: 'Impossible de charger les taux de change.',
  refreshError: 'Impossible de mettre à jour le taux de change.',
  saveError: 'Impossible d’enregistrer le taux de change.',
  baseHasNoRate: 'La devise principale n’a pas de taux de change par rapport à elle-même.',
  refreshFailedCached: (currency, base) =>
    `Impossible de mettre à jour le taux de référence ${currency}/${base}. Le dernier taux enregistré reste utilisé.`,
  noRateEnterManually: (currency, base) =>
    `Aucun taux de change disponible pour ${currency}. Saisissez un taux ${currency}/${base} manuellement.`,
  invalidManualRate: (currency, base) =>
    `Saisissez un taux ${currency}/${base} valide et supérieur à zéro.`,
};
