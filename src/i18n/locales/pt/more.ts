import type { more as en } from '../en/more';

export const more: typeof en = {
  title: 'Mais',
  closeLabel: 'Fechar Mais',
  items: {
    security: {
      label: 'Segurança',
      description: 'PIN, biometria e bloqueio automático',
      accessibilityLabel: 'Abrir configurações de segurança',
      accessibilityHint: 'Configure o PIN, a biometria do dispositivo e o bloqueio automático do app',
    },
    notifications: {
      label: 'Notificações',
      description: 'Lembretes locais e privacidade das notificações',
      accessibilityLabel: 'Abrir configurações de notificações',
      accessibilityHint: 'Configure lembretes locais de recorrentes, orçamentos e diários',
    },
    backup: {
      label: 'Backup e restauração',
      description: 'Faça ou restaure uma cópia local completa',
      accessibilityLabel: 'Abrir backup e restauração',
      accessibilityHint: 'Crie um backup local ou substitua os dados locais a partir de um arquivo de backup',
    },
    dataExport: {
      label: 'Exportar dados',
      description: 'Arquivos CSV legíveis para análise e compartilhamento',
      accessibilityLabel: 'Abrir exportação de dados',
      accessibilityHint: 'Crie arquivos CSV legíveis para planilhas, análises e compartilhamento',
    },
    investments: {
      label: 'Investimentos',
      description: 'Acompanhe saldos, avaliações e retorno estimado',
      accessibilityLabel: 'Abrir investimentos',
      accessibilityHint: 'Veja contas de investimento, avaliações e ganho ou perda estimados',
    },
    reports: {
      label: 'Relatórios',
      description: 'Explore fluxo de caixa, categorias e patrimônio líquido',
      accessibilityLabel: 'Abrir relatórios',
      accessibilityHint: 'Veja receitas, despesas, categorias, patrimônio líquido e comparações entre períodos',
    },
    currency: {
      label: 'Moeda e câmbio',
      description: 'Moeda principal e taxas de câmbio',
      accessibilityLabel: 'Abrir moeda e câmbio',
      accessibilityHint: 'Veja a moeda principal e as taxas de câmbio',
    },
    categories: {
      label: 'Categorias',
      description: 'Gerencie categorias de despesas e receitas',
      accessibilityLabel: 'Gerenciar categorias',
      accessibilityHint: 'Crie, edite, arquive e restaure categorias',
    },
    recurring: {
      label: 'Transações recorrentes',
      description: 'Revise, confirme, pause e agende recorrentes',
      accessibilityLabel: 'Gerenciar transações recorrentes',
      accessibilityHint: 'Veja as pendentes e gerencie as regras recorrentes',
    },
    language: {
      label: 'Idioma',
      accessibilityLabel: 'Alterar idioma',
      accessibilityHint: 'Escolha o idioma do app',
    },
  },
  language: {
    title: 'Idioma',
    intro: 'Escolha o idioma do app. As categorias padrão que você não renomeou também são traduzidas.',
    deviceOption: 'Igual ao dispositivo',
    deviceDetail: (languageName) => `Atual: ${languageName}`,
    selectedHint: 'Selecionado',
    changeFailed: 'Não foi possível alterar o idioma. Tente novamente.',
  },
};
