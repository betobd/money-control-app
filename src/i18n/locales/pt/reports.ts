import type { reports as en } from '../en/reports';
import { createPlural } from '../../plural';

const plural = createPlural('pt');

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const reports: typeof en = {
  title: 'Relatórios',
  headerSubtitle: 'Seu histórico financeiro salvo',
  backFromReports: 'Voltar de Relatórios',
  loadingReports: 'Carregando relatórios',
  loadErrorTitle: 'Não foi possível carregar os relatórios',
  loadError: 'Não foi possível carregar os relatórios.',
  budgetsLoadError: 'Não foi possível carregar os orçamentos deste período.',
  updating: 'Atualizando todas as seções do relatório…',

  presetCurrentMonth: 'Mês atual',
  presetPreviousMonth: 'Mês anterior',
  presetLast3Months: 'Últimos 3 meses',
  presetLast6Months: 'Últimos 6 meses',
  presetCurrentYear: 'Ano atual',
  presetCustom: 'Personalizado',
  startDate: 'Data inicial',
  endDate: 'Data final',
  applyRange: 'Aplicar período',
  applyRangeLabel: 'Aplicar período personalizado do relatório',
  invalidPeriod: 'Período do relatório inválido.',
  selectedPeriod: (label) => `Período do relatório selecionado, ${label}`,

  invalidToday: 'Não foi possível determinar uma data local válida de Bogotá.',
  invalidCustomDates: 'Informe datas inicial e final válidas no formato AAAA-MM-DD.',
  endBeforeStart: 'A data final não pode ser anterior à data inicial.',

  netWorthStart: 'Início',
  unknownCategory: 'Categoria desconhecida',
  noSubcategory: 'Sem subcategoria',

  emptyTitle: 'Nenhuma receita ou despesa lançada',
  emptyDescription:
    'Os totais continuam zerados neste período. Transferências, transações anuladas e ocorrências recorrentes pendentes ou puladas não contam.',

  summaryTitle: 'Resumo do período',
  summaryDescription: 'Receitas e despesas lançadas no período selecionado.',
  netResult: 'Resultado líquido',
  income: 'Receitas',
  expenses: 'Despesas',
  net: 'Líquido',
  netExpenses: 'Despesas líquidas',
  grossExpenses: 'Despesas brutas',
  refunds: 'Reembolsos',
  averageExpense: 'Despesa média',
  expenseTransactions: 'Transações de despesa',
  incomeTransactions: 'Transações de receita',
  refundTransactions: 'Transações de reembolso',
  largestExpense: 'Maior despesa',
  noLargestExpense: 'Nenhuma despesa lançada neste período.',
  savingsRateNotApplicable: 'Sem receitas neste período, a taxa de poupança não se aplica.',
  savingsRate: (percentage) => `Você guardou ${percentage} do que ganhou.`,
  showDetails: 'Ver detalhes',
  hideDetails: 'Ocultar detalhes',
  showSummaryDetails: 'Ver detalhes do resumo',
  hideSummaryDetails: 'Ocultar detalhes do resumo',

  cashFlowTitle: 'Receitas x despesas',
  cashFlowDescriptionDay:
    'Uma coluna por dia (horário de Bogotá). As receitas sobem acima da linha e as despesas descem abaixo dela.',
  cashFlowDescriptionMonth:
    'Uma coluna por mês. As receitas sobem acima da linha e as despesas descem abaixo dela.',
  wholePeriod: 'Período inteiro',
  cashFlowChartLabel: (income, expenses) =>
    `Gráfico de fluxo de caixa. Receitas totais ${income}. Despesas totais ${expenses}.`,
  cashFlowHint: 'Toque em uma coluna para ver o detalhe.',
  cashFlowHintSelected: 'Toque na coluna de novo para ver o período inteiro.',

  paceTitle: 'Ritmo de gastos',
  paceDescription: (previousPeriod) =>
    `Total acumulado de despesas líquidas, comparado ao mesmo ponto do período anterior (${previousPeriod}).`,
  previousPeriod: 'Período anterior',
  thisPeriod: 'Este período',
  spentSoFar: 'Gasto até agora',
  versusLast: (signedAmount) => `${signedAmount} vs. anterior`,
  paceChartLabel: (spent, previousAmount, previousPeriod) =>
    `Gasto acumulado. ${spent} até agora, contra ${previousAmount} no mesmo ponto (${previousPeriod}).`,

  budgetTitle: 'Orçado x realizado',
  budgetDescription:
    'Orçamentos por categoria comparados ao que foi realmente gasto. O gasto já desconta reembolsos e exclui transferências.',
  budgetSumHint: (monthCount) =>
    `Os limites somam ${monthCount} orçamentos mensais; os orçamentos nunca são proporcionais.`,
  budgetRowLabel: (category, spent, limit, percentage) =>
    `${category}, ${spent} gastos de ${limit}, ${percentage}% usado`,
  spentOfLimit: (spent, limit) => `${spent} de ${limit}`,
  remaining: (amount) => `restam ${amount}`,
  over: (amount) => `${amount} acima`,

  weekdayTitle: 'Gastos por dia da semana',
  weekdayDescription:
    'Despesa líquida média por dia da semana, dividida pelo número de vezes que cada dia aparece no período.',
  weekdayColumnLabel: (shortDay, longDay, average, dayCount) =>
    `${capitalize(longDay)}, média de ${average} em ${dayCount} ${plural(dayCount, 'dia', 'dias')}`,
  heaviestDay: (shortDay, longDay, weekday, amount) =>
    `${capitalize(longDay)} é o dia em que você mais gasta: ${amount} em média.`,
  noWeekdayExpenses: 'Nenhuma despesa para comparar entre os dias da semana.',

  categoryTitle: 'Despesas por categoria',
  categoryDescription:
    'Todas as despesas lançadas, ordenadas pelo ID fixo da categoria, incluindo categorias arquivadas.',
  categoryEmpty: 'Nenhuma despesa lançada para ordenar neste período.',
  donutLabel: (total) => `Despesas por categoria. Total ${total}.`,
  totalExpenses: 'Despesas totais',
  otherCategories: (count) => `Outras (${count})`,
  expensesRanked: 'Despesas ordenadas por categoria',
  transactionCount: (count) => `${count} ${plural(count, 'transação', 'transações')}`,
  inDetail: (count) => `${count} em detalhe`,
  shareOfCategory: (percentage, category) => `${percentage} de ${category}`,
  showBreakdownHint: 'Mostra o detalhamento por subcategoria',
  hideBreakdownHint: 'Oculta o detalhamento por subcategoria',

  netWorthTitle: 'Evolução do patrimônio líquido',
  netWorthDescriptionDay: (date) =>
    `Começa pelo patrimônio líquido antes de ${date} e aplica o histórico lançado até cada dia.`,
  netWorthDescriptionMonth: (date) =>
    `Começa pelo patrimônio líquido antes de ${date} e aplica o histórico lançado até cada fim de mês.`,
  noNetWorthHistory: 'Sem histórico de patrimônio líquido neste período.',
  endingNetWorth: 'Patrimônio líquido final',
  netWorthChartLabel: (start, end) =>
    `Evolução do patrimônio líquido. Começa em ${start} e termina em ${end}.`,

  investmentsTitle: 'Investimentos',
  investmentsDescription:
    'Posição atual dos investimentos (estimada) mais a receita de investimentos realizada no período. Variações de avaliação não realizadas aumentam o patrimônio líquido, mas nunca contam como receita comum.',
  currentValue: 'Valor atual',
  estimatedIncomplete: 'Estimado — incompleto',
  netContributions: 'Aportes líquidos',
  estimatedGainLoss: 'Ganho/perda estimado',
  simpleEstimatedReturn: 'Retorno simples estimado',
  investmentIncomePeriod: 'Receita de investimentos (período)',

  comparisonTitle: 'Comparação com o período anterior',
  comparisonDescription: (previousPeriod) =>
    `Comparado com o período anterior (${previousPeriod}). Aumentos de despesa usam um indicador negativo.`,
  noChange: 'Sem alteração',
  noPreviousData: 'Sem dados do período anterior',
  percentageUnavailable: 'porcentagem indisponível',
  increasedBy: (difference, percentage) => `Aumentou ${difference} (${percentage})`,
  decreasedBy: (difference, percentage) => `Diminuiu ${difference} (${percentage})`,
  comparisonRowLabel: (label, current, change) => `${label}. Atual ${current}. ${change}.`,
};
