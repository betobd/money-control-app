import type { notifications as en, ReminderTiming } from '../en/notifications';
import { createPlural } from '../../plural';

const plural = createPlural('es');

// Masculine: agrees with "movimiento".
const timingMasculine = (timing: ReminderTiming) =>
  timing === 'upcoming' ? 'se acerca' : timing === 'overdue' ? 'está vencido' : 'vence hoy';
// Feminine: agrees with "transferencia".
const timingFeminine = (timing: ReminderTiming) =>
  timing === 'upcoming' ? 'se acerca' : timing === 'overdue' ? 'está vencida' : 'vence hoy';

export const notifications: typeof en = {
  channels: {
    recurringName: 'Recordatorios recurrentes',
    recurringDescription: 'Recordatorios de movimientos recurrentes pendientes y próximos',
    budgetsName: 'Alertas de presupuesto',
    budgetsDescription: 'Alertas cuando los presupuestos mensuales se acercan a su límite o lo alcanzan',
    creditCardsName: 'Recordatorios de tarjetas de crédito',
    creditCardsDescription: 'Recordatorios de cierre de extracto y fecha de pago',
    dailyName: 'Recordatorios diarios',
    dailyDescription: 'Recordatorios discretos para revisar tus finanzas',
  },

  content: {
    reminderTitle: 'Recordatorio de Money Control',
    recurringPrivate: (timing) =>
      timing === 'upcoming'
        ? 'Tienes un movimiento recurrente próximo por revisar.'
        : timing === 'overdue'
          ? 'Tienes un movimiento recurrente vencido por revisar.'
          : 'Tienes un movimiento recurrente por revisar.',
    recurringTransfer: (amount, timing) =>
      `Una transferencia recurrente de ${amount} ${timingFeminine(timing)}.`,
    recurringCategory: (category, amount, timing) =>
      category
        ? `El movimiento recurrente de ${category} por ${amount} ${timingMasculine(timing)}.`
        : `Un movimiento recurrente por ${amount} ${timingMasculine(timing)}.`,
    budgetReachedTitle: 'Límite de presupuesto alcanzado',
    budgetNearingTitle: 'Presupuesto cerca del límite',
    budgetReachedPrivate: 'Un presupuesto alcanzó su límite.',
    budgetNearingPrivate: 'Un presupuesto está cerca de su límite.',
    budgetReachedDetail: (label, month) => `${label} alcanzó su presupuesto de ${month}.`,
    budgetNearingDetail: (label, percent, month) =>
      `${label} ya usó el ${percent}% de su presupuesto de ${month}.`,
    dailyBody: 'Tómate un momento para revisar tus finanzas.',
    testTitle: 'Prueba de Money Control',
    testBody: 'Los recordatorios locales están listos en este dispositivo.',
    cardClosingTitle: 'El extracto cierra pronto',
    cardDueTitle: 'Pago de tarjeta de crédito pendiente',
    cardClosingPrivate: 'El extracto de una tarjeta de crédito cierra pronto.',
    cardDuePrivate: 'Se acerca la fecha de pago de una tarjeta de crédito.',
    cardClosingDetail: (card, date) => `${card} cierra el ${date}.`,
    cardDueDetail: (card, amount, date) =>
      `${card} tiene ${amount} pendientes, con fecha de pago el ${date}.`,
  },

  settings: {
    title: 'Notificaciones',
    loadingLabel: 'Cargando ajustes de notificaciones',
    backLabel: 'Volver desde los ajustes de notificaciones',
    allowTitle: '¿Permitir recordatorios locales?',
    allowMessage: 'Money Control usa las notificaciones de Android solo para las categorías de recordatorio que elijas. Ningún dato financiero sale de este dispositivo.',
    continue: 'Continuar',
    notNow: 'Ahora no',
    permissionSection: 'Permiso de Android',
    openAndroidSettings: 'Abrir ajustes de Android',
    enableNotifications: 'Activar notificaciones',
    enableTitle: '¿Activar recordatorios locales?',
    enableMessage: 'Android te preguntará si Money Control puede mostrar los recordatorios que elijas.',
    pauseAll: 'Pausar todos los recordatorios',
    resume: 'Reanudar notificaciones',
    categoriesSection: 'Categorías de recordatorio',
    recurringDescription: 'Elementos recurrentes pendientes, vencidos y próximos',
    recurringLabel: 'Movimientos recurrentes',
    reminderTime: 'Hora del recordatorio',
    advanceNotice: 'Anticipación',
    sameDay: 'Mismo día',
    advanceDays: (days) => `${days} ${plural(days, 'día', 'días')}`,
    budgetsDescription: 'Una alerta cerca del 80% y otra al 100%',
    budgetsLabel: 'Umbrales de presupuesto',
    cardsDescription: 'Recordatorios de cierre de extracto y fecha de pago',
    cardsLabel: 'Tarjetas de crédito',
    closingDescription: 'Un día antes de la fecha de cierre calculada',
    closingLabel: 'Recordatorio de cierre',
    paymentDueReminders: 'Recordatorios de pago',
    dueThreeDaysDescription: 'Tres días antes de la fecha de pago del extracto',
    dueThreeDaysLabel: '3 días antes',
    dueOneDayDescription: 'Un día antes de la fecha de pago del extracto',
    dueOneDayLabel: '1 día antes',
    dueTodayDescription: 'En la fecha de pago del extracto',
    dueTodayLabel: 'Vence hoy',
    dailyDescription: 'Un aviso diario y discreto para revisar tus finanzas',
    dailyLabel: 'Revisión diaria',
    dailyTime: 'Hora del recordatorio diario',
    privacySection: 'Privacidad de las notificaciones',
    private: 'Privado',
    detailed: 'Detallado',
    privacyDescription: 'Privado oculta montos, cuentas, categorías, saldos y notas. Detallado puede mostrar una categoría y un monto, pero nunca notas ni datos completos de la cuenta.',
    appLockWarning: 'El bloqueo de la app está activado. Se recomienda el contenido privado para proteger la pantalla de bloqueo.',
    testSection: 'Prueba y entrega',
    sendTest: 'Enviar notificación de prueba',
    cancelTest: 'Cancelar prueba pendiente',
    deliveryDescription: 'Las horas de los recordatorios siguen el reloj local del dispositivo. Las fechas financieras recurrentes siguen siendo fechas del calendario de Bogotá. Android puede retrasar la entrega durante Doze o la optimización de batería.',
    attentionTitle: 'Algunos recordatorios requieren atención',
    attentionBody: 'Money Control no pudo completar la última actualización de notificaciones. Los datos financieros se guardaron con normalidad.',
    dismissMessage: 'Cerrar mensaje',
    currentValue: (value) => `Valor actual ${value}`,
    chooseTime: 'Elige la hora local',
    hour: 'Hora',
    minute: 'Minuto',
    saveTime: (time) => `Guardar ${time}`,
    permissionGrantedTitle: 'Permitido por Android',
    permissionBlockedTitle: 'Bloqueado en los ajustes de Android',
    permissionDeniedTitle: 'Permiso denegado',
    permissionUnavailableTitle: 'Notificaciones no disponibles',
    permissionNotEnabledTitle: 'Aún no activadas',
    permissionGrantedDescription: 'Android puede mostrar las categorías de recordatorio locales que actives abajo.',
    permissionBlockedDescription: 'Abre los ajustes de Android para permitir las notificaciones. Money Control sigue funcionando con normalidad.',
    permissionDeniedDescription: 'Puedes intentarlo de nuevo cuando quieras. No se necesita el permiso de recordatorios para usar la app.',
    permissionUnavailableDescription: 'Este entorno no puede programar notificaciones de Android. Las funciones financieras no se ven afectadas.',
    permissionNotEnabledDescription: 'Money Control solo pedirá permiso cuando decidas activar los recordatorios locales.',
  },

  results: {
    loadFailed: 'No se pudieron cargar los ajustes de notificaciones.',
    changeFailed: 'No se pudo completar el cambio de notificaciones. Inténtalo de nuevo.',
    permissionUpdated: 'Permiso de notificaciones actualizado.',
    paused: 'Todos los recordatorios de Money Control están en pausa.',
    reminderEnabled: 'Recordatorio activado.',
    reminderDisabled: 'Recordatorio desactivado.',
    recurringTimeUpdated: 'Hora del recordatorio recurrente actualizada.',
    advanceUpdated: 'Anticipación actualizada.',
    dailyTimeUpdated: 'Hora del recordatorio diario actualizada.',
    privacyUpdated: 'Privacidad de las notificaciones actualizada.',
    cardClosingUpdated: 'Recordatorio de cierre de tarjeta actualizado.',
    cardDueUpdated: 'Recordatorio de pago de tarjeta actualizado.',
    testScheduled: 'Notificación de prueba programada para dentro de unos cinco segundos.',
    testCanceled: 'Notificación de prueba cancelada.',
  },
};
