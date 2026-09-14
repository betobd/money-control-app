import { createPlural } from '../../plural';
import type { recurring as en } from '../en/recurring';

const plural = createPlural('es');

export const recurring: typeof en = {
  title: 'Recurrentes',
  createRecurring: 'Crear movimiento recurrente',
  closeRecurring: 'Cerrar movimientos recurrentes',
  sections: 'Secciones de recurrentes',
  tabDue: 'Pendientes',
  tabRules: 'Reglas',
  tabHistory: 'Historial',
  updating: 'Actualizando…',
  backlogLimited: 'Había muchos pendientes y se limitó esta carga. Vuelve a abrir esta pantalla para continuar de forma segura.',
  loadError: 'No se pudieron cargar los movimientos recurrentes.',

  noneDue: 'No hay movimientos recurrentes pendientes para hoy.',
  dueOn: (date: string) => `Pendiente: ${date}`,
  confirmOccurrence: (label: string) => `Confirmar ${label}`,
  editOccurrence: (label: string) => `Editar la ocurrencia ${label}`,
  skipOccurrence: (label: string) => `Omitir la ocurrencia ${label}`,
  skip: 'Omitir',
  skipTitle: '¿Omitir esta ocurrencia?',
  skipMessage: 'Quedará en el historial de recurrentes y no afectará saldos ni informes.',
  unableToConfirm: 'No se pudo confirmar',
  confirmFallback: 'Revisa la ocurrencia e inténtalo de nuevo.',
  unableToSkip: 'No se pudo omitir',
  tryAgain: 'Inténtalo de nuevo.',

  activeRules: 'Reglas activas',
  pausedRules: 'Reglas pausadas',
  endedRules: 'Reglas finalizadas',
  sectionCount: (title: string, count: number) => `${title} · ${count}`,
  createRule: 'Crear regla',
  createFirstRule: 'Crear tu primera regla recurrente',
  emptyTitle: 'Aún no hay reglas recurrentes',
  emptyBody: 'Crea una regla para los gastos, ingresos o transferencias que esperas con regularidad.',
  noActiveRules: 'No hay reglas activas por ahora. Las reglas pausadas y finalizadas aparecen abajo.',
  ruleStatus: {
    active: 'Activa',
    paused: 'Pausada',
    ended: 'Finalizada',
  },
  ruleStatusAccessibility: (status: string) => `Estado de la regla: ${status}`,
  nextOn: (date: string) => `Próximo: ${date}`,
  editFuture: 'Editar a futuro',
  pause: 'Pausar',
  resume: 'Reanudar',
  end: 'Finalizar',
  endTitle: '¿Finalizar el movimiento recurrente?',
  endMessage: 'No se generarán más ocurrencias. El historial y los pendientes se conservan.',
  unableToUpdateRule: 'No se pudo actualizar la regla',
  unableToEndRule: 'No se pudo finalizar la regla',
  account: 'Cuenta',
  category: 'Categoría',

  frequency: {
    daily: 'Diario',
    weekly: 'Semanal',
    monthly: 'Mensual',
    yearly: 'Anual',
  },
  everyTwoWeeks: 'Cada dos semanas',
  everyInterval: (count, unit) => {
    if (unit === 'daily') return `Cada ${count} ${plural(count, 'día', 'días')}`;
    if (unit === 'weekly') return `Cada ${count} ${plural(count, 'semana', 'semanas')}`;
    if (unit === 'monthly') return `Cada ${count} ${plural(count, 'mes', 'meses')}`;
    return `Cada ${count} ${plural(count, 'año', 'años')}`;
  },

  historyEmpty: 'Aquí aparecerán las ocurrencias registradas y omitidas.',
  occurrenceStatus: {
    posted: 'Registrada',
    skipped: 'Omitida',
  },
  occurrenceStatusSpoken: {
    pending: 'pendiente',
    posted: 'registrada',
    skipped: 'omitida',
  },
  historyAccessibility: (status: string, label: string, amount: string, date: string) =>
    `${status}, ${label}, ${amount}, ${date}`,

  createTitle: 'Crear movimiento recurrente',
  editRuleTitle: 'Editar regla futura',
  editOccurrenceTitle: 'Editar esta ocurrencia',
  optionDaily: 'Diario',
  optionWeekly: 'Semanal',
  optionEveryTwoWeeks: 'Cada 2 semanas',
  optionMonthly: 'Mensual',
  optionYearly: 'Anual',
  frequencyLabel: 'Frecuencia',
  sourceAccount: 'Cuenta de origen',
  destinationAccount: 'Cuenta de destino',
  selectAccount: 'Seleccionar cuenta',
  selectSourceAccount: 'Seleccionar cuenta de origen',
  selectDestinationAccount: 'Seleccionar cuenta de destino',
  selectIncomeCategory: 'Seleccionar categoría de ingreso',
  selectExpenseCategory: 'Seleccionar categoría de gasto',
  startDate: 'Fecha de inicio',
  scheduledDate: 'Fecha programada',
  endDateOptional: 'Fecha de fin (opcional)',
  noteOptional: 'Nota (opcional)',
  noteAccessibility: 'Nota del movimiento recurrente',
  notePlaceholder: 'Agrega una descripción…',
  saveRecurring: 'Guardar movimiento recurrente',
  saveError: 'No se pudo guardar el movimiento recurrente.',
  errorAmount: 'Ingresa un monto válido mayor que cero.',

  ruleLoadError: 'No se pudo cargar el movimiento recurrente.',
  occurrenceLoadError: 'No se pudo cargar la ocurrencia.',

  ruleNotFound: 'No se encontró el movimiento recurrente.',
  occurrenceNotFound: 'No se encontró la ocurrencia recurrente.',
  alreadyHandled: 'Esta ocurrencia recurrente ya fue gestionada.',
  endedCannotEdit: 'Los movimientos recurrentes finalizados no se pueden editar.',
  endedCannotResume: 'Los movimientos recurrentes finalizados no se pueden reanudar.',
  hasEnded: 'Este movimiento recurrente ya finalizó.',
  missingExchangeRate: (currency: string, baseCurrency: string) =>
    `Agrega una tasa de cambio ${currency}/${baseCurrency} antes de registrar este movimiento.`,
  errorDateFormat: 'Ingresa una fecha válida en formato AAAA-MM-DD.',
  errorFrequency: 'Selecciona una frecuencia compatible.',
  errorInterval: 'El intervalo debe ser un número entero positivo.',
  errorStartDate: 'Ingresa una fecha de inicio válida.',
  errorEndDate: 'Ingresa una fecha de fin válida.',
  errorEndBeforeStart: 'La fecha de fin no puede ser anterior a la fecha de inicio.',
  errorCrossCurrencyTransfer: 'Las transferencias recurrentes entre monedas distintas no son compatibles.',
};
