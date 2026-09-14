import type { reports as en } from '../en/reports';
import { createPlural } from '../../plural';

const plural = createPlural('es');

export const reports: typeof en = {
  title: 'Informes',
  headerSubtitle: 'Tu historial financiero guardado',
  backFromReports: 'Volver desde Informes',
  loadingReports: 'Cargando informes',
  loadErrorTitle: 'No se pudieron cargar los informes',
  loadError: 'No se pudieron cargar los informes.',
  budgetsLoadError: 'No se pudieron cargar los presupuestos de este periodo.',
  updating: 'Actualizando todas las secciones del informe…',

  presetCurrentMonth: 'Mes actual',
  presetPreviousMonth: 'Mes anterior',
  presetLast3Months: 'Últimos 3 meses',
  presetLast6Months: 'Últimos 6 meses',
  presetCurrentYear: 'Año actual',
  presetCustom: 'Personalizado',
  startDate: 'Fecha de inicio',
  endDate: 'Fecha de fin',
  applyRange: 'Aplicar rango',
  applyRangeLabel: 'Aplicar periodo personalizado del informe',
  invalidPeriod: 'Periodo del informe no válido.',
  selectedPeriod: (label) => `Periodo del informe seleccionado, ${label}`,

  invalidToday: 'No se pudo determinar una fecha local válida de Bogotá.',
  invalidCustomDates: 'Ingresa fechas de inicio y fin válidas en formato AAAA-MM-DD.',
  endBeforeStart: 'La fecha de fin no puede ser anterior a la de inicio.',

  netWorthStart: 'Inicio',
  unknownCategory: 'Categoría desconocida',
  noSubcategory: 'Sin subcategoría',

  emptyTitle: 'No hay ingresos ni gastos registrados',
  emptyDescription:
    'Los totales siguen en cero para este periodo. No cuentan las transferencias, los movimientos anulados ni las repeticiones recurrentes pendientes u omitidas.',

  summaryTitle: 'Resumen del periodo',
  summaryDescription: 'Ingresos y gastos registrados en el periodo seleccionado.',
  netResult: 'Resultado neto',
  income: 'Ingresos',
  expenses: 'Gastos',
  net: 'Neto',
  netExpenses: 'Gastos netos',
  grossExpenses: 'Gastos brutos',
  refunds: 'Reembolsos',
  averageExpense: 'Gasto promedio',
  expenseTransactions: 'Movimientos de gasto',
  incomeTransactions: 'Movimientos de ingreso',
  refundTransactions: 'Movimientos de reembolso',
  largestExpense: 'Mayor gasto',
  noLargestExpense: 'No hay gastos registrados en este periodo.',
  savingsRateNotApplicable: 'Sin ingresos en este periodo, la tasa de ahorro no aplica.',
  savingsRate: (percentage) => `Ahorraste el ${percentage} de lo que ganaste.`,
  showDetails: 'Ver detalles',
  hideDetails: 'Ocultar detalles',
  showSummaryDetails: 'Ver detalles del resumen',
  hideSummaryDetails: 'Ocultar detalles del resumen',

  cashFlowTitle: 'Ingresos vs. gastos',
  cashFlowDescriptionDay:
    'Una columna por día (hora de Bogotá). Los ingresos suben sobre la línea y los gastos bajan de ella.',
  cashFlowDescriptionMonth:
    'Una columna por mes calendario. Los ingresos suben sobre la línea y los gastos bajan de ella.',
  wholePeriod: 'Todo el periodo',
  cashFlowChartLabel: (income, expenses) =>
    `Gráfico de flujo de caja. Ingresos totales ${income}. Gastos totales ${expenses}.`,
  cashFlowHint: 'Toca una columna para ver su detalle.',
  cashFlowHintSelected: 'Toca la columna otra vez para ver todo el periodo.',

  paceTitle: 'Ritmo de gasto',
  paceDescription: (previousPeriod) =>
    `Total acumulado de gastos netos, frente al mismo punto del periodo anterior (${previousPeriod}).`,
  previousPeriod: 'Periodo anterior',
  thisPeriod: 'Este periodo',
  spentSoFar: 'Gastado hasta ahora',
  versusLast: (signedAmount) => `${signedAmount} vs. anterior`,
  paceChartLabel: (spent, previousAmount, previousPeriod) =>
    `Gasto acumulado. ${spent} hasta ahora, frente a ${previousAmount} en el mismo punto (${previousPeriod}).`,

  budgetTitle: 'Presupuesto vs. real',
  budgetDescription:
    'Presupuestos por categoría frente a lo que realmente se gastó. El gasto ya descuenta los reembolsos y excluye las transferencias.',
  budgetSumHint: (monthCount) =>
    `Los límites suman ${monthCount} presupuestos mensuales; los presupuestos nunca se prorratean.`,
  budgetRowLabel: (category, spent, limit, percentage) =>
    `${category}, ${spent} gastado de ${limit}, ${percentage}% usado`,
  spentOfLimit: (spent, limit) => `${spent} de ${limit}`,
  remaining: (amount) => `quedan ${amount}`,
  over: (amount) => `${amount} por encima`,

  weekdayTitle: 'Gasto por día de la semana',
  weekdayDescription:
    'Gasto neto promedio por día de la semana, dividido entre las veces que ese día aparece en el periodo.',
  weekdayColumnLabel: (shortDay, longDay, average, dayCount) =>
    `${longDay}, promedio ${average} en ${dayCount} ${plural(dayCount, 'día', 'días')}`,
  heaviestDay: (shortDay, longDay, weekday, amount) =>
    `El ${longDay} es tu día de mayor gasto: ${amount} en promedio.`,
  noWeekdayExpenses: 'No hay gastos para comparar entre días de la semana.',

  categoryTitle: 'Gastos por categoría',
  categoryDescription:
    'Todos los gastos registrados, ordenados por ID estable de categoría, incluidas las categorías archivadas.',
  categoryEmpty: 'No hay gastos registrados para ordenar en este periodo.',
  donutLabel: (total) => `Gastos por categoría. Total ${total}.`,
  totalExpenses: 'Gastos totales',
  otherCategories: (count) => `Otras (${count})`,
  expensesRanked: 'Gastos ordenados por categoría',
  transactionCount: (count) => `${count} ${plural(count, 'movimiento', 'movimientos')}`,
  inDetail: (count) => `${count} en detalle`,
  shareOfCategory: (percentage, category) => `${percentage} de ${category}`,
  showBreakdownHint: 'Muestra el desglose por subcategoría',
  hideBreakdownHint: 'Oculta el desglose por subcategoría',

  netWorthTitle: 'Evolución del patrimonio neto',
  netWorthDescriptionDay: (date) =>
    `Parte del patrimonio neto anterior al ${date} y aplica el historial registrado hasta cada día.`,
  netWorthDescriptionMonth: (date) =>
    `Parte del patrimonio neto anterior al ${date} y aplica el historial registrado hasta cada cierre de mes.`,
  noNetWorthHistory: 'No hay historial de patrimonio neto para este periodo.',
  endingNetWorth: 'Patrimonio neto final',
  netWorthChartLabel: (start, end) =>
    `Evolución del patrimonio neto. Empieza en ${start} y termina en ${end}.`,

  investmentsTitle: 'Inversiones',
  investmentsDescription:
    'Posición actual de inversión (estimada) más los ingresos de inversión realizados en el periodo. Los cambios de valoración no realizados suben el patrimonio neto, pero nunca cuentan como ingreso ordinario.',
  currentValue: 'Valor actual',
  estimatedIncomplete: 'Estimado — incompleto',
  netContributions: 'Aportes netos',
  estimatedGainLoss: 'Ganancia/pérdida estimada',
  simpleEstimatedReturn: 'Rentabilidad simple estimada',
  investmentIncomePeriod: 'Ingresos de inversión (periodo)',

  comparisonTitle: 'Comparación con el periodo anterior',
  comparisonDescription: (previousPeriod) =>
    `Comparado con el periodo anterior (${previousPeriod}). Un aumento de gastos se muestra como indicador negativo.`,
  noChange: 'Sin cambios',
  noPreviousData: 'Sin datos del periodo anterior',
  percentageUnavailable: 'porcentaje no disponible',
  increasedBy: (difference, percentage) => `Subió ${difference} (${percentage})`,
  decreasedBy: (difference, percentage) => `Bajó ${difference} (${percentage})`,
  comparisonRowLabel: (label, current, change) => `${label}. Actual ${current}. ${change}.`,
};
