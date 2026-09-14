import type { addTransaction as en } from '../en/add-transaction';
import { createPlural } from '../../plural';

const plural = createPlural('de');

export const addTransaction: typeof en = {
  title: 'Buchung hinzufügen',
  close: 'Buchung hinzufügen schließen',
  unableToSave: 'Die Buchung konnte nicht gespeichert werden.',
  missingPairRate: (currency: string, base: string) =>
    `Füge einen Wechselkurs ${currency}/${base} hinzu, bevor du diese Buchung speicherst.`,
  referenceRate: (rate: string, date: string) =>
    `Referenzkurs ${rate} · Kursdatum ${date}. Deine Bank verwendet eventuell einen anderen Kurs.`,
  noRate: (currency: string, base: string) =>
    `Kein Wechselkurs verfügbar. Füge vor dem Speichern unter Mehr → Währung & Kurse einen Kurs ${currency}/${base} hinzu.`,
  transferReducesDebt: 'Diese Umbuchung verringert die aktuelle Schuld der Karte.',
  transferIncreasesDebt: 'Dies erhöht die aktuelle Schuld der Karte oder verringert ein Guthaben.',
  selectAccount: 'Konto wählen',
  selectSourceAccount: 'Quellkonto wählen',
  selectDestinationAccount: 'Zielkonto wählen',
  selectCategory: 'Kategorie wählen',
  selectExpenseCategory: 'Ausgabenkategorie wählen',
  selectIncomeCategory: 'Einnahmenkategorie wählen',
  amountReceived: (currency: string) => `Empfangener Betrag (${currency})`,
  amountReceivedA11y: (currency: string) => `Empfangener Betrag in ${currency}`,
  estimateFromRate: 'Mit Referenzkurs schätzen',
  amountReceivedHelp: 'Gib den Betrag ein, den deine Bank tatsächlich gutgeschrieben hat. Beide Beträge werden gespeichert.',
  manageCategories: 'Kategorien verwalten',
  sourceAccount: 'Quellkonto',
  destinationAccount: 'Zielkonto',
  fromAccount: 'Von Konto',
  toAccount: 'Auf Konto',
  transferDescription: 'Geld zwischen zwei verschiedenen Konten verschieben',
  transactionDate: 'Buchungsdatum',
  noteOptional: 'Notiz (optional)',
  noteA11y: 'Notiz zur Buchung, optional',
  notePlaceholder: 'Beschreibung hinzufügen…',
  transactionType: 'Buchungsart',
  amount: 'Betrag',
  amountIn: (currencyName: string) => `Betrag in ${currencyName}`,
  upToTwoDecimals: 'Bis zu 2 Nachkommastellen',
  wholeUnitsOnly: 'Ohne Nachkommastellen',
  saving: 'Wird gespeichert…',
  save: {
    expense: 'Ausgabe speichern',
    income: 'Einnahme speichern',
    transfer: 'Umbuchung speichern',
  },
  saved: {
    expense: 'Ausgabe gespeichert',
    income: 'Einnahme gespeichert',
    transfer: 'Umbuchung gespeichert',
  },
  accountPicker: {
    close: 'Kontoauswahl schließen',
    empty: 'Noch keine aktiven Konten. Füge zuerst ein Konto hinzu und wähle es dann hier aus.',
    accountA11y: (name: string, type: string, balance: string) => `${name}, ${type}, Saldo ${balance}`,
  },
  categoryGrid: {
    title: 'Kategorie',
    viewAll: 'Alle anzeigen',
    viewAllA11y: 'Alle Kategorien anzeigen',
    hasSubcategories: (count: number) => `Hat ${count} ${plural(count, 'Unterkategorie', 'Unterkategorien')}`,
    categoryA11y: (name: string) => `Kategorie ${name}`,
    noActive: 'Keine aktiven Kategorien.',
    detail: (name: string) => `${name} im Detail`,
    none: 'Keine',
    noneA11y: (category: string) => `Keine Unterkategorie, nur ${category}`,
    subcategoryA11y: (subcategory: string, category: string) => `${subcategory}, Unterkategorie von ${category}`,
  },
  categoryPicker: {
    close: 'Kategorieauswahl schließen',
    searchLabel: 'Kategorien durchsuchen',
    searchPlaceholder: 'Kategorien durchsuchen…',
    noMatches: (query: string) => `Keine Kategorie passt zu „${query}“.`,
    noActive: 'Noch keine aktiven Kategorien.',
    subcategoryA11y: (subcategory: string, category: string) => `${subcategory}, Unterkategorie von ${category}`,
  },
};
