import type { notifications as en, ReminderTiming } from '../en/notifications';
import { createPlural } from '../../plural';

const plural = createPlural('pt');

// Feminine: agrees with "transação" and "transferência".
const timingText = (timing: ReminderTiming) =>
  timing === 'upcoming' ? 'está chegando' : timing === 'overdue' ? 'está atrasada' : 'vence hoje';

export const notifications: typeof en = {
  channels: {
    recurringName: 'Lembretes recorrentes',
    recurringDescription: 'Lembretes de transações recorrentes pendentes e próximas',
    budgetsName: 'Alertas de orçamento',
    budgetsDescription: 'Alertas quando os orçamentos mensais se aproximam ou atingem o limite',
    creditCardsName: 'Lembretes de cartão de crédito',
    creditCardsDescription: 'Lembretes de fechamento da fatura e vencimento',
    dailyName: 'Lembretes diários',
    dailyDescription: 'Lembretes discretos para revisar suas finanças',
  },

  content: {
    reminderTitle: 'Lembrete do Money Control',
    recurringPrivate: (timing) =>
      timing === 'upcoming'
        ? 'Você tem uma transação recorrente próxima para revisar.'
        : timing === 'overdue'
          ? 'Você tem uma transação recorrente atrasada para revisar.'
          : 'Você tem uma transação recorrente para revisar.',
    recurringTransfer: (amount, timing) =>
      `Uma transferência recorrente de ${amount} ${timingText(timing)}.`,
    recurringCategory: (category, amount, timing) =>
      category
        ? `A transação recorrente de ${category} no valor de ${amount} ${timingText(timing)}.`
        : `Uma transação recorrente de ${amount} ${timingText(timing)}.`,
    budgetReachedTitle: 'Limite do orçamento atingido',
    budgetNearingTitle: 'Orçamento perto do limite',
    budgetReachedPrivate: 'Um orçamento atingiu o limite.',
    budgetNearingPrivate: 'Um orçamento está perto do limite.',
    budgetReachedDetail: (label, month) => `${label} atingiu o orçamento de ${month}.`,
    budgetNearingDetail: (label, percent, month) =>
      `${label} já usou ${percent}% do orçamento de ${month}.`,
    dailyBody: 'Reserve um momento para revisar suas finanças.',
    testTitle: 'Teste do Money Control',
    testBody: 'Os lembretes locais estão prontos neste dispositivo.',
    cardClosingTitle: 'Fatura fecha em breve',
    cardDueTitle: 'Pagamento do cartão vencendo',
    cardClosingPrivate: 'A fatura de um cartão de crédito fecha em breve.',
    cardDuePrivate: 'O pagamento de um cartão de crédito vence em breve.',
    cardClosingDetail: (card, date) => `A fatura de ${card} fecha em ${date}.`,
    cardDueDetail: (card, amount, date) =>
      `${card} tem ${amount} em aberto, com vencimento em ${date}.`,
  },

  settings: {
    title: 'Notificações',
    loadingLabel: 'Carregando configurações de notificações',
    backLabel: 'Voltar das configurações de notificações',
    allowTitle: 'Permitir lembretes locais?',
    allowMessage: 'O Money Control usa as notificações do Android apenas para as categorias de lembrete que você escolher. Nenhum dado financeiro sai deste dispositivo.',
    continue: 'Continuar',
    notNow: 'Agora não',
    permissionSection: 'Permissão do Android',
    openAndroidSettings: 'Abrir configurações do Android',
    enableNotifications: 'Ativar notificações',
    enableTitle: 'Ativar lembretes locais?',
    enableMessage: 'O Android vai perguntar se o Money Control pode mostrar os lembretes que você escolher.',
    pauseAll: 'Pausar todos os lembretes',
    resume: 'Retomar notificações',
    categoriesSection: 'Categorias de lembrete',
    recurringDescription: 'Itens recorrentes pendentes, atrasados e próximos',
    recurringLabel: 'Transações recorrentes',
    reminderTime: 'Horário do lembrete',
    advanceNotice: 'Antecedência',
    sameDay: 'No dia',
    advanceDays: (days) => `${days} ${plural(days, 'dia', 'dias')}`,
    budgetsDescription: 'Um alerta perto de 80% e outro em 100%',
    budgetsLabel: 'Limites de orçamento',
    cardsDescription: 'Lembretes de fechamento da fatura e vencimento',
    cardsLabel: 'Cartões de crédito',
    closingDescription: 'Um dia antes da data de fechamento calculada',
    closingLabel: 'Lembrete de fechamento',
    paymentDueReminders: 'Lembretes de vencimento',
    dueThreeDaysDescription: 'Três dias antes do vencimento da fatura',
    dueThreeDaysLabel: '3 dias antes',
    dueOneDayDescription: 'Um dia antes do vencimento da fatura',
    dueOneDayLabel: '1 dia antes',
    dueTodayDescription: 'No dia do vencimento da fatura',
    dueTodayLabel: 'Vence hoje',
    dailyDescription: 'Um aviso diário e discreto para revisar suas finanças',
    dailyLabel: 'Revisão diária',
    dailyTime: 'Horário do lembrete diário',
    privacySection: 'Privacidade das notificações',
    private: 'Privado',
    detailed: 'Detalhado',
    privacyDescription: 'Privado oculta valores, contas, categorias, saldos e notas. Detalhado pode mostrar uma categoria e um valor, mas nunca notas nem dados completos da conta.',
    appLockWarning: 'O bloqueio do app está ativado. O conteúdo privado é recomendado para a privacidade da tela de bloqueio.',
    testSection: 'Teste e entrega',
    sendTest: 'Enviar notificação de teste',
    cancelTest: 'Cancelar teste pendente',
    deliveryDescription: 'Os horários dos lembretes seguem o relógio local do dispositivo. As datas financeiras recorrentes continuam sendo datas do calendário de Bogotá. O Android pode atrasar a entrega durante o Doze ou a otimização de bateria.',
    attentionTitle: 'Alguns lembretes precisam de atenção',
    attentionBody: 'O Money Control não conseguiu concluir a última atualização de notificações. Os dados financeiros foram salvos normalmente.',
    dismissMessage: 'Fechar mensagem',
    currentValue: (value) => `Valor atual ${value}`,
    chooseTime: 'Escolha o horário local',
    hour: 'Hora',
    minute: 'Minuto',
    saveTime: (time) => `Salvar ${time}`,
    permissionGrantedTitle: 'Permitido pelo Android',
    permissionBlockedTitle: 'Bloqueado nas configurações do Android',
    permissionDeniedTitle: 'Permissão negada',
    permissionUnavailableTitle: 'Notificações indisponíveis',
    permissionNotEnabledTitle: 'Ainda não ativadas',
    permissionGrantedDescription: 'O Android pode mostrar as categorias de lembrete locais que você ativar abaixo.',
    permissionBlockedDescription: 'Abra as configurações do Android para permitir notificações. O Money Control continua funcionando normalmente.',
    permissionDeniedDescription: 'Você pode tentar de novo quando quiser. Nenhuma permissão de lembrete é necessária para usar o app.',
    permissionUnavailableDescription: 'Este ambiente não pode agendar notificações do Android. Os recursos financeiros não são afetados.',
    permissionNotEnabledDescription: 'O Money Control só vai pedir permissão depois que você decidir ativar os lembretes locais.',
  },

  results: {
    loadFailed: 'Não foi possível carregar as configurações de notificações.',
    changeFailed: 'Não foi possível concluir a alteração das notificações. Tente novamente.',
    permissionUpdated: 'Permissão de notificações atualizada.',
    paused: 'Todos os lembretes do Money Control estão pausados.',
    reminderEnabled: 'Lembrete ativado.',
    reminderDisabled: 'Lembrete desativado.',
    recurringTimeUpdated: 'Horário do lembrete recorrente atualizado.',
    advanceUpdated: 'Antecedência atualizada.',
    dailyTimeUpdated: 'Horário do lembrete diário atualizado.',
    privacyUpdated: 'Privacidade das notificações atualizada.',
    cardClosingUpdated: 'Lembrete de fechamento do cartão atualizado.',
    cardDueUpdated: 'Lembrete de vencimento do cartão atualizado.',
    testScheduled: 'Notificação de teste agendada para daqui a cerca de cinco segundos.',
    testCanceled: 'Notificação de teste cancelada.',
  },
};
