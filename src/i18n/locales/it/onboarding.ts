import type { onboarding as en } from '../en/onboarding';

export const onboarding: typeof en = {
  tagline: 'I tuoi soldi, chiari e privati.',
  highlights: {
    privateTitle: 'Privata per scelta',
    privateBody: 'Nessuna registrazione. I tuoi dati restano su questo telefono, a meno che tu non li esporti.',
    currencyTitle: 'Qualsiasi valuta',
    currencyBody: 'Tieni conti nelle valute che usi e vedi ogni totale nella tua.',
    budgetsTitle: 'Budget che ti tengono in carreggiata',
    budgetsBody: 'Imposta un tetto mensile e limiti per categoria, e scopri dove vanno i tuoi soldi.',
  },
  getStarted: 'Inizia',
  restore: 'Ripristina un backup',
  languageButton: (languageName) => `Lingua: ${languageName}`,
  languageSheetTitle: 'Lingua',
  currencyTitle: 'Valuta principale',
  backToWelcome: 'Torna al benvenuto',
  currencyQuestion: 'Quale valuta usi ogni giorno?',
  currencyBody: 'Totali, budget e report vengono mostrati in questa valuta. Puoi comunque avere conti in altre valute.',
  currencyCardLabel: (code, name) => `Valuta principale: ${code}, ${name}`,
  currencyCardHint: "Apre l'elenco delle valute",
  change: 'Cambia',
  lockNote: 'Puoi cambiarla finché non registri il primo movimento o budget. Dopo resta fissa, perché tutti gli importi vengono salvati in questa valuta.',
  saveFailed: 'Impossibile salvare la valuta. Riprova.',
  start: (code) => `Usa ${code} e inizia`,
  suggested: 'Suggerite',
  baseCurrency: {
    unsupported: 'Seleziona una valuta supportata.',
    missing: "Le impostazioni dell'app mancano nel database.",
    lockedByHistory: (count) =>
      count === 1
        ? 'Il tuo movimento salva il suo valore nella valuta principale attuale. Cambiarla richiederebbe di ricalcolarlo con tassi di cambio storici, che non vengono conservati.'
        : `Tutti i tuoi ${count} movimenti salvano il loro valore nella valuta principale attuale. Cambiarla richiederebbe di ricalcolarli con tassi di cambio storici, che non vengono conservati.`,
    lockedByBudgets: (count) =>
      count === 1
        ? 'Il tuo budget è impostato nella valuta principale attuale. Eliminalo per scegliere un’altra valuta principale.'
        : `I tuoi ${count} budget sono impostati nella valuta principale attuale. Eliminali per scegliere un’altra valuta principale.`,
  },
};
