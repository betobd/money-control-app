import { createPlural } from '../../plural';
import type { budgets as en } from '../en/budgets';

const plural = createPlural('pt');

export const budgets: typeof en = {
  createBudget: 'Criar orçamento',
  selectedMonth: (month: string) => `Mês selecionado, ${month}`,
  monthlyBudgets: 'Orçamentos do mês',
  monthlyCategoryBudgets: 'Orçamentos por categoria do mês',

  status: {
    'on-track': 'Em dia',
    'near-limit': 'Quase no limite',
    'fully-used': 'Esgotado',
    'over-budget': 'Estourado',
  },

  spent: 'Gasto',
  remaining: 'Disponível',
  overBy: 'Acima em',
  spentOfLimit: (spent: string, limit: string) => `${spent} de ${limit}`,
  percentUsed: (percentage: number) => `${percentage}% usado`,
  subLimit: 'Sublimite',
  monthlyTag: 'Mensal',
  inParent: (parent: string) => `em ${parent}`,
  archivedCategory: 'Categoria arquivada',
  cardHint: 'Abre a edição do orçamento',
  cardAccessibility: (value) =>
    `${value.category}${value.archived ? ', categoria arquivada' : ''}, ${value.status}, gasto ${value.spent} de ${value.limit}, ${value.over ? 'acima em' : 'disponível'} ${value.remaining}, ${value.percentage}% usado`,
  progressAccessibility: (status: string, percentage: number) => `${status}, ${percentage}% usado`,

  totalMonthlyBudget: 'Orçamento mensal total',
  summaryAccessibility: (total: string, spent: string, remaining: string, percentage: number) =>
    `Orçamento mensal total ${total}, gasto ${spent}, disponível ${remaining}, ${percentage}% usado`,
  overallProgress: 'Progresso geral',
  nestedNote: (count: number) =>
    plural(
      count,
      `${count} sublimite é contado dentro da sua categoria, sem somar ao total.`,
      `${count} sublimites são contados dentro das suas categorias, sem somar ao total.`,
    ),

  emptyTitle: 'Nenhum orçamento neste mês',
  emptyBody: 'Crie um orçamento por categoria para começar a planejar seus gastos do mês.',
  createFirstBudget: 'Criar o primeiro orçamento',
  loadingBudgets: 'Carregando orçamentos',
  retryLoading: 'Tentar carregar os orçamentos novamente',
  loadBudgetsError: 'Não foi possível carregar os orçamentos.',

  expenseCategory: 'Categoria de despesa',
  searchExpenseCategories: 'Buscar categorias de despesa',
  searchCategories: 'Buscar categorias',
  categoryOption: (name: string, archived: boolean) => `${name}${archived ? ', arquivada' : ''}`,
  archived: 'Arquivada',
  noMatchingCategories: 'Nenhuma categoria de despesa ativa encontrada.',

  budgetColor: 'Cor do orçamento',
  colors: {
    blue: 'Azul',
    teal: 'Verde-azulado',
    green: 'Verde',
    amber: 'Âmbar',
    coral: 'Coral',
    pink: 'Rosa',
    purple: 'Roxo',
    indigo: 'Índigo',
  },

  closeForm: 'Fechar formulário de orçamento',
  editTitle: 'Editar orçamento',
  createTitle: 'Criar orçamento',
  category: 'Categoria',
  budgetMonth: 'Mês do orçamento',
  budgetMonthInput: 'Mês do orçamento no formato AAAA-MM',
  monthPlaceholder: 'AAAA-MM',
  budgetLimit: 'Limite do orçamento',
  repeatTitle: 'Repetir todo mês',
  repeatHint: 'Reaparece automaticamente todo mês. Alterar o valor vale a partir deste mês.',
  repeatAccessibility: 'Repetir este orçamento todo mês',
  removeBudget: 'Excluir orçamento',
  removeTitle: 'Excluir o orçamento?',
  removeRecurringMessage:
    'Isso encerra o orçamento recorrente e o remove deste mês e dos próximos. Os meses anteriores continuam. Categorias e transações não são excluídas.',
  removeOneOffMessage: 'Isso remove apenas o plano deste mês. Categorias e transações não são excluídas.',
  saveBudgetChanges: 'Salvar alterações do orçamento',
  saveChanges: 'Salvar alterações',
  loadError: 'Não foi possível carregar o orçamento.',
  saveError: 'Não foi possível salvar o orçamento.',
  removeError: 'Não foi possível excluir o orçamento.',
  notFound: 'Orçamento não encontrado.',

  errorSelectExpenseCategory: 'Selecione uma categoria de despesa.',
  errorSelectExistingCategory: 'Selecione uma categoria de despesa existente.',
  errorSelectActiveCategory: 'Selecione uma categoria de despesa ativa.',
  errorInvalidMonth: 'Informe um mês válido no formato AAAA-MM.',
  errorLimitRange: 'Informe um limite positivo dentro do intervalo permitido.',
  errorInvalidColor: 'Selecione uma cor de orçamento válida.',
  errorRecurringExists: 'Esta categoria já tem um orçamento recorrente.',
  errorDuplicate: 'Esta categoria já tem um orçamento para o mês selecionado.',
  errorCeilingLimit: 'Informe um limite inteiro positivo.',

  monthlyCeiling: 'Teto mensal',
  ceilingAccessibility: (limit: string, spent: string, over: boolean, remaining: string, percentage: number) =>
    `Teto mensal ${limit}, gasto ${spent}, ${over ? 'acima em' : 'disponível'} ${remaining}, ${percentage}% usado`,
  carriedForward: (month: string) => `Mantido desde ${month}.`,
  spentThisMonth: 'Gasto neste mês',
  allSpending: 'Todas as despesas',
  ceilingOverAllocated: (total: string, excess: string) =>
    `Os orçamentos por categoria somam ${total}, ${excess} acima deste teto.`,
  ceilingUnallocated: (total: string, unallocated: string) =>
    `${total} está planejado em orçamentos por categoria; ${unallocated} deste teto está sem orçamento.`,
  ceilingEmptyBody:
    'Defina um limite geral para o mês. Todas as despesas contam, inclusive as que nenhum orçamento por categoria cobre.',
  setMonthlyCeiling: 'Definir teto mensal',

  closeCeilingForm: 'Fechar formulário do teto mensal',
  ceilingFor: (month: string) => `Teto para ${month}`,
  ceilingHelpCounts:
    'Toda despesa lançada conta, descontados os reembolsos, inclusive gastos que nenhum orçamento por categoria cobre. Transferências e aportes em investimentos não contam.',
  ceilingHelpApplies: (month: string) =>
    `Vale a partir de ${month} até você alterar. Um mês posterior definido separadamente mantém o próprio teto.`,
  removeCeiling: 'Excluir teto',
  saveCeiling: 'Salvar teto',
  setCeiling: 'Definir teto',
  remove: 'Excluir',
  removeCeilingTitle: 'Excluir o teto mensal?',
  removeCeilingMessage: (month: string) =>
    `Nenhum teto será aplicado a partir de ${month}. Os meses anteriores mantêm o seu, e nenhum orçamento por categoria é afetado.`,
  ceilingEnterPositive: 'Informe um valor positivo.',
  ceilingLoadError: 'Não foi possível carregar o teto mensal.',
  ceilingSaveError: 'Não foi possível salvar o teto mensal.',
  ceilingRemoveError: 'Não foi possível excluir o teto mensal.',
};
