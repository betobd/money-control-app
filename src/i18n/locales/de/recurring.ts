import { createPlural } from '../../plural';
import type { recurring as en } from '../en/recurring';

const plural = createPlural('de');

export const recurring: typeof en = {
  title: 'Wiederkehrend',
  createRecurring: 'Wiederkehrende Buchung erstellen',
  closeRecurring: 'Wiederkehrende Buchungen schließen',
  sections: 'Bereiche für wiederkehrende Buchungen',
  tabDue: 'Fällig',
  tabRules: 'Regeln',
  tabHistory: 'Verlauf',
  updating: 'Wird aktualisiert…',
  backlogLimited: 'Ein großer Rückstand wurde für diesen Ladevorgang begrenzt. Öffne diesen Bildschirm erneut, um sicher fortzufahren.',
  loadError: 'Wiederkehrende Buchungen konnten nicht geladen werden.',

  noneDue: 'Heute sind keine wiederkehrenden Buchungen fällig.',
  dueOn: (date: string) => `Fällig: ${date}`,
  confirmOccurrence: (label: string) => `${label} bestätigen`,
  editOccurrence: (label: string) => `Termin ${label} bearbeiten`,
  skipOccurrence: (label: string) => `Termin ${label} überspringen`,
  skip: 'Überspringen',
  skipTitle: 'Diesen Termin überspringen?',
  skipMessage: 'Er bleibt im Verlauf und wirkt sich nicht auf Salden oder Berichte aus.',
  unableToConfirm: 'Bestätigen fehlgeschlagen',
  confirmFallback: 'Prüfe den Termin und versuche es erneut.',
  unableToSkip: 'Überspringen fehlgeschlagen',
  tryAgain: 'Versuche es erneut.',

  activeRules: 'Aktive Regeln',
  pausedRules: 'Pausierte Regeln',
  endedRules: 'Beendete Regeln',
  sectionCount: (title: string, count: number) => `${title} · ${count}`,
  createRule: 'Regel erstellen',
  createFirstRule: 'Erstelle deine erste wiederkehrende Regel',
  emptyTitle: 'Noch keine wiederkehrenden Regeln',
  emptyBody: 'Erstelle eine Regel für Ausgaben, Einnahmen oder Umbuchungen, die regelmäßig anfallen.',
  noActiveRules: 'Derzeit keine aktiven Regeln. Pausierte und beendete Regeln stehen weiter unten.',
  ruleStatus: {
    active: 'Aktiv',
    paused: 'Pausiert',
    ended: 'Beendet',
  },
  ruleStatusAccessibility: (status: string) => `Regelstatus: ${status}`,
  nextOn: (date: string) => `Nächste: ${date}`,
  editFuture: 'Künftige bearbeiten',
  pause: 'Pausieren',
  resume: 'Fortsetzen',
  end: 'Beenden',
  endTitle: 'Wiederkehrende Buchung beenden?',
  endMessage: 'Es werden keine weiteren Termine erzeugt. Verlauf und fällige Einträge bleiben erhalten.',
  unableToUpdateRule: 'Regel konnte nicht aktualisiert werden',
  unableToEndRule: 'Regel konnte nicht beendet werden',
  account: 'Konto',
  category: 'Kategorie',

  frequency: {
    daily: 'Täglich',
    weekly: 'Wöchentlich',
    monthly: 'Monatlich',
    yearly: 'Jährlich',
  },
  everyTwoWeeks: 'Alle zwei Wochen',
  everyInterval: (count, unit) => {
    if (unit === 'daily') return `Alle ${count} ${plural(count, 'Tag', 'Tage')}`;
    if (unit === 'weekly') return `Alle ${count} ${plural(count, 'Woche', 'Wochen')}`;
    if (unit === 'monthly') return `Alle ${count} ${plural(count, 'Monat', 'Monate')}`;
    return `Alle ${count} ${plural(count, 'Jahr', 'Jahre')}`;
  },

  historyEmpty: 'Bestätigte und übersprungene Termine erscheinen hier.',
  occurrenceStatus: {
    posted: 'Gebucht',
    skipped: 'Übersprungen',
  },
  occurrenceStatusSpoken: {
    pending: 'fällig',
    posted: 'gebucht',
    skipped: 'übersprungen',
  },
  historyAccessibility: (status: string, label: string, amount: string, date: string) =>
    `${status}, ${label}, ${amount}, ${date}`,

  createTitle: 'Wiederkehrende Buchung erstellen',
  editRuleTitle: 'Künftige Regel bearbeiten',
  editOccurrenceTitle: 'Diesen Termin bearbeiten',
  optionDaily: 'Täglich',
  optionWeekly: 'Wöchentlich',
  optionEveryTwoWeeks: 'Alle 2 Wochen',
  optionMonthly: 'Monatlich',
  optionYearly: 'Jährlich',
  frequencyLabel: 'Häufigkeit',
  sourceAccount: 'Quellkonto',
  destinationAccount: 'Zielkonto',
  selectAccount: 'Konto wählen',
  selectSourceAccount: 'Quellkonto wählen',
  selectDestinationAccount: 'Zielkonto wählen',
  selectIncomeCategory: 'Einnahmenkategorie wählen',
  selectExpenseCategory: 'Ausgabenkategorie wählen',
  startDate: 'Startdatum',
  scheduledDate: 'Geplantes Datum',
  endDateOptional: 'Enddatum (optional)',
  noteOptional: 'Notiz (optional)',
  noteAccessibility: 'Notiz zur wiederkehrenden Buchung',
  notePlaceholder: 'Beschreibung hinzufügen…',
  saveRecurring: 'Wiederkehrende Buchung speichern',
  saveError: 'Wiederkehrende Buchung konnte nicht gespeichert werden.',
  errorAmount: 'Gib einen gültigen Betrag größer als null ein.',

  ruleLoadError: 'Wiederkehrende Buchung konnte nicht geladen werden.',
  occurrenceLoadError: 'Termin konnte nicht geladen werden.',

  ruleNotFound: 'Wiederkehrende Buchung nicht gefunden.',
  occurrenceNotFound: 'Wiederkehrender Termin nicht gefunden.',
  alreadyHandled: 'Dieser wiederkehrende Termin wurde bereits bearbeitet.',
  endedCannotEdit: 'Beendete wiederkehrende Buchungen können nicht bearbeitet werden.',
  endedCannotResume: 'Beendete wiederkehrende Buchungen können nicht fortgesetzt werden.',
  hasEnded: 'Diese wiederkehrende Buchung ist beendet.',
  missingExchangeRate: (currency: string, baseCurrency: string) =>
    `Füge einen Wechselkurs ${currency}/${baseCurrency} hinzu, bevor du diese Buchung ausführst.`,
  errorDateFormat: 'Gib ein gültiges Datum im Format JJJJ-MM-TT ein.',
  errorFrequency: 'Wähle eine unterstützte Häufigkeit.',
  errorInterval: 'Das Intervall muss eine positive ganze Zahl sein.',
  errorStartDate: 'Gib ein gültiges Startdatum ein.',
  errorEndDate: 'Gib ein gültiges Enddatum ein.',
  errorEndBeforeStart: 'Das Enddatum darf nicht vor dem Startdatum liegen.',
  errorCrossCurrencyTransfer: 'Wiederkehrende Umbuchungen zwischen verschiedenen Währungen werden nicht unterstützt.',
};
