import type { addTransaction as en } from '../en/add-transaction';
import { createPlural } from '../../plural';

const plural = createPlural('it');

export const addTransaction: typeof en = {
  title: 'Aggiungi movimento',
  close: 'Chiudi Aggiungi movimento',
  unableToSave: 'Impossibile salvare il movimento.',
  missingPairRate: (currency: string, base: string) =>
    `Aggiungi un tasso di cambio ${currency}/${base} prima di salvare questo movimento.`,
  referenceRate: (rate: string, date: string) =>
    `Tasso di riferimento ${rate} · data del tasso ${date}. La tua banca potrebbe usare un tasso diverso.`,
  noRate: (currency: string, base: string) =>
    `Nessun tasso di cambio disponibile. Aggiungi un tasso ${currency}/${base} in Altro → Valuta e tassi prima di salvare.`,
  transferReducesDebt: 'Questo trasferimento riduce il debito attuale della carta.',
  transferIncreasesDebt: 'Questo aumenta il debito attuale della carta o riduce un saldo a credito.',
  selectAccount: 'Seleziona conto',
  selectSourceAccount: 'Seleziona conto di origine',
  selectDestinationAccount: 'Seleziona conto di destinazione',
  selectCategory: 'Seleziona categoria',
  selectExpenseCategory: 'Seleziona categoria di uscita',
  selectIncomeCategory: 'Seleziona categoria di entrata',
  amountReceived: (currency: string) => `Importo ricevuto (${currency})`,
  amountReceivedA11y: (currency: string) => `Importo ricevuto in ${currency}`,
  estimateFromRate: 'Stima con il tasso di riferimento',
  amountReceivedHelp: 'Inserisci l’importo effettivamente accreditato dalla banca. Vengono salvati entrambi gli importi.',
  manageCategories: 'Gestisci categorie',
  sourceAccount: 'Conto di origine',
  destinationAccount: 'Conto di destinazione',
  fromAccount: 'Dal conto',
  toAccount: 'Al conto',
  transferDescription: 'Sposta denaro tra due conti diversi',
  transactionDate: 'Data del movimento',
  noteOptional: 'Nota (facoltativa)',
  noteA11y: 'Nota del movimento, facoltativa',
  notePlaceholder: 'Aggiungi una descrizione…',
  transactionType: 'Tipo di movimento',
  amount: 'Importo',
  amountIn: (currencyName: string) => `Importo in ${currencyName}`,
  upToTwoDecimals: 'Fino a 2 decimali',
  wholeUnitsOnly: 'Senza decimali',
  saving: 'Salvataggio…',
  save: {
    expense: 'Salva uscita',
    income: 'Salva entrata',
    transfer: 'Salva trasferimento',
  },
  saved: {
    expense: 'Uscita salvata',
    income: 'Entrata salvata',
    transfer: 'Trasferimento salvato',
  },
  accountPicker: {
    close: 'Chiudi selezione conto',
    empty: 'Ancora nessun conto attivo. Aggiungi prima un conto, poi sceglilo qui.',
    accountA11y: (name: string, type: string, balance: string) => `${name}, ${type}, saldo ${balance}`,
  },
  categoryGrid: {
    title: 'Categoria',
    viewAll: 'Vedi tutte',
    viewAllA11y: 'Vedi tutte le categorie',
    hasSubcategories: (count: number) => `Ha ${count} ${plural(count, 'sottocategoria', 'sottocategorie')}`,
    categoryA11y: (name: string) => `Categoria ${name}`,
    noActive: 'Nessuna categoria attiva.',
    detail: (name: string) => `Dettaglio ${name}`,
    none: 'Nessuna',
    noneA11y: (category: string) => `Nessuna sottocategoria, solo ${category}`,
    subcategoryA11y: (subcategory: string, category: string) => `${subcategory}, sottocategoria di ${category}`,
  },
  categoryPicker: {
    close: 'Chiudi selezione categoria',
    searchLabel: 'Cerca categorie',
    searchPlaceholder: 'Cerca categorie…',
    noMatches: (query: string) => `Nessuna categoria corrisponde a “${query}”.`,
    noActive: 'Ancora nessuna categoria attiva.',
    subcategoryA11y: (subcategory: string, category: string) => `${subcategory}, sottocategoria di ${category}`,
  },
};
