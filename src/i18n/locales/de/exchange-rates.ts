import type { exchangeRates as en } from '../en/exchange-rates';

export const exchangeRates: typeof en = {
  title: 'Währung & Kurse',
  savedRate: (currency, base) => `Kurs ${currency}/${base} gespeichert.`,
  baseCurrencyNow: (code) => `Deine Hauptwährung ist jetzt ${code}.`,
  cannotChangeBaseTitle: 'Hauptwährung kann nicht geändert werden',
  cannotChangeBaseFallback: 'Die Hauptwährung konnte nicht geändert werden.',
  confirmBaseTitle: (code) => `${code} als Hauptwährung verwenden?`,
  confirmBaseMessage: (code) =>
    `Alle Gesamtsummen – Nettovermögen, Start, Berichte und Budgets – werden in ${code} angezeigt. Du kannst das frei ändern, bis du deine erste Buchung oder dein erstes Budget erfasst.`,
  confirmBaseLabel: (code) => `${code} verwenden`,
  baseCurrency: 'Hauptwährung',
  baseCurrencyBody: (name, code) =>
    `${name}. Alle Gesamtsummen – Nettovermögen, Start, Berichte und Budgets – werden in ${code} angezeigt. Jedes Konto behält seine eigene Währung.`,
  changeBaseCurrency: 'Hauptwährung ändern',
  baseCurrencyUnlockedHint:
    'Du kannst sie frei ändern, bis du deine erste Buchung oder dein erstes Budget erfasst. Danach ist sie fest, weil jeder gespeicherte Betrag an ihr gemessen wird.',
  exchangeRatesTitle: 'Wechselkurse',
  noRatesNeeded: (code) =>
    `Alle deine Konten sind in ${code}, daher wird kein Wechselkurs benötigt. Füge ein Konto in einer anderen Währung hinzu, dann erscheint sein Kurs hier.`,
  providerDisclaimer:
    'Frankfurter liefert Referenzkurse aus offiziellen Quellen. Deine Bank verwendet eventuell einen anderen Kurs.',
  alreadyBaseCurrency: 'Bereits die Hauptwährung',
  sourceFrankfurter: 'Frankfurter-Referenzkurs',
  sourceManual: 'Manuell eingegeben',
  staleBadge: 'Kurs evtl. veraltet',
  freshBadge: 'Aktuell',
  source: 'Quelle',
  rateDate: 'Kursdatum',
  lastUpdated: 'Zuletzt aktualisiert',
  noRateAvailable: (code) =>
    `Kein Wechselkurs verfügbar. Konten in ${code} fließen erst in die Gesamtsummen ein, wenn ein Kurs gespeichert ist.`,
  refreshFromFrankfurter: 'Von Frankfurter abrufen',
  manualRateHint: (base, code) =>
    `Oder gib ein, wie viele ${base} einem ${code} entsprechen. Bis zu vier Nachkommastellen.`,
  manualRateLabel: (code, base) => `Manueller Kurs ${code} zu ${base}`,
  manualRatePlaceholder: 'z. B. 4100',
  saveManualRate: 'Kurs speichern',
  loadError: 'Wechselkurse konnten nicht geladen werden.',
  refreshError: 'Der Wechselkurs konnte nicht aktualisiert werden.',
  saveError: 'Der Wechselkurs konnte nicht gespeichert werden.',
  baseHasNoRate: 'Die Hauptwährung hat keinen Wechselkurs zu sich selbst.',
  refreshFailedCached: (currency, base) =>
    `Der Referenzkurs ${currency}/${base} konnte nicht aktualisiert werden. Der zuletzt gespeicherte Kurs wird weiter verwendet.`,
  noRateEnterManually: (currency, base) =>
    `Für ${currency} ist kein Wechselkurs verfügbar. Gib einen Kurs ${currency}/${base} manuell ein.`,
  invalidManualRate: (currency, base) =>
    `Gib einen gültigen Kurs ${currency}/${base} größer als null ein.`,
};
