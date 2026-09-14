import type { more as en } from '../en/more';

export const more: typeof en = {
  title: 'Altro',
  closeLabel: 'Chiudi Altro',
  items: {
    security: {
      label: 'Sicurezza',
      description: 'PIN, biometria e blocco automatico',
      accessibilityLabel: 'Apri le impostazioni di sicurezza',
      accessibilityHint: "Configura PIN, biometria del dispositivo e blocco automatico dell'app",
    },
    notifications: {
      label: 'Notifiche',
      description: 'Promemoria locali e privacy delle notifiche',
      accessibilityLabel: 'Apri le impostazioni delle notifiche',
      accessibilityHint: 'Configura i promemoria locali per ricorrenze, budget e giornalieri',
    },
    backup: {
      label: 'Backup e ripristino',
      description: 'Esegui o ripristina una copia locale completa',
      accessibilityLabel: 'Apri backup e ripristino',
      accessibilityHint: 'Crea un backup locale o sostituisci i dati locali da un file di backup',
    },
    dataExport: {
      label: 'Esporta dati',
      description: "File CSV leggibili per l'analisi e la condivisione",
      accessibilityLabel: "Apri l'esportazione dei dati",
      accessibilityHint: 'Crea file CSV leggibili per fogli di calcolo, analisi e condivisione',
    },
    investments: {
      label: 'Investimenti',
      description: 'Segui saldi, valutazioni e rendimento stimato',
      accessibilityLabel: 'Apri investimenti',
      accessibilityHint: 'Consulta conti di investimento, valutazioni e guadagno o perdita stimati',
    },
    reports: {
      label: 'Report',
      description: 'Esplora flussi di cassa, categorie e patrimonio netto',
      accessibilityLabel: 'Apri i report',
      accessibilityHint: 'Consulta entrate, uscite, categorie, patrimonio netto e confronti tra periodi',
    },
    currency: {
      label: 'Valuta e tassi',
      description: 'Valuta principale e tassi di cambio',
      accessibilityLabel: 'Apri valuta e tassi',
      accessibilityHint: 'Consulta la valuta principale e i tassi di cambio',
    },
    categories: {
      label: 'Categorie',
      description: 'Gestisci le categorie di uscite ed entrate',
      accessibilityLabel: 'Gestisci categorie',
      accessibilityHint: 'Crea, modifica, archivia e ripristina le categorie',
    },
    recurring: {
      label: 'Movimenti ricorrenti',
      description: 'Controlla, conferma, sospendi e pianifica',
      accessibilityLabel: 'Gestisci movimenti ricorrenti',
      accessibilityHint: 'Consulta i movimenti da registrare e gestisci le regole ricorrenti',
    },
    language: {
      label: 'Lingua',
      accessibilityLabel: 'Cambia lingua',
      accessibilityHint: "Scegli la lingua dell'app",
    },
  },
  language: {
    title: 'Lingua',
    intro: "Scegli la lingua dell'app. Anche le categorie predefinite che non hai rinominato vengono tradotte.",
    deviceOption: 'Come il dispositivo',
    deviceDetail: (languageName) => `Attuale: ${languageName}`,
    selectedHint: 'Selezionata',
    changeFailed: 'Impossibile cambiare la lingua. Riprova.',
  },
};
