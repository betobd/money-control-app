import type { onboarding as en } from '../en/onboarding';

export const onboarding: typeof en = {
  tagline: 'Dein Geld – übersichtlich und privat.',
  highlights: {
    privateTitle: 'Privat von Grund auf',
    privateBody: 'Keine Registrierung. Deine Daten bleiben auf diesem Handy, außer du exportierst sie.',
    currencyTitle: 'Jede Währung',
    currencyBody: 'Führe Konten in deinen Währungen und sieh jede Summe in deiner eigenen.',
    budgetsTitle: 'Budgets, die dich auf Kurs halten',
    budgetsBody: 'Lege ein Monatslimit und Kategorielimits fest und sieh, wohin dein Geld geht.',
  },
  getStarted: 'Los geht’s',
  restore: 'Backup wiederherstellen',
  languageButton: (languageName) => `Sprache: ${languageName}`,
  languageSheetTitle: 'Sprache',
  currencyTitle: 'Hauptwährung',
  backToWelcome: 'Zurück zur Begrüßung',
  currencyQuestion: 'Welche Währung nutzt du im Alltag?',
  currencyBody: 'Summen, Budgets und Berichte werden in dieser Währung angezeigt. Konten in anderen Währungen sind trotzdem möglich.',
  currencyCardLabel: (code, name) => `Hauptwährung: ${code}, ${name}`,
  currencyCardHint: 'Öffnet die Währungsliste',
  change: 'Ändern',
  lockNote: 'Du kannst sie ändern, bis du deine erste Buchung oder dein erstes Budget anlegst. Danach bleibt sie fest, weil alle Beträge darin gespeichert werden.',
  saveFailed: 'Deine Währung konnte nicht gespeichert werden. Bitte versuche es erneut.',
  start: (code) => `${code} verwenden und starten`,
  suggested: 'Vorschläge',
  baseCurrency: {
    unsupported: 'Wähle eine unterstützte Währung.',
    missing: 'Die App-Einstellungen fehlen in der Datenbank.',
    lockedByHistory: (count) =>
      count === 1
        ? 'Deine Buchung speichert ihren Wert in der aktuellen Hauptwährung. Eine Änderung würde eine Neuberechnung mit historischen Wechselkursen erfordern, die nicht gespeichert werden.'
        : `Alle deine ${count} Buchungen speichern ihren Wert in der aktuellen Hauptwährung. Eine Änderung würde eine Neuberechnung mit historischen Wechselkursen erfordern, die nicht gespeichert werden.`,
    lockedByBudgets: (count) =>
      count === 1
        ? 'Dein Budget ist in der aktuellen Hauptwährung festgelegt. Lösche es, um eine andere Hauptwährung zu wählen.'
        : `Deine ${count} Budgets sind in der aktuellen Hauptwährung festgelegt. Lösche sie, um eine andere Hauptwährung zu wählen.`,
  },
};
