import type { dataExport as en } from '../en/data-export';
import { createPlural } from '../../plural';

const plural = createPlural('de');

export const dataExport: typeof en = {
  title: 'Datenexport',
  sizeBytes: (bytes: number) => `ca. ${bytes} B`,
  sizeKib: (kib: number) => `ca. ${kib} KiB`,
  sizeMib: (mib: string) => `ca. ${mib} MiB`,
  confirmMessage: (detail: string) =>
    `CSV-Dateien können sensible Finanzdaten enthalten. Jeder mit Zugriff auf die Datei kann sie lesen. Die App-Sperre schützt die Datei nicht mehr, sobald sie Money Control verlässt.${detail ? `\n\n${detail}` : ''}`,
  confirmLabel: 'Weiter',
  warningTitle: 'Unverschlüsselte Finanzdaten',
  warningBody: 'CSV-Dateien sind für alle lesbar, die Zugriff darauf haben. Sie sind für Tabellen, Analysen und zum Teilen gedacht – nicht zur vollständigen Wiederherstellung der App.',
  notBackupTitle: 'CSV ist kein Backup',
  notBackupBody: 'Willst du Money Control später wiederherstellen? Backup & Wiederherstellung bewahrt IDs und Beziehungen in versioniertem JSON. CSV lässt sich nicht wiederherstellen.',
  openBackupHint: 'Öffnet die Backup-Funktion zur vollständigen Wiederherstellung',
  openBackupLabel: 'Backup und Wiederherstellung öffnen',
  openBackupButton: 'Backup öffnen',
  recordCount: (count: number) => `${count} ${plural(count, 'Eintrag', 'Einträge')}`,
  emptyCard: 'Hier gibt es noch nichts zu exportieren – diese CSV hätte keine Zeilen.',
  notRestorable: 'Lesbare CSV · Kein wiederherstellbares Backup',
  notesPrivacy: 'Standardmäßig aus, zum Schutz der unverschlüsselten Datei.',
  footerNote: 'Dateien werden lokal erstellt, einzeln geteilt und aus dem temporären Cache von Money Control entfernt, sobald der Dialog geschlossen wird. Money Control lädt keine Daten hoch.',

  transactionsTitle: 'Buchungen',
  transactionsDescription: 'Lesbare Buchungszeilen mit Quell- und Zielkonto, Kategorie, Status, Datum und optionalen Notizen.',
  filterDate: (range: string) => `Datum: ${range}`,
  filterType: (value: string) => `Typ: ${value}`,
  filterStatus: (value: string) => `Status: ${value}`,
  filterAccount: (value: string) => `Konto: ${value}`,
  filterCategory: (value: string) => `Kategorie: ${value}`,
  allTypes: 'Alle',
  allStatuses: 'Alle',
  allAccounts: 'Alle',
  allCategories: 'Alle',
  typeValues: {
    expense: 'Ausgabe',
    income: 'Einnahme',
    transfer: 'Umbuchung',
    refund: 'Erstattung',
  },
  statusValues: {
    posted: 'gebucht',
    voided: 'storniert',
  },
  activeFilters: (count: number, size: string) =>
    `${count} ${plural(count, 'aktiver Filter', 'aktive Filter')} · ${size}`,
  configureFiltersLabel: 'Filter für den Buchungsexport festlegen',
  configureFilters: 'Filter festlegen',
  includeTransactionNotes: 'Buchungsnotizen einschließen',
  noTransactionsMatch: 'Keine Buchungen entsprechen den gewählten Filtern.',
  largeExport: 'Großer Export: Das Erstellen kann länger dauern und mehr Speicher benötigen.',
  transactionLimitExceeded: 'Grenze die Filter ein. Das Sicherheitslimit von 50.000 Zeilen ist überschritten, und es wird keine unvollständige Datei erstellt.',
  exportTransactionsButton: 'Buchungen als CSV',
  exportTransactionsTitle: 'Buchungen exportieren?',
  transactionNotesIncluded: 'Buchungsnotizen sind aktiviert und werden eingeschlossen.',
  transactionNotesExcluded: 'Buchungsnotizen werden nicht eingeschlossen.',

  accountsTitle: 'Konten',
  accountsDescription: 'Aktive und archivierte Konten mit Anfangssaldo und berechnetem aktuellem Saldo. Kartenschulden folgen dem bestehenden Modell mit Vorzeichen.',
  accountsCaption: 'Enthält alle Kontotypen. Spalten nur für Kreditkarten bleiben bei anderen Konten leer.',
  exportAccountsButton: 'Konten als CSV',
  exportAccountsTitle: 'Konten exportieren?',

  budgetsTitle: 'Budgets',
  budgetsDescription: 'Monatliche Limits mit denselben berechneten Ausgaben, Restbeträgen, Prozentsätzen und Status wie unter Budgets.',
  previousBudgetMonth: 'Vorheriger Budgetmonat',
  nextBudgetMonth: 'Nächster Budgetmonat',
  selectedBudgetMonth: (month: string) => `Ausgewählter Budgetmonat: ${month}`,
  exportBudgetsButton: 'Budgets als CSV',
  exportBudgetsTitle: 'Budgets exportieren?',

  recurringTitle: 'Wiederkehrende Buchungen',
  recurringDescription: 'Nur wiederkehrende Vorlagen: Zeitplan, Status, Konten, Kategorie, Betrag und optionale Notiz. Der Export erzeugt nie Ausführungen oder Buchungen.',
  includeRecurringNotes: 'Notizen der Regeln einschließen',
  exportRecurringButton: 'Regeln als CSV',
  exportRecurringTitle: 'Wiederkehrende Regeln exportieren?',
  recurringNotesIncluded: 'Notizen der wiederkehrenden Regeln sind aktiviert und werden eingeschlossen.',
  recurringNotesExcluded: 'Notizen der wiederkehrenden Regeln werden nicht eingeschlossen.',

  statementsTitle: 'Kreditkartenabrechnungen',
  statementsDescription: 'Frühere Abrechnungen mit Saldo und Mindestbetrag laut Bank, zugeordneten Zahlungen, Restbeträgen und Status.',
  statementsCaption: 'Kartennummern, CVV, Ablaufdaten, abgeleitete Ratenzahlungen oder Zugangsdaten werden weder gespeichert noch exportiert.',
  exportStatementsButton: 'Abrechnungen als CSV',
  exportStatementsTitle: 'Kreditkartenabrechnungen exportieren?',

  reportTitle: 'Berichtsübersicht',
  reportDescription: 'Eine Zeile pro Kennzahl, mit denselben gespeicherten Zeiträumen und Finanzregeln wie unter Berichte.',
  exportReportButton: 'Übersicht als CSV',
  exportReportTitle: 'Berichtsübersicht exportieren?',

  investmentsTitle: 'Geldanlagen',
  investmentsDescription: 'Anlagekonten mit aktuellem Wert, Netto-Einzahlungen, geschätztem Gewinn/Verlust, einfacher Rendite und geschätztem Wert in deiner Hauptwährung (leer, wenn kein Wechselkurs vorliegt). Archivierte Geldanlagen sind enthalten.',
  investmentsCaption: 'Die Werte beruhen auf der letzten manuellen Bewertung; nicht realisierter Gewinn/Verlust zählt nie als Einnahme.',
  exportInvestmentsButton: 'Geldanlagen als CSV',
  exportInvestmentsTitle: 'Geldanlagen exportieren?',

  valuationsTitle: 'Bewertungen von Geldanlagen',
  valuationsDescription: 'Vollständiger Verlauf der manuellen Bewertungen jedes Anlagekontos: Datum, Währung, Wert und optionale Notiz.',
  valuationsCaption: 'Eine Zeile pro erfasster Bewertung über alle Anlagekonten.',
  exportValuationsButton: 'Bewertungen als CSV',
  exportValuationsTitle: 'Bewertungen exportieren?',

  unconfirmedCopy: (message: string) => `${message} Money Control kann nicht bestätigen, dass eine Kopie am Ziel gespeichert wurde.`,
  exportFailed: 'Der CSV-Export konnte nicht abgeschlossen werden. Deine Finanzdaten wurden nicht geändert. Versuche es erneut.',
  overviewFailed: 'Die Anzahl für den Export konnte nicht geladen werden. Öffne diesen Bildschirm erneut.',
  exportSucceeded: (fileName: string, rowCount: number, formattedRowCount: string) =>
    `${fileName} wurde mit ${formattedRowCount} ${plural(rowCount, 'Zeile', 'Zeilen')} erstellt. Der Dialog zum Speichern/Teilen wurde geschlossen; Money Control kann nicht erkennen, ob du gespeichert, geteilt oder abgebrochen hast.`,

  noData: {
    transactions: 'Keine Buchungen entsprechen den gewählten Optionen.',
    accounts: 'Keine Konten entsprechen den gewählten Optionen.',
    budgets: 'Keine Budgets entsprechen den gewählten Optionen.',
    recurringRules: 'Keine wiederkehrenden Regeln entsprechen den gewählten Optionen.',
    creditCardStatements: 'Keine Kreditkartenabrechnungen entsprechen den gewählten Optionen.',
    investments: 'Keine Geldanlagen entsprechen den gewählten Optionen.',
    investmentValuations: 'Keine Bewertungen entsprechen den gewählten Optionen.',
  },
  rowLimitExceeded: (count: string, maximum: string) =>
    `Dieser Export enthält ${count} Zeilen und überschreitet das Sicherheitslimit von ${maximum} Zeilen. Grenze Zeitraum oder Filter ein und versuche es erneut.`,

  writeFailed: 'Die CSV-Datei konnte nicht erstellt werden. Prüfe den Gerätespeicher und versuche es erneut.',
  sharingUnavailable: 'Die CSV-Datei wurde erstellt, aber der Android-Dialog zum Speichern/Teilen ist nicht verfügbar.',
  sharingOpenFailed: 'Die CSV-Datei wurde erstellt, aber der Android-Dialog zum Speichern/Teilen konnte nicht geöffnet werden.',
  shareFailed: 'Die CSV-Datei wurde erstellt, konnte aber nicht geteilt werden.',
  shareDialogTitle: 'Money-Control-CSV speichern oder teilen',
};
