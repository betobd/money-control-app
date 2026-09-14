import type { reports as en } from '../en/reports';
import { createPlural } from '../../plural';

const plural = createPlural('de');

export const reports: typeof en = {
  title: 'Berichte',
  headerSubtitle: 'Deine gespeicherte Finanzhistorie',
  backFromReports: 'Zurück von Berichte',
  loadingReports: 'Berichte werden geladen',
  loadErrorTitle: 'Berichte konnten nicht geladen werden',
  loadError: 'Berichte konnten nicht geladen werden.',
  budgetsLoadError: 'Budgets für diesen Zeitraum konnten nicht geladen werden.',
  updating: 'Alle Berichtsbereiche werden aktualisiert…',

  presetCurrentMonth: 'Dieser Monat',
  presetPreviousMonth: 'Letzter Monat',
  presetLast3Months: 'Letzte 3 Monate',
  presetLast6Months: 'Letzte 6 Monate',
  presetCurrentYear: 'Dieses Jahr',
  presetCustom: 'Benutzerdefiniert',
  startDate: 'Startdatum',
  endDate: 'Enddatum',
  applyRange: 'Anwenden',
  applyRangeLabel: 'Benutzerdefinierten Berichtszeitraum anwenden',
  invalidPeriod: 'Ungültiger Berichtszeitraum.',
  selectedPeriod: (label) => `Ausgewählter Berichtszeitraum, ${label}`,

  invalidToday: 'Es konnte kein gültiges Datum für Bogotá ermittelt werden.',
  invalidCustomDates: 'Gib ein gültiges Start- und Enddatum im Format JJJJ-MM-TT ein.',
  endBeforeStart: 'Das Enddatum darf nicht vor dem Startdatum liegen.',

  netWorthStart: 'Start',
  unknownCategory: 'Unbekannte Kategorie',
  noSubcategory: 'Ohne Unterkategorie',

  emptyTitle: 'Keine gebuchten Einnahmen oder Ausgaben',
  emptyDescription:
    'Die Summen bleiben in diesem Zeitraum bei null. Umbuchungen, stornierte Buchungen sowie fällige oder übersprungene wiederkehrende Buchungen zählen nicht.',

  summaryTitle: 'Zusammenfassung',
  summaryDescription: 'Gebuchte Einnahmen und Ausgaben im ausgewählten Zeitraum.',
  netResult: 'Nettoergebnis',
  income: 'Einnahmen',
  expenses: 'Ausgaben',
  net: 'Netto',
  netExpenses: 'Nettoausgaben',
  grossExpenses: 'Bruttoausgaben',
  refunds: 'Erstattungen',
  averageExpense: 'Durchschnittsausgabe',
  expenseTransactions: 'Ausgabenbuchungen',
  incomeTransactions: 'Einnahmenbuchungen',
  refundTransactions: 'Erstattungsbuchungen',
  largestExpense: 'Größte Ausgabe',
  noLargestExpense: 'Keine gebuchten Ausgaben in diesem Zeitraum.',
  savingsRateNotApplicable: 'Keine Einnahmen in diesem Zeitraum, daher gibt es keine Sparquote.',
  savingsRate: (percentage) => `Du hast ${percentage} deiner Einnahmen behalten.`,
  showDetails: 'Details anzeigen',
  hideDetails: 'Details ausblenden',
  showSummaryDetails: 'Details der Zusammenfassung anzeigen',
  hideSummaryDetails: 'Details der Zusammenfassung ausblenden',

  cashFlowTitle: 'Einnahmen und Ausgaben',
  cashFlowDescriptionDay:
    'Eine Säule pro Tag (Ortszeit Bogotá). Einnahmen steigen über die Linie, Ausgaben fallen darunter.',
  cashFlowDescriptionMonth:
    'Eine Säule pro Kalendermonat. Einnahmen steigen über die Linie, Ausgaben fallen darunter.',
  wholePeriod: 'Gesamter Zeitraum',
  cashFlowChartLabel: (income, expenses) =>
    `Cashflow-Diagramm. Einnahmen gesamt ${income}. Ausgaben gesamt ${expenses}.`,
  cashFlowHint: 'Tippe auf eine Säule, um Details zu sehen.',
  cashFlowHintSelected: 'Tippe erneut auf die Säule, um den gesamten Zeitraum zu sehen.',

  paceTitle: 'Ausgabentempo',
  paceDescription: (previousPeriod) =>
    `Laufende Summe der Nettoausgaben im Vergleich zum selben Zeitpunkt des Vorzeitraums (${previousPeriod}).`,
  previousPeriod: 'Vorzeitraum',
  thisPeriod: 'Dieser Zeitraum',
  spentSoFar: 'Bisher ausgegeben',
  versusLast: (signedAmount) => `${signedAmount} ggü. vorher`,
  paceChartLabel: (spent, previousAmount, previousPeriod) =>
    `Kumulierte Ausgaben. Bisher ${spent}, gegenüber ${previousAmount} zum selben Zeitpunkt (${previousPeriod}).`,

  budgetTitle: 'Budget und Ist',
  budgetDescription:
    'Kategorie-Budgets im Vergleich zu den tatsächlichen Ausgaben. Erstattungen sind bereits abgezogen, Umbuchungen nicht enthalten.',
  budgetSumHint: (monthCount) =>
    `Die Limits sind die Summe aus ${monthCount} Monatsbudgets; Budgets werden nie anteilig berechnet.`,
  budgetRowLabel: (category, spent, limit, percentage) =>
    `${category}, ${spent} von ${limit} ausgegeben, ${percentage} % genutzt`,
  spentOfLimit: (spent, limit) => `${spent} von ${limit}`,
  remaining: (amount) => `${amount} übrig`,
  over: (amount) => `${amount} darüber`,

  weekdayTitle: 'Ausgaben nach Wochentag',
  weekdayDescription:
    'Durchschnittliche Nettoausgaben pro Wochentag, geteilt durch die Anzahl dieses Wochentags im Zeitraum.',
  weekdayColumnLabel: (shortDay, longDay, average, dayCount) =>
    `${longDay}, durchschnittlich ${average} an ${dayCount} ${plural(dayCount, 'Tag', 'Tagen')}`,
  heaviestDay: (shortDay, longDay, weekday, amount) =>
    `${longDay} ist dein ausgabenstärkster Tag – im Schnitt ${amount}.`,
  noWeekdayExpenses: 'Keine Ausgaben zum Vergleich der Wochentage.',

  categoryTitle: 'Ausgaben nach Kategorie',
  categoryDescription:
    'Alle gebuchten Ausgaben nach fester Kategorie-ID sortiert, einschließlich archivierter Kategorien.',
  categoryEmpty: 'Keine gebuchten Ausgaben zum Sortieren in diesem Zeitraum.',
  donutLabel: (total) => `Ausgaben nach Kategorie. Gesamt ${total}.`,
  totalExpenses: 'Ausgaben gesamt',
  otherCategories: (count) => `Sonstige (${count})`,
  expensesRanked: 'Ausgaben nach Kategorie sortiert',
  transactionCount: (count) => `${count} ${plural(count, 'Buchung', 'Buchungen')}`,
  inDetail: (count) => `${count} im Detail`,
  shareOfCategory: (percentage, category) => `${percentage} von ${category}`,
  showBreakdownHint: 'Zeigt die Aufteilung nach Unterkategorie',
  hideBreakdownHint: 'Blendet die Aufteilung nach Unterkategorie aus',

  netWorthTitle: 'Entwicklung des Nettovermögens',
  netWorthDescriptionDay: (date) =>
    `Beginnt mit dem Nettovermögen vor dem ${date} und wendet dann die gebuchte Historie bis zu jedem Tag an.`,
  netWorthDescriptionMonth: (date) =>
    `Beginnt mit dem Nettovermögen vor dem ${date} und wendet dann die gebuchte Historie bis zu jedem Monatsende an.`,
  noNetWorthHistory: 'Kein Verlauf des Nettovermögens für diesen Zeitraum.',
  endingNetWorth: 'Nettovermögen am Ende',
  netWorthChartLabel: (start, end) =>
    `Entwicklung des Nettovermögens. Beginnt bei ${start}, endet bei ${end}.`,

  investmentsTitle: 'Geldanlagen',
  investmentsDescription:
    'Aktueller Stand der Geldanlagen (geschätzt) plus realisierte Anlageerträge im Zeitraum. Nicht realisierte Wertänderungen erhöhen das Nettovermögen, zählen aber nie als reguläre Einnahme.',
  currentValue: 'Aktueller Wert',
  estimatedIncomplete: 'Geschätzt – unvollständig',
  netContributions: 'Nettoeinzahlungen',
  estimatedGainLoss: 'Geschätzter Gewinn/Verlust',
  simpleEstimatedReturn: 'Einfache geschätzte Rendite',
  investmentIncomePeriod: 'Anlageerträge (Zeitraum)',

  comparisonTitle: 'Vergleich mit dem Vorzeitraum',
  comparisonDescription: (previousPeriod) =>
    `Verglichen mit dem Vorzeitraum (${previousPeriod}). Steigende Ausgaben werden negativ markiert.`,
  noChange: 'Keine Änderung',
  noPreviousData: 'Keine Daten für den Vorzeitraum',
  percentageUnavailable: 'Prozentsatz nicht verfügbar',
  increasedBy: (difference, percentage) => `Gestiegen um ${difference} (${percentage})`,
  decreasedBy: (difference, percentage) => `Gesunken um ${difference} (${percentage})`,
  comparisonRowLabel: (label, current, change) => `${label}. Aktuell ${current}. ${change}.`,
};
