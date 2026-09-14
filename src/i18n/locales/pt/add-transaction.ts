import type { addTransaction as en } from '../en/add-transaction';
import { createPlural } from '../../plural';

const plural = createPlural('pt');

export const addTransaction: typeof en = {
  title: 'Adicionar transação',
  close: 'Fechar Adicionar transação',
  unableToSave: 'Não foi possível salvar a transação.',
  missingPairRate: (currency: string, base: string) =>
    `Adicione uma taxa de câmbio ${currency}/${base} antes de salvar esta transação.`,
  referenceRate: (rate: string, date: string) =>
    `Taxa de referência ${rate} · data da taxa ${date}. Seu banco pode usar outra taxa.`,
  noRate: (currency: string, base: string) =>
    `Nenhuma taxa de câmbio disponível. Adicione uma taxa ${currency}/${base} em Mais → Moeda e câmbio antes de salvar.`,
  transferReducesDebt: 'Esta transferência reduz a dívida atual do cartão.',
  transferIncreasesDebt: 'Isso aumenta a dívida atual do cartão ou reduz o saldo credor.',
  selectAccount: 'Selecionar conta',
  selectSourceAccount: 'Selecionar conta de origem',
  selectDestinationAccount: 'Selecionar conta de destino',
  selectCategory: 'Selecionar categoria',
  selectExpenseCategory: 'Selecionar categoria de despesa',
  selectIncomeCategory: 'Selecionar categoria de receita',
  amountReceived: (currency: string) => `Valor recebido (${currency})`,
  amountReceivedA11y: (currency: string) => `Valor recebido em ${currency}`,
  estimateFromRate: 'Estimar pela taxa de referência',
  amountReceivedHelp: 'Informe o valor que seu banco realmente creditou. Os dois valores são salvos.',
  manageCategories: 'Gerenciar categorias',
  sourceAccount: 'Conta de origem',
  destinationAccount: 'Conta de destino',
  fromAccount: 'Conta de origem',
  toAccount: 'Conta de destino',
  transferDescription: 'Mova dinheiro entre duas contas diferentes',
  transactionDate: 'Data da transação',
  noteOptional: 'Observação (opcional)',
  noteA11y: 'Observação da transação, opcional',
  notePlaceholder: 'Adicione uma descrição…',
  transactionType: 'Tipo de transação',
  amount: 'Valor',
  amountIn: (currencyName: string) => `Valor em ${currencyName}`,
  upToTwoDecimals: 'Até 2 casas decimais',
  wholeUnitsOnly: 'Sem casas decimais',
  saving: 'Salvando…',
  save: {
    expense: 'Salvar despesa',
    income: 'Salvar receita',
    transfer: 'Salvar transferência',
  },
  saved: {
    expense: 'Despesa salva',
    income: 'Receita salva',
    transfer: 'Transferência salva',
  },
  accountPicker: {
    close: 'Fechar seletor de contas',
    empty: 'Nenhuma conta ativa ainda. Adicione uma conta primeiro e depois escolha-a aqui.',
    accountA11y: (name: string, type: string, balance: string) => `${name}, ${type}, saldo ${balance}`,
  },
  categoryGrid: {
    title: 'Categoria',
    viewAll: 'Ver todas',
    viewAllA11y: 'Ver todas as categorias',
    hasSubcategories: (count: number) => `Tem ${count} ${plural(count, 'subcategoria', 'subcategorias')}`,
    categoryA11y: (name: string) => `Categoria ${name}`,
    noActive: 'Nenhuma categoria ativa.',
    detail: (name: string) => `Detalhe de ${name}`,
    none: 'Nenhuma',
    noneA11y: (category: string) => `Sem subcategoria, somente ${category}`,
    subcategoryA11y: (subcategory: string, category: string) => `${subcategory}, subcategoria de ${category}`,
  },
  categoryPicker: {
    close: 'Fechar seletor de categorias',
    searchLabel: 'Buscar categorias',
    searchPlaceholder: 'Buscar categorias…',
    noMatches: (query: string) => `Nenhuma categoria corresponde a “${query}”.`,
    noActive: 'Nenhuma categoria ativa ainda.',
    subcategoryA11y: (subcategory: string, category: string) => `${subcategory}, subcategoria de ${category}`,
  },
};
