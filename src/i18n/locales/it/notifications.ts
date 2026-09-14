import type { notifications as en, ReminderTiming } from '../en/notifications';
import { createPlural } from '../../plural';

const plural = createPlural('it');

// Masculine: agrees with "movimento" and "trasferimento".
const timingText = (timing: ReminderTiming) =>
  timing === 'upcoming' ? 'è in arrivo' : timing === 'overdue' ? 'è scaduto' : 'scade oggi';

export const notifications: typeof en = {
  channels: {
    recurringName: 'Promemoria ricorrenti',
    recurringDescription: 'Promemoria dei movimenti ricorrenti da registrare e in arrivo',
    budgetsName: 'Avvisi di budget',
    budgetsDescription: 'Avvisi quando i budget mensili si avvicinano o raggiungono il limite',
    creditCardsName: 'Promemoria carte di credito',
    creditCardsDescription: 'Promemoria di chiusura dell’estratto conto e di scadenza del pagamento',
    dailyName: 'Promemoria giornalieri',
    dailyDescription: 'Promemoria discreti per controllare le tue finanze',
  },

  content: {
    reminderTitle: 'Promemoria di Money Control',
    recurringPrivate: (timing) =>
      timing === 'upcoming'
        ? 'Hai un movimento ricorrente in arrivo da controllare.'
        : timing === 'overdue'
          ? 'Hai un movimento ricorrente scaduto da controllare.'
          : 'Hai un movimento ricorrente da controllare.',
    recurringTransfer: (amount, timing) =>
      `Un trasferimento ricorrente di ${amount} ${timingText(timing)}.`,
    recurringCategory: (category, amount, timing) =>
      category
        ? `Il movimento ricorrente ${category} di ${amount} ${timingText(timing)}.`
        : `Un movimento ricorrente di ${amount} ${timingText(timing)}.`,
    budgetReachedTitle: 'Limite di budget raggiunto',
    budgetNearingTitle: 'Budget vicino al limite',
    budgetReachedPrivate: 'Un budget ha raggiunto il limite.',
    budgetNearingPrivate: 'Un budget è vicino al limite.',
    budgetReachedDetail: (label, month) => `${label} ha raggiunto il budget di ${month}.`,
    budgetNearingDetail: (label, percent, month) =>
      `${label} ha usato il ${percent}% del budget di ${month}.`,
    dailyBody: 'Prenditi un momento per controllare le tue finanze.',
    testTitle: 'Test di Money Control',
    testBody: 'I promemoria locali sono pronti su questo dispositivo.',
    cardClosingTitle: 'Estratto conto in chiusura',
    cardDueTitle: 'Pagamento carta in scadenza',
    cardClosingPrivate: 'L’estratto conto di una carta di credito chiude a breve.',
    cardDuePrivate: 'Il pagamento di una carta di credito scade a breve.',
    cardClosingDetail: (card, date) => `L’estratto conto di ${card} chiude il ${date}.`,
    cardDueDetail: (card, amount, date) =>
      `${card}: ${amount} da pagare, scadenza il ${date}.`,
  },

  settings: {
    title: 'Notifiche',
    loadingLabel: 'Caricamento delle impostazioni delle notifiche',
    backLabel: 'Indietro dalle impostazioni delle notifiche',
    allowTitle: 'Consentire i promemoria locali?',
    allowMessage: 'Money Control usa le notifiche di Android solo per le categorie di promemoria che scegli. Nessun dato finanziario lascia questo dispositivo.',
    continue: 'Continua',
    notNow: 'Non ora',
    permissionSection: 'Autorizzazione Android',
    openAndroidSettings: 'Apri impostazioni Android',
    enableNotifications: 'Attiva notifiche',
    enableTitle: 'Attivare i promemoria locali?',
    enableMessage: 'Android ti chiederà se Money Control può mostrare i promemoria che scegli.',
    pauseAll: 'Sospendi tutti i promemoria',
    resume: 'Riprendi notifiche',
    categoriesSection: 'Categorie di promemoria',
    recurringDescription: 'Elementi ricorrenti da registrare, scaduti e in arrivo',
    recurringLabel: 'Movimenti ricorrenti',
    reminderTime: 'Ora del promemoria',
    advanceNotice: 'Preavviso',
    sameDay: 'Stesso giorno',
    advanceDays: (days) => `${days} ${plural(days, 'giorno', 'giorni')}`,
    budgetsDescription: 'Un avviso vicino all’80% e uno al 100%',
    budgetsLabel: 'Soglie di budget',
    cardsDescription: 'Promemoria di chiusura dell’estratto conto e di scadenza del pagamento',
    cardsLabel: 'Carte di credito',
    closingDescription: 'Un giorno prima della data di chiusura calcolata',
    closingLabel: 'Promemoria di chiusura',
    paymentDueReminders: 'Promemoria di scadenza',
    dueThreeDaysDescription: 'Tre giorni prima della scadenza dell’estratto conto',
    dueThreeDaysLabel: '3 giorni prima',
    dueOneDayDescription: 'Un giorno prima della scadenza dell’estratto conto',
    dueOneDayLabel: '1 giorno prima',
    dueTodayDescription: 'Il giorno di scadenza dell’estratto conto',
    dueTodayLabel: 'Scade oggi',
    dailyDescription: 'Un avviso quotidiano e discreto per controllare le tue finanze',
    dailyLabel: 'Controllo giornaliero',
    dailyTime: 'Ora del promemoria giornaliero',
    privacySection: 'Privacy delle notifiche',
    private: 'Privato',
    detailed: 'Dettagliato',
    privacyDescription: 'Privato nasconde importi, conti, categorie, saldi e note. Dettagliato può mostrare una categoria e un importo, ma mai note o dati completi del conto.',
    appLockWarning: 'Il blocco app è attivo. Per la privacy della schermata di blocco è consigliato il contenuto privato.',
    testSection: 'Test e consegna',
    sendTest: 'Invia notifica di prova',
    cancelTest: 'Annulla prova in attesa',
    deliveryDescription: 'Gli orari dei promemoria seguono l’orologio locale del dispositivo. Le date finanziarie ricorrenti restano date del calendario di Bogotá. Android può ritardare la consegna durante Doze o l’ottimizzazione della batteria.',
    attentionTitle: 'Alcuni promemoria richiedono attenzione',
    attentionBody: 'Money Control non è riuscito a completare l’ultimo aggiornamento delle notifiche. I dati finanziari sono stati salvati normalmente.',
    dismissMessage: 'Chiudi messaggio',
    currentValue: (value) => `Valore attuale ${value}`,
    chooseTime: 'Scegli l’ora locale',
    hour: 'Ora',
    minute: 'Minuto',
    saveTime: (time) => `Salva ${time}`,
    permissionGrantedTitle: 'Consentito da Android',
    permissionBlockedTitle: 'Bloccato nelle impostazioni Android',
    permissionDeniedTitle: 'Autorizzazione negata',
    permissionUnavailableTitle: 'Notifiche non disponibili',
    permissionNotEnabledTitle: 'Non ancora attive',
    permissionGrantedDescription: 'Android può mostrare le categorie di promemoria locali che attivi qui sotto.',
    permissionBlockedDescription: 'Apri le impostazioni Android per consentire le notifiche. Money Control continua a funzionare normalmente.',
    permissionDeniedDescription: 'Puoi riprovare quando vuoi. Per usare l’app non serve l’autorizzazione ai promemoria.',
    permissionUnavailableDescription: 'Questo ambiente non può programmare notifiche Android. Le funzioni finanziarie non sono interessate.',
    permissionNotEnabledDescription: 'Money Control chiederà l’autorizzazione solo quando deciderai di attivare i promemoria locali.',
  },

  results: {
    loadFailed: 'Impossibile caricare le impostazioni delle notifiche.',
    changeFailed: 'Impossibile completare la modifica delle notifiche. Riprova.',
    permissionUpdated: 'Autorizzazione alle notifiche aggiornata.',
    paused: 'Tutti i promemoria di Money Control sono sospesi.',
    reminderEnabled: 'Promemoria attivato.',
    reminderDisabled: 'Promemoria disattivato.',
    recurringTimeUpdated: 'Ora del promemoria ricorrente aggiornata.',
    advanceUpdated: 'Preavviso aggiornato.',
    dailyTimeUpdated: 'Ora del promemoria giornaliero aggiornata.',
    privacyUpdated: 'Privacy delle notifiche aggiornata.',
    cardClosingUpdated: 'Promemoria di chiusura della carta aggiornato.',
    cardDueUpdated: 'Promemoria di scadenza della carta aggiornato.',
    testScheduled: 'Notifica di prova programmata tra circa cinque secondi.',
    testCanceled: 'Notifica di prova annullata.',
  },
};
