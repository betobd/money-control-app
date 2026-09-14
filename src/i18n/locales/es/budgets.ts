import { createPlural } from '../../plural';
import type { budgets as en } from '../en/budgets';

const plural = createPlural('es');

export const budgets: typeof en = {
  createBudget: 'Crear presupuesto',
  selectedMonth: (month: string) => `Mes seleccionado, ${month}`,
  monthlyBudgets: 'Presupuestos del mes',
  monthlyCategoryBudgets: 'Presupuestos por categoría del mes',

  status: {
    'on-track': 'En orden',
    'near-limit': 'Casi agotado',
    'fully-used': 'Agotado',
    'over-budget': 'Excedido',
  },

  spent: 'Gastado',
  remaining: 'Disponible',
  overBy: 'Excedido en',
  spentOfLimit: (spent: string, limit: string) => `${spent} de ${limit}`,
  percentUsed: (percentage: number) => `${percentage}% usado`,
  subLimit: 'Sublímite',
  monthlyTag: 'Mensual',
  inParent: (parent: string) => `en ${parent}`,
  archivedCategory: 'Categoría archivada',
  cardHint: 'Abre la edición del presupuesto',
  cardAccessibility: (value) =>
    `${value.category}${value.archived ? ', categoría archivada' : ''}, ${value.status}, gastado ${value.spent} de ${value.limit}, ${value.over ? 'excedido en' : 'disponible'} ${value.remaining}, ${value.percentage}% usado`,
  progressAccessibility: (status: string, percentage: number) => `${status}, ${percentage}% usado`,

  totalMonthlyBudget: 'Presupuesto mensual total',
  summaryAccessibility: (total: string, spent: string, remaining: string, percentage: number) =>
    `Presupuesto mensual total ${total}, gastado ${spent}, disponible ${remaining}, ${percentage}% usado`,
  overallProgress: 'Progreso general',
  nestedNote: (count: number) =>
    plural(
      count,
      `${count} sublímite se cuenta dentro de su categoría, no se suma al total.`,
      `${count} sublímites se cuentan dentro de sus categorías, no se suman al total.`,
    ),

  emptyTitle: 'No hay presupuestos este mes',
  emptyBody: 'Crea un presupuesto por categoría para empezar a planear tus gastos del mes.',
  createFirstBudget: 'Crear el primer presupuesto',
  loadingBudgets: 'Cargando presupuestos',
  retryLoading: 'Reintentar cargar los presupuestos',
  loadBudgetsError: 'No se pudieron cargar los presupuestos.',

  expenseCategory: 'Categoría de gasto',
  searchExpenseCategories: 'Buscar categorías de gasto',
  searchCategories: 'Buscar categorías',
  categoryOption: (name: string, archived: boolean) => `${name}${archived ? ', archivada' : ''}`,
  archived: 'Archivada',
  noMatchingCategories: 'No hay categorías de gasto activas que coincidan.',

  budgetColor: 'Color del presupuesto',
  colors: {
    blue: 'Azul',
    teal: 'Verde azulado',
    green: 'Verde',
    amber: 'Ámbar',
    coral: 'Coral',
    pink: 'Rosa',
    purple: 'Morado',
    indigo: 'Índigo',
  },

  closeForm: 'Cerrar formulario de presupuesto',
  editTitle: 'Editar presupuesto',
  createTitle: 'Crear presupuesto',
  category: 'Categoría',
  budgetMonth: 'Mes del presupuesto',
  budgetMonthInput: 'Mes del presupuesto en formato AAAA-MM',
  monthPlaceholder: 'AAAA-MM',
  budgetLimit: 'Límite del presupuesto',
  repeatTitle: 'Repetir cada mes',
  repeatHint: 'Aparece automáticamente cada mes. Si cambias el monto, se aplica desde este mes en adelante.',
  repeatAccessibility: 'Repetir este presupuesto cada mes',
  removeBudget: 'Eliminar presupuesto',
  removeTitle: '¿Eliminar el presupuesto?',
  removeRecurringMessage:
    'Esto detiene el presupuesto recurrente y lo elimina de este mes y de los siguientes. Los meses anteriores se conservan. No se eliminan categorías ni movimientos.',
  removeOneOffMessage: 'Esto elimina solo el plan de este mes. No se eliminan categorías ni movimientos.',
  saveBudgetChanges: 'Guardar cambios del presupuesto',
  saveChanges: 'Guardar cambios',
  loadError: 'No se pudo cargar el presupuesto.',
  saveError: 'No se pudo guardar el presupuesto.',
  removeError: 'No se pudo eliminar el presupuesto.',
  notFound: 'No se encontró el presupuesto.',

  errorSelectExpenseCategory: 'Selecciona una categoría de gasto.',
  errorSelectExistingCategory: 'Selecciona una categoría de gasto existente.',
  errorSelectActiveCategory: 'Selecciona una categoría de gasto activa.',
  errorInvalidMonth: 'Ingresa un mes válido en formato AAAA-MM.',
  errorLimitRange: 'Ingresa un límite positivo dentro del rango permitido.',
  errorInvalidColor: 'Selecciona un color de presupuesto válido.',
  errorRecurringExists: 'Esta categoría ya tiene un presupuesto recurrente.',
  errorDuplicate: 'Esta categoría ya tiene un presupuesto para el mes seleccionado.',
  errorCeilingLimit: 'Ingresa un límite entero positivo.',

  monthlyCeiling: 'Tope mensual',
  ceilingAccessibility: (limit: string, spent: string, over: boolean, remaining: string, percentage: number) =>
    `Tope mensual ${limit}, gastado ${spent}, ${over ? 'excedido en' : 'disponible'} ${remaining}, ${percentage}% usado`,
  carriedForward: (month: string) => `Vigente desde ${month}.`,
  spentThisMonth: 'Gastado este mes',
  allSpending: 'Todos los gastos',
  ceilingOverAllocated: (total: string, excess: string) =>
    `Los presupuestos por categoría suman ${total}, ${excess} por encima de este tope.`,
  ceilingUnallocated: (total: string, unallocated: string) =>
    `${total} está planeado en presupuestos por categoría; ${unallocated} de este tope no tiene presupuesto asignado.`,
  ceilingEmptyBody:
    'Define un límite general para el mes. Todos los gastos cuentan, incluso los que ningún presupuesto por categoría cubre.',
  setMonthlyCeiling: 'Definir tope mensual',

  closeCeilingForm: 'Cerrar formulario del tope mensual',
  ceilingFor: (month: string) => `Tope para ${month}`,
  ceilingHelpCounts:
    'Cuenta cada gasto registrado, menos los reembolsos, incluidos los que ningún presupuesto por categoría cubre. Las transferencias y los aportes a inversiones no cuentan.',
  ceilingHelpApplies: (month: string) =>
    `Se aplica desde ${month} en adelante hasta que lo cambies. Un mes posterior que definas por separado conserva su propio tope.`,
  removeCeiling: 'Eliminar tope',
  saveCeiling: 'Guardar tope',
  setCeiling: 'Definir tope',
  remove: 'Eliminar',
  removeCeilingTitle: '¿Eliminar el tope mensual?',
  removeCeilingMessage: (month: string) =>
    `No se aplicará ningún tope desde ${month} en adelante. Los meses anteriores conservan el suyo y ningún presupuesto por categoría se ve afectado.`,
  ceilingEnterPositive: 'Ingresa un monto positivo.',
  ceilingLoadError: 'No se pudo cargar el tope mensual.',
  ceilingSaveError: 'No se pudo guardar el tope mensual.',
  ceilingRemoveError: 'No se pudo eliminar el tope mensual.',
};
