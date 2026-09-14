import type { notifications as en, ReminderTiming } from '../en/notifications';
import { createPlural } from '../../plural';

const plural = createPlural('de');

const timingText = (timing: ReminderTiming) =>
  timing === 'upcoming' ? 'steht bald an' : timing === 'overdue' ? 'ist überfällig' : 'ist heute fällig';

export const notifications: typeof en = {
  channels: {
    recurringName: 'Wiederkehrende Erinnerungen',
    recurringDescription: 'Erinnerungen an fällige und anstehende wiederkehrende Buchungen',
    budgetsName: 'Budget-Warnungen',
    budgetsDescription: 'Warnungen, wenn Monatsbudgets ihr Limit fast oder ganz erreichen',
    creditCardsName: 'Kreditkarten-Erinnerungen',
    creditCardsDescription: 'Erinnerungen an Abrechnungsschluss und Fälligkeit',
    dailyName: 'Tägliche Erinnerungen',
    dailyDescription: 'Dezente Erinnerungen, deine Finanzen zu prüfen',
  },

  content: {
    reminderTitle: 'Money Control-Erinnerung',
    recurringPrivate: (timing) =>
      timing === 'upcoming'
        ? 'Eine anstehende wiederkehrende Buchung wartet auf deine Prüfung.'
        : timing === 'overdue'
          ? 'Eine überfällige wiederkehrende Buchung wartet auf deine Prüfung.'
          : 'Eine wiederkehrende Buchung wartet auf deine Prüfung.',
    recurringTransfer: (amount, timing) =>
      `Eine wiederkehrende Umbuchung über ${amount} ${timingText(timing)}.`,
    recurringCategory: (category, amount, timing) =>
      category
        ? `Die wiederkehrende Buchung ${category} über ${amount} ${timingText(timing)}.`
        : `Eine wiederkehrende Buchung über ${amount} ${timingText(timing)}.`,
    budgetReachedTitle: 'Budgetlimit erreicht',
    budgetNearingTitle: 'Budget fast ausgeschöpft',
    budgetReachedPrivate: 'Ein Budget hat sein Limit erreicht.',
    budgetNearingPrivate: 'Ein Budget ist fast ausgeschöpft.',
    budgetReachedDetail: (label, month) => `${label} hat das Budget für ${month} erreicht.`,
    budgetNearingDetail: (label, percent, month) =>
      `${label} hat ${percent} % des Budgets für ${month} verbraucht.`,
    dailyBody: 'Nimm dir kurz Zeit, deine Finanzen zu prüfen.',
    testTitle: 'Money Control-Test',
    testBody: 'Lokale Erinnerungen sind auf diesem Gerät bereit.',
    cardClosingTitle: 'Abrechnungsschluss steht bevor',
    cardDueTitle: 'Kreditkartenzahlung fällig',
    cardClosingPrivate: 'Eine Kreditkartenabrechnung schließt bald.',
    cardDuePrivate: 'Eine Kreditkartenzahlung ist bald fällig.',
    cardClosingDetail: (card, date) => `Die Abrechnung von ${card} schließt am ${date}.`,
    cardDueDetail: (card, amount, date) =>
      `${card}: noch ${amount} offen, fällig am ${date}.`,
  },

  settings: {
    title: 'Mitteilungen',
    loadingLabel: 'Mitteilungseinstellungen werden geladen',
    backLabel: 'Zurück aus den Mitteilungseinstellungen',
    allowTitle: 'Lokale Erinnerungen erlauben?',
    allowMessage: 'Money Control nutzt Android-Mitteilungen nur für die Erinnerungskategorien, die du auswählst. Keine Finanzdaten verlassen dieses Gerät.',
    continue: 'Weiter',
    notNow: 'Nicht jetzt',
    permissionSection: 'Android-Berechtigung',
    openAndroidSettings: 'Android-Einstellungen öffnen',
    enableNotifications: 'Mitteilungen aktivieren',
    enableTitle: 'Lokale Erinnerungen aktivieren?',
    enableMessage: 'Android fragt, ob Money Control die von dir gewählten Erinnerungen anzeigen darf.',
    pauseAll: 'Alle Erinnerungen pausieren',
    resume: 'Mitteilungen fortsetzen',
    categoriesSection: 'Erinnerungskategorien',
    recurringDescription: 'Fällige, überfällige und anstehende wiederkehrende Einträge',
    recurringLabel: 'Wiederkehrende Buchungen',
    reminderTime: 'Erinnerungszeit',
    advanceNotice: 'Vorlaufzeit',
    sameDay: 'Am selben Tag',
    advanceDays: (days) => `${days} ${plural(days, 'Tag', 'Tage')}`,
    budgetsDescription: 'Eine Warnung bei etwa 80 % und eine bei 100 %',
    budgetsLabel: 'Budgetschwellen',
    cardsDescription: 'Erinnerungen an Abrechnungsschluss und Fälligkeit',
    cardsLabel: 'Kreditkarten',
    closingDescription: 'Einen Tag vor dem berechneten Abrechnungsschluss',
    closingLabel: 'Abrechnungsschluss',
    paymentDueReminders: 'Erinnerungen an die Fälligkeit',
    dueThreeDaysDescription: 'Drei Tage vor der Fälligkeit der Abrechnung',
    dueThreeDaysLabel: '3 Tage vorher',
    dueOneDayDescription: 'Einen Tag vor der Fälligkeit der Abrechnung',
    dueOneDayLabel: '1 Tag vorher',
    dueTodayDescription: 'Am Tag der Fälligkeit der Abrechnung',
    dueTodayLabel: 'Heute fällig',
    dailyDescription: 'Ein dezenter täglicher Hinweis, deine Finanzen zu prüfen',
    dailyLabel: 'Tagesrückblick',
    dailyTime: 'Zeit der täglichen Erinnerung',
    privacySection: 'Datenschutz bei Mitteilungen',
    private: 'Privat',
    detailed: 'Detailliert',
    privacyDescription: 'Privat blendet Beträge, Konten, Kategorien, Salden und Notizen aus. Detailliert kann eine Kategorie und einen Betrag zeigen, aber nie Notizen oder vollständige Kontodaten.',
    appLockWarning: 'Die App-Sperre ist aktiviert. Private Mitteilungsinhalte werden für den Sperrbildschirm empfohlen.',
    testSection: 'Test und Zustellung',
    sendTest: 'Testmitteilung senden',
    cancelTest: 'Ausstehenden Test abbrechen',
    deliveryDescription: 'Erinnerungszeiten richten sich nach der lokalen Uhr des Geräts. Wiederkehrende Finanzdaten bleiben Kalenderdaten in Bogotá. Android kann die Zustellung im Doze-Modus oder durch die Akkuoptimierung verzögern.',
    attentionTitle: 'Einige Erinnerungen brauchen Aufmerksamkeit',
    attentionBody: 'Money Control konnte die letzte Aktualisierung der Mitteilungen nicht abschließen. Die Finanzdaten wurden normal gespeichert.',
    dismissMessage: 'Hinweis schließen',
    currentValue: (value) => `Aktueller Wert ${value}`,
    chooseTime: 'Lokale Uhrzeit wählen',
    hour: 'Stunde',
    minute: 'Minute',
    saveTime: (time) => `${time} speichern`,
    permissionGrantedTitle: 'Von Android erlaubt',
    permissionBlockedTitle: 'In den Android-Einstellungen blockiert',
    permissionDeniedTitle: 'Berechtigung abgelehnt',
    permissionUnavailableTitle: 'Mitteilungen nicht verfügbar',
    permissionNotEnabledTitle: 'Noch nicht aktiviert',
    permissionGrantedDescription: 'Android kann die lokalen Erinnerungskategorien anzeigen, die du unten aktivierst.',
    permissionBlockedDescription: 'Öffne die Android-Einstellungen, um Mitteilungen zu erlauben. Money Control funktioniert weiterhin normal.',
    permissionDeniedDescription: 'Du kannst es jederzeit erneut versuchen. Für die Nutzung der App ist keine Erinnerungsberechtigung nötig.',
    permissionUnavailableDescription: 'Diese Laufzeitumgebung kann keine Android-Mitteilungen planen. Die Finanzfunktionen sind nicht betroffen.',
    permissionNotEnabledDescription: 'Money Control fragt erst, wenn du lokale Erinnerungen aktivieren möchtest.',
  },

  results: {
    loadFailed: 'Die Mitteilungseinstellungen konnten nicht geladen werden.',
    changeFailed: 'Die Änderung der Mitteilungen konnte nicht abgeschlossen werden. Versuche es erneut.',
    permissionUpdated: 'Mitteilungsberechtigung aktualisiert.',
    paused: 'Alle Money Control-Erinnerungen sind pausiert.',
    reminderEnabled: 'Erinnerung aktiviert.',
    reminderDisabled: 'Erinnerung deaktiviert.',
    recurringTimeUpdated: 'Zeit der wiederkehrenden Erinnerung aktualisiert.',
    advanceUpdated: 'Vorlaufzeit aktualisiert.',
    dailyTimeUpdated: 'Zeit der täglichen Erinnerung aktualisiert.',
    privacyUpdated: 'Datenschutz bei Mitteilungen aktualisiert.',
    cardClosingUpdated: 'Erinnerung an den Abrechnungsschluss aktualisiert.',
    cardDueUpdated: 'Erinnerung an die Kartenfälligkeit aktualisiert.',
    testScheduled: 'Testmitteilung in etwa fünf Sekunden geplant.',
    testCanceled: 'Testmitteilung abgebrochen.',
  },
};
