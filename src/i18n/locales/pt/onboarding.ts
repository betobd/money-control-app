import type { onboarding as en } from '../en/onboarding';

export const onboarding: typeof en = {
  tagline: 'Seu dinheiro, claro e privado.',
  highlights: {
    privateTitle: 'Privado por padrão',
    privateBody: 'Sem cadastro. Seus dados ficam neste celular, a menos que você os exporte.',
    currencyTitle: 'Qualquer moeda',
    currencyBody: 'Tenha contas nas moedas que você usa e veja todos os totais na sua.',
    budgetsTitle: 'Orçamentos que mantêm você no controle',
    budgetsBody: 'Defina um teto mensal e limites por categoria, e veja para onde vai seu dinheiro.',
  },
  getStarted: 'Começar',
  restore: 'Restaurar um backup',
  languageButton: (languageName) => `Idioma: ${languageName}`,
  languageSheetTitle: 'Idioma',
  currencyTitle: 'Moeda principal',
  backToWelcome: 'Voltar às boas-vindas',
  currencyQuestion: 'Qual moeda você usa no dia a dia?',
  currencyBody: 'Totais, orçamentos e relatórios são exibidos nesta moeda. Você ainda pode ter contas em outras moedas.',
  currencyCardLabel: (code, name) => `Moeda principal: ${code}, ${name}`,
  currencyCardHint: 'Abre a lista de moedas',
  change: 'Alterar',
  lockNote: 'Você pode alterá-la até registrar sua primeira transação ou orçamento. Depois disso ela fica fixa, porque todos os valores são salvos nela.',
  saveFailed: 'Não foi possível salvar sua moeda. Tente novamente.',
  start: (code) => `Usar ${code} e começar`,
  suggested: 'Sugeridas',
  baseCurrency: {
    unsupported: 'Selecione uma moeda compatível.',
    missing: 'As configurações do app não foram encontradas no banco de dados.',
    lockedByHistory: (count) =>
      count === 1
        ? 'Sua transação guarda o valor na moeda principal atual. Alterá-la exigiria recalculá-la com taxas de câmbio históricas, que não são guardadas.'
        : `Suas ${count} transações guardam o valor na moeda principal atual. Alterá-la exigiria recalculá-las com taxas de câmbio históricas, que não são guardadas.`,
    lockedByBudgets: (count) =>
      count === 1
        ? 'Seu orçamento está definido na moeda principal atual. Exclua-o para escolher outra moeda principal.'
        : `Seus ${count} orçamentos estão definidos na moeda principal atual. Exclua-os para escolher outra moeda principal.`,
  },
};
