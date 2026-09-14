import { createPlural } from '../../plural';
import type { recurring as en } from '../en/recurring';

const plural = createPlural('pt');

export const recurring: typeof en = {
  title: 'Recorrentes',
  createRecurring: 'Criar transação recorrente',
  closeRecurring: 'Fechar transações recorrentes',
  sections: 'Seções de recorrentes',
  tabDue: 'Pendentes',
  tabRules: 'Regras',
  tabHistory: 'Histórico',
  updating: 'Atualizando…',
  backlogLimited: 'Havia muitas pendências e esta carga foi limitada. Abra esta tela novamente para continuar com segurança.',
  loadError: 'Não foi possível carregar as transações recorrentes.',

  noneDue: 'Nenhuma transação recorrente pendente para hoje.',
  dueOn: (date: string) => `Pendente: ${date}`,
  confirmOccurrence: (label: string) => `Confirmar ${label}`,
  editOccurrence: (label: string) => `Editar a ocorrência ${label}`,
  skipOccurrence: (label: string) => `Pular a ocorrência ${label}`,
  skip: 'Pular',
  skipTitle: 'Pular esta ocorrência?',
  skipMessage: 'Ela continuará no histórico de recorrentes e não afetará saldos nem relatórios.',
  unableToConfirm: 'Não foi possível confirmar',
  confirmFallback: 'Revise a ocorrência e tente novamente.',
  unableToSkip: 'Não foi possível pular',
  tryAgain: 'Tente novamente.',

  activeRules: 'Regras ativas',
  pausedRules: 'Regras pausadas',
  endedRules: 'Regras encerradas',
  sectionCount: (title: string, count: number) => `${title} · ${count}`,
  createRule: 'Criar regra',
  createFirstRule: 'Criar sua primeira regra recorrente',
  emptyTitle: 'Nenhuma regra recorrente ainda',
  emptyBody: 'Crie uma regra para despesas, receitas ou transferências que você espera com regularidade.',
  noActiveRules: 'Nenhuma regra ativa no momento. As regras pausadas e encerradas aparecem abaixo.',
  ruleStatus: {
    active: 'Ativa',
    paused: 'Pausada',
    ended: 'Encerrada',
  },
  ruleStatusAccessibility: (status: string) => `Status da regra: ${status}`,
  nextOn: (date: string) => `Próxima: ${date}`,
  editFuture: 'Editar próximas',
  pause: 'Pausar',
  resume: 'Retomar',
  end: 'Encerrar',
  endTitle: 'Encerrar a transação recorrente?',
  endMessage: 'Nenhuma nova ocorrência será gerada. O histórico e as pendências são mantidos.',
  unableToUpdateRule: 'Não foi possível atualizar a regra',
  unableToEndRule: 'Não foi possível encerrar a regra',
  account: 'Conta',
  category: 'Categoria',

  frequency: {
    daily: 'Diária',
    weekly: 'Semanal',
    monthly: 'Mensal',
    yearly: 'Anual',
  },
  everyTwoWeeks: 'A cada duas semanas',
  everyInterval: (count, unit) => {
    if (unit === 'daily') return `A cada ${count} ${plural(count, 'dia', 'dias')}`;
    if (unit === 'weekly') return `A cada ${count} ${plural(count, 'semana', 'semanas')}`;
    if (unit === 'monthly') return `A cada ${count} ${plural(count, 'mês', 'meses')}`;
    return `A cada ${count} ${plural(count, 'ano', 'anos')}`;
  },

  historyEmpty: 'As ocorrências confirmadas e puladas aparecerão aqui.',
  occurrenceStatus: {
    posted: 'Lançada',
    skipped: 'Pulada',
  },
  occurrenceStatusSpoken: {
    pending: 'pendente',
    posted: 'lançada',
    skipped: 'pulada',
  },
  historyAccessibility: (status: string, label: string, amount: string, date: string) =>
    `${status}, ${label}, ${amount}, ${date}`,

  createTitle: 'Criar transação recorrente',
  editRuleTitle: 'Editar regra futura',
  editOccurrenceTitle: 'Editar esta ocorrência',
  optionDaily: 'Diária',
  optionWeekly: 'Semanal',
  optionEveryTwoWeeks: 'A cada 2 semanas',
  optionMonthly: 'Mensal',
  optionYearly: 'Anual',
  frequencyLabel: 'Frequência',
  sourceAccount: 'Conta de origem',
  destinationAccount: 'Conta de destino',
  selectAccount: 'Selecionar conta',
  selectSourceAccount: 'Selecionar conta de origem',
  selectDestinationAccount: 'Selecionar conta de destino',
  selectIncomeCategory: 'Selecionar categoria de receita',
  selectExpenseCategory: 'Selecionar categoria de despesa',
  startDate: 'Data de início',
  scheduledDate: 'Data programada',
  endDateOptional: 'Data de término (opcional)',
  noteOptional: 'Observação (opcional)',
  noteAccessibility: 'Observação da transação recorrente',
  notePlaceholder: 'Adicione uma descrição…',
  saveRecurring: 'Salvar transação recorrente',
  saveError: 'Não foi possível salvar a transação recorrente.',
  errorAmount: 'Informe um valor válido maior que zero.',

  ruleLoadError: 'Não foi possível carregar a transação recorrente.',
  occurrenceLoadError: 'Não foi possível carregar a ocorrência.',

  ruleNotFound: 'Transação recorrente não encontrada.',
  occurrenceNotFound: 'Ocorrência recorrente não encontrada.',
  alreadyHandled: 'Esta ocorrência recorrente já foi tratada.',
  endedCannotEdit: 'Transações recorrentes encerradas não podem ser editadas.',
  endedCannotResume: 'Transações recorrentes encerradas não podem ser retomadas.',
  hasEnded: 'Esta transação recorrente foi encerrada.',
  missingExchangeRate: (currency: string, baseCurrency: string) =>
    `Adicione uma taxa de câmbio ${currency}/${baseCurrency} antes de lançar esta transação.`,
  errorDateFormat: 'Informe uma data válida no formato AAAA-MM-DD.',
  errorFrequency: 'Selecione uma frequência compatível.',
  errorInterval: 'O intervalo deve ser um número inteiro positivo.',
  errorStartDate: 'Informe uma data de início válida.',
  errorEndDate: 'Informe uma data de término válida.',
  errorEndBeforeStart: 'A data de término não pode ser anterior à data de início.',
  errorCrossCurrencyTransfer: 'Transferências recorrentes entre moedas diferentes não são compatíveis.',
};
