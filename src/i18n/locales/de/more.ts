import type { more as en } from '../en/more';

export const more: typeof en = {
  title: 'Mehr',
  closeLabel: 'Mehr schließen',
  items: {
    security: {
      label: 'Sicherheit',
      description: 'PIN, Biometrie und automatische Sperre',
      accessibilityLabel: 'Sicherheitseinstellungen öffnen',
      accessibilityHint: 'PIN, Geräte-Biometrie und automatische App-Sperre einrichten',
    },
    notifications: {
      label: 'Mitteilungen',
      description: 'Lokale Erinnerungen und Datenschutz',
      accessibilityLabel: 'Mitteilungseinstellungen öffnen',
      accessibilityHint: 'Lokale Erinnerungen für wiederkehrende Buchungen, Budgets und den Tag einrichten',
    },
    backup: {
      label: 'Backup & Wiederherstellung',
      description: 'Vollständige lokale Kopie sichern oder wiederherstellen',
      accessibilityLabel: 'Backup und Wiederherstellung öffnen',
      accessibilityHint: 'Lokales Backup erstellen oder lokale Daten aus einer Backup-Datei ersetzen',
    },
    dataExport: {
      label: 'Datenexport',
      description: 'Lesbare CSV-Dateien zum Auswerten und Teilen',
      accessibilityLabel: 'Datenexport öffnen',
      accessibilityHint: 'Lesbare CSV-Dateien für Tabellen, Auswertungen und zum Teilen erstellen',
    },
    investments: {
      label: 'Geldanlagen',
      description: 'Salden, Bewertungen und geschätzte Rendite verfolgen',
      accessibilityLabel: 'Geldanlagen öffnen',
      accessibilityHint: 'Anlagekonten, Bewertungen und geschätzten Gewinn oder Verlust ansehen',
    },
    reports: {
      label: 'Berichte',
      description: 'Cashflow, Kategorien und Nettovermögen auswerten',
      accessibilityLabel: 'Berichte öffnen',
      accessibilityHint: 'Einnahmen, Ausgaben, Kategorien, Nettovermögen und Zeitraumvergleiche ansehen',
    },
    currency: {
      label: 'Währung & Kurse',
      description: 'Hauptwährung und Wechselkurse',
      accessibilityLabel: 'Währung und Kurse öffnen',
      accessibilityHint: 'Hauptwährung und Wechselkurse ansehen',
    },
    categories: {
      label: 'Kategorien',
      description: 'Ausgaben- und Einnahmekategorien verwalten',
      accessibilityLabel: 'Kategorien verwalten',
      accessibilityHint: 'Kategorien erstellen, bearbeiten, archivieren und wiederherstellen',
    },
    recurring: {
      label: 'Wiederkehrende Buchungen',
      description: 'Prüfen, bestätigen, pausieren und planen',
      accessibilityLabel: 'Wiederkehrende Buchungen verwalten',
      accessibilityHint: 'Fällige Buchungen prüfen und wiederkehrende Regeln verwalten',
    },
    language: {
      label: 'Sprache',
      accessibilityLabel: 'Sprache ändern',
      accessibilityHint: 'Sprache der App auswählen',
    },
  },
  language: {
    title: 'Sprache',
    intro: 'Wähle die Sprache der App. Standardkategorien, die du nicht umbenannt hast, werden ebenfalls übersetzt.',
    deviceOption: 'Wie auf dem Gerät',
    deviceDetail: (languageName) => `Aktuell: ${languageName}`,
    selectedHint: 'Ausgewählt',
    changeFailed: 'Die Sprache konnte nicht geändert werden. Bitte versuche es erneut.',
  },
};
