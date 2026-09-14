import type { refunds as en } from '../en/refunds';

export const refunds: typeof en = {
  title: 'Adicionar reembolso',
  cancel: 'Cancelar reembolso',
  loadingExpense: 'Carregando despesa…',
  expenseNotFound: 'Despesa não encontrada.',
  originalExpense: 'Despesa original',
  expenseFallback: 'Despesa',
  gross: 'Bruto',
  refunded: 'Reembolsado',
  remaining: 'Restante',
  explanation: (account: string) =>
    `Um reembolso reduz as despesas e devolve o dinheiro para ${account}. Não é uma receita.`,
  amountLabel: (currency: string) => `Valor do reembolso (${currency})`,
  amountA11y: (currencyName: string) => `Valor do reembolso em ${currencyName}`,
  maximumRefundable: (amount: string) => `Máximo reembolsável: ${amount}`,
  foreignRateNote: (currency: string, base: string) =>
    `Um reembolso em ${currency} usa a taxa de referência ${currency}/${base} salva atualmente. Seu banco pode usar outra taxa.`,
  date: 'Data do reembolso',
  noteOptional: 'Observação (opcional)',
  noteA11y: 'Observação do reembolso, opcional',
  notePlaceholder: 'Estorno da loja, correção…',
  save: 'Salvar reembolso',
  errors: {
    validationFailed: 'Não foi possível validar o reembolso.',
    missingRate: (currency: string, base: string) =>
      `Adicione uma taxa de câmbio ${currency}/${base} antes de salvar este reembolso.`,
    unableToSave: 'Não foi possível salvar o reembolso.',
    unableToLoadSummary: 'Não foi possível carregar os detalhes do reembolso.',
    originalNotFound: 'A despesa original não existe mais.',
    notPostedExpense: 'Reembolsos só podem ser adicionados a uma despesa lançada.',
    dateBeforeExpense: 'A data do reembolso não pode ser anterior à despesa original.',
    dateInFuture: 'A data do reembolso não pode estar no futuro.',
    exceedsRemaining: 'O reembolso não pode ultrapassar o valor restante a reembolsar.',
    fullyRefunded: 'Esta despesa já foi totalmente reembolsada.',
    notFound: 'Reembolso não encontrado.',
    alreadyVoided: 'O reembolso já está anulado.',
    changedBeforeVoid: 'O reembolso foi alterado antes que pudesse ser anulado.',
    unableToLoadVoided: 'Não foi possível carregar o reembolso anulado.',
    unableToVoid: 'Não foi possível anular o reembolso.',
  },
};
