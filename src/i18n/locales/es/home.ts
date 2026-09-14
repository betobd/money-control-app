import type { home as en } from '../en/home';

export const home: typeof en = {
  loadError: 'No se pudo cargar tu resumen en este momento.',
  loadingDashboard: 'Cargando tu resumen',

  selectedMonth: (month) => `Mes seleccionado, ${month}`,
  previousMonthHint: 'Muestra el resumen y los presupuestos del mes anterior',
  nextMonthHint: 'Muestra el resumen y los presupuestos del mes siguiente',

  totalBalance: 'Saldo total',
  estimatedNetWorth: 'Patrimonio neto estimado',
  netWorthIncompleteLabel: (currencies) =>
    `El patrimonio neto estimado está incompleto porque no hay tasa de cambio para ${currencies}`,
  estimatedIncomplete: 'Estimado — incompleto',
  netInMonth: (month) => `neto en ${month}`,

  income: 'Ingresos',
  refunds: 'Reembolsos',
  netExpenses: 'Gastos netos',
  netResult: 'Resultado neto',

  investments: 'Inversiones',
  investmentsHint: 'Abre la pantalla de inversiones',
  investmentsLabel: (value) => `Inversiones, valor actual ${value}`,
  investmentsIncompleteValue: 'estimado, incompleto',
  viewInvestments: 'Ver inversiones',
  gainLossUnavailable: 'Ganancia/pérdida estimada no disponible',
  gainLoss: (amount) => `${amount} de ganancia/pérdida estimada`,
  asOf: (date) => `al ${date}`,

  monthlyCeiling: 'Tope mensual',
  monthlyBudget: 'Presupuesto mensual',
  budgetCardLabel: (title, spent, total, percentage, over) =>
    `${title}, ${spent} gastado de ${total}, ${percentage}% usado${over ? ', por encima del presupuesto' : ''}`,
  noBudgets: 'No hay presupuestos para este mes',
  percentUsed: (percentage) => `${percentage}% usado`,
  overBudget: 'Excedido',
  spent: (amount) => `${amount} gastado`,
  ofTotal: (amount) => `de ${amount}`,
  ceilingNote: 'Todo el gasto de este mes, incluido lo que no cubre ningún presupuesto por categoría.',
  byCategory: 'Por categoría',
  viewAll: 'Ver todo',
  viewAllBudgets: 'Ver todos los presupuestos',
  categoryRowLabel: (category, percentage, over) =>
    `${category}, ${percentage}% usado${over ? ', por encima del presupuesto' : ''}`,

  recentTransactions: 'Movimientos recientes',
  viewAllTransactions: 'Ver todos los movimientos',
  noRecentTransactions: 'No hay movimientos recientes.',
};
