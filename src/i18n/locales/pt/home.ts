import type { home as en } from '../en/home';

export const home: typeof en = {
  loadError: 'Não foi possível carregar seu painel agora.',
  loadingDashboard: 'Carregando seu painel',

  selectedMonth: (month) => `Mês selecionado, ${month}`,
  previousMonthHint: 'Mostra o resumo e os orçamentos do mês anterior',
  nextMonthHint: 'Mostra o resumo e os orçamentos do mês seguinte',

  totalBalance: 'Saldo total',
  estimatedNetWorth: 'Patrimônio líquido estimado',
  netWorthIncompleteLabel: (currencies) =>
    `O patrimônio líquido estimado está incompleto porque não há taxa de câmbio para ${currencies}`,
  estimatedIncomplete: 'Estimado — incompleto',
  netInMonth: (month) => `líquido em ${month}`,

  income: 'Receitas',
  refunds: 'Reembolsos',
  netExpenses: 'Despesas líquidas',
  netResult: 'Resultado líquido',

  investments: 'Investimentos',
  investmentsHint: 'Abre a tela de investimentos',
  investmentsLabel: (value) => `Investimentos, valor atual ${value}`,
  investmentsIncompleteValue: 'estimado, incompleto',
  viewInvestments: 'Ver investimentos',
  gainLossUnavailable: 'Ganho/perda estimado indisponível',
  gainLoss: (amount) => `${amount} de ganho/perda estimado`,
  asOf: (date) => `em ${date}`,

  monthlyCeiling: 'Teto mensal',
  monthlyBudget: 'Orçamento mensal',
  budgetCardLabel: (title, spent, total, percentage, over) =>
    `${title}, ${spent} gastos de ${total}, ${percentage}% usado${over ? ', acima do orçamento' : ''}`,
  noBudgets: 'Nenhum orçamento definido para este mês',
  percentUsed: (percentage) => `${percentage}% usado`,
  overBudget: 'Acima do orçamento',
  spent: (amount) => `${amount} gastos`,
  ofTotal: (amount) => `de ${amount}`,
  ceilingNote: 'Todos os gastos do mês, incluindo o que nenhum orçamento por categoria cobre.',
  byCategory: 'Por categoria',
  viewAll: 'Ver tudo',
  viewAllBudgets: 'Ver todos os orçamentos',
  categoryRowLabel: (category, percentage, over) =>
    `${category}, ${percentage}% usado${over ? ', acima do orçamento' : ''}`,

  recentTransactions: 'Transações recentes',
  viewAllTransactions: 'Ver todas as transações',
  noRecentTransactions: 'Nenhuma transação recente.',
};
