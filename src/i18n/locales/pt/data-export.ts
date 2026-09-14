import type { dataExport as en } from '../en/data-export';
import { createPlural } from '../../plural';

const plural = createPlural('pt');

export const dataExport: typeof en = {
  title: 'Exportar dados',
  sizeBytes: (bytes: number) => `cerca de ${bytes} B`,
  sizeKib: (kib: number) => `cerca de ${kib} KiB`,
  sizeMib: (mib: string) => `cerca de ${mib} MiB`,
  confirmMessage: (detail: string) =>
    `Arquivos CSV podem conter informações financeiras sensíveis. Qualquer pessoa com acesso ao arquivo pode lê-lo. O bloqueio do app não protege o arquivo depois que ele sai do Money Control.${detail ? `\n\n${detail}` : ''}`,
  confirmLabel: 'Continuar',
  warningTitle: 'Informações financeiras sem criptografia',
  warningBody: 'Arquivos CSV podem ser lidos por qualquer pessoa com acesso a eles. Eles servem para planilhas, análises e compartilhamento, não para restaurar o app.',
  notBackupTitle: 'CSV não é backup',
  notBackupBody: 'Precisa restaurar o Money Control depois? O backup preserva IDs e relações em JSON versionado. Um CSV não pode ser restaurado.',
  openBackupHint: 'Abre o recurso de backup para restauração completa',
  openBackupLabel: 'Abrir backup e restauração',
  openBackupButton: 'Abrir backup e restauração',
  recordCount: (count: number) => `${count} ${plural(count, 'registro', 'registros')}`,
  emptyCard: 'Nada para exportar aqui ainda: este CSV não teria linhas.',
  notRestorable: 'CSV legível · Não é um backup restaurável',
  notesPrivacy: 'Desativado por padrão para proteger a privacidade do arquivo.',
  footerNote: 'Os arquivos são gerados no dispositivo, compartilhados um de cada vez e removidos do cache temporário do Money Control quando a tela nativa fecha. O Money Control não envia nenhum dado.',

  transactionsTitle: 'Transações',
  transactionsDescription: 'Linhas legíveis de transações com contas de origem e destino, categoria, status, datas e notas opcionais.',
  filterDate: (range: string) => `Data: ${range}`,
  filterType: (value: string) => `Tipo: ${value}`,
  filterStatus: (value: string) => `Status: ${value}`,
  filterAccount: (value: string) => `Conta: ${value}`,
  filterCategory: (value: string) => `Categoria: ${value}`,
  allTypes: 'Todos',
  allStatuses: 'Todos',
  allAccounts: 'Todas',
  allCategories: 'Todas',
  typeValues: {
    expense: 'despesa',
    income: 'receita',
    transfer: 'transferência',
    refund: 'reembolso',
  },
  statusValues: {
    posted: 'lançada',
    voided: 'anulada',
  },
  activeFilters: (count: number, size: string) =>
    `${count} ${plural(count, 'filtro ativo', 'filtros ativos')} · ${size}`,
  configureFiltersLabel: 'Configurar filtros da exportação de transações',
  configureFilters: 'Configurar filtros',
  includeTransactionNotes: 'Incluir notas das transações',
  noTransactionsMatch: 'Nenhuma transação corresponde aos filtros selecionados.',
  largeExport: 'Exportação grande: a geração pode demorar mais e usar mais memória.',
  transactionLimitExceeded: 'Restrinja os filtros. O limite de segurança de 50.000 linhas foi ultrapassado e nenhum arquivo parcial será criado.',
  exportTransactionsButton: 'Exportar transações CSV',
  exportTransactionsTitle: 'Exportar transações?',
  transactionNotesIncluded: 'As notas das transações estão ativadas e serão incluídas.',
  transactionNotesExcluded: 'As notas das transações não serão incluídas.',

  accountsTitle: 'Contas',
  accountsDescription: 'Contas ativas e arquivadas com saldo inicial e saldo atual calculado. Os campos de dívida de cartão usam o modelo de saldo com sinal.',
  accountsCaption: 'Inclui todos os tipos de conta. As colunas exclusivas de cartão de crédito ficam vazias nas demais contas.',
  exportAccountsButton: 'Exportar contas CSV',
  exportAccountsTitle: 'Exportar contas?',

  budgetsTitle: 'Orçamentos',
  budgetsDescription: 'Limites mensais com os mesmos gastos calculados, valor restante, porcentagem e status usados em Orçamentos.',
  previousBudgetMonth: 'Mês de orçamento anterior',
  nextBudgetMonth: 'Próximo mês de orçamento',
  selectedBudgetMonth: (month: string) => `Mês de orçamento selecionado: ${month}`,
  exportBudgetsButton: 'Exportar orçamentos CSV',
  exportBudgetsTitle: 'Exportar orçamentos?',

  recurringTitle: 'Transações recorrentes',
  recurringDescription: 'Somente modelos recorrentes: agenda, ciclo de vida, contas, categoria, valor e nota opcional. Exportar nunca gera ocorrências nem transações.',
  includeRecurringNotes: 'Incluir notas recorrentes',
  exportRecurringButton: 'Exportar regras recorrentes CSV',
  exportRecurringTitle: 'Exportar regras recorrentes?',
  recurringNotesIncluded: 'As notas recorrentes estão ativadas e serão incluídas.',
  recurringNotesExcluded: 'As notas recorrentes não serão incluídas.',

  statementsTitle: 'Faturas de cartão de crédito',
  statementsDescription: 'Faturas anteriores com saldo e mínimo informados pelo banco, pagamentos atribuídos, valores restantes e status.',
  statementsCaption: 'Números de cartão, CVV, datas de validade, parcelamentos inferidos ou credenciais nunca são salvos nem exportados.',
  exportStatementsButton: 'Exportar faturas CSV',
  exportStatementsTitle: 'Exportar faturas de cartão?',

  reportTitle: 'Resumo do relatório',
  reportDescription: 'Uma linha por métrica de resumo, com os mesmos períodos e regras financeiras usados em Relatórios.',
  exportReportButton: 'Exportar resumo CSV',
  exportReportTitle: 'Exportar resumo do relatório?',

  investmentsTitle: 'Investimentos',
  investmentsDescription: 'Contas de investimento com valor atual, aportes líquidos, ganho/perda estimado, retorno simples e valor estimado na sua moeda principal (vazio quando não há taxa de câmbio). Investimentos arquivados são incluídos.',
  investmentsCaption: 'Os valores são estimados pela última avaliação manual; ganho/perda não realizado nunca conta como receita.',
  exportInvestmentsButton: 'Exportar investimentos CSV',
  exportInvestmentsTitle: 'Exportar investimentos?',

  valuationsTitle: 'Avaliações de investimento',
  valuationsDescription: 'Histórico completo de avaliações manuais de cada conta de investimento: data, moeda, valor e nota opcional.',
  valuationsCaption: 'Uma linha por avaliação registrada em todas as contas de investimento.',
  exportValuationsButton: 'Exportar avaliações CSV',
  exportValuationsTitle: 'Exportar avaliações de investimento?',

  unconfirmedCopy: (message: string) => `${message} O Money Control não consegue confirmar que uma cópia foi salva no destino.`,
  exportFailed: 'Não foi possível concluir a exportação CSV. Seus dados financeiros não foram alterados. Tente novamente.',
  overviewFailed: 'Não foi possível carregar as contagens da exportação. Tente abrir esta tela novamente.',
  exportSucceeded: (fileName: string, rowCount: number, formattedRowCount: string) =>
    `${fileName} foi gerado com ${formattedRowCount} ${plural(rowCount, 'linha', 'linhas')}. A tela nativa de salvar/compartilhar foi fechada; o Money Control não consegue saber se você salvou, compartilhou ou cancelou.`,

  noData: {
    transactions: 'Nenhuma transação corresponde às opções selecionadas.',
    accounts: 'Nenhuma conta corresponde às opções selecionadas.',
    budgets: 'Nenhum orçamento corresponde às opções selecionadas.',
    recurringRules: 'Nenhuma regra recorrente corresponde às opções selecionadas.',
    creditCardStatements: 'Nenhuma fatura de cartão corresponde às opções selecionadas.',
    investments: 'Nenhum investimento corresponde às opções selecionadas.',
    investmentValuations: 'Nenhuma avaliação de investimento corresponde às opções selecionadas.',
  },
  rowLimitExceeded: (count: string, maximum: string) =>
    `Esta exportação tem ${count} linhas, acima do limite de segurança de ${maximum} linhas. Restrinja o período ou os filtros e tente novamente.`,

  writeFailed: 'Não foi possível gerar o arquivo CSV. Verifique o armazenamento do dispositivo e tente novamente.',
  sharingUnavailable: 'O arquivo CSV foi gerado, mas a tela nativa de salvar/compartilhar do Android não está disponível.',
  sharingOpenFailed: 'O arquivo CSV foi gerado, mas não foi possível abrir a tela nativa de salvar/compartilhar do Android.',
  shareFailed: 'O arquivo CSV foi gerado, mas não foi possível compartilhá-lo.',
  shareDialogTitle: 'Salvar ou compartilhar CSV do Money Control',
};
