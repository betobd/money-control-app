import type { refunds as en } from '../en/refunds';

export const refunds: typeof en = {
  title: 'Agregar reembolso',
  cancel: 'Cancelar reembolso',
  loadingExpense: 'Cargando gasto…',
  expenseNotFound: 'No se encontró el gasto.',
  originalExpense: 'Gasto original',
  expenseFallback: 'Gasto',
  gross: 'Bruto',
  refunded: 'Reembolsado',
  remaining: 'Pendiente',
  explanation: (account: string) =>
    `Un reembolso reduce los gastos y devuelve el dinero a ${account}. No es un ingreso.`,
  amountLabel: (currency: string) => `Monto del reembolso (${currency})`,
  amountA11y: (currencyName: string) => `Monto del reembolso en ${currencyName}`,
  maximumRefundable: (amount: string) => `Máximo reembolsable: ${amount}`,
  foreignRateNote: (currency: string, base: string) =>
    `Un reembolso en ${currency} usa la tasa de referencia ${currency}/${base} guardada actualmente. Tu banco puede usar otra tasa.`,
  date: 'Fecha del reembolso',
  noteOptional: 'Nota (opcional)',
  noteA11y: 'Nota del reembolso, opcional',
  notePlaceholder: 'Reembolso del comercio, corrección…',
  save: 'Guardar reembolso',
  errors: {
    validationFailed: 'No se pudo validar el reembolso.',
    missingRate: (currency: string, base: string) =>
      `Agrega una tasa de cambio ${currency}/${base} antes de guardar este reembolso.`,
    unableToSave: 'No se pudo guardar el reembolso.',
    unableToLoadSummary: 'No se pudo cargar el detalle del reembolso.',
    originalNotFound: 'El gasto original ya no existe.',
    notPostedExpense: 'Solo se pueden agregar reembolsos a un gasto registrado.',
    dateBeforeExpense: 'La fecha del reembolso no puede ser anterior al gasto original.',
    dateInFuture: 'La fecha del reembolso no puede ser futura.',
    exceedsRemaining: 'El reembolso no puede superar el monto pendiente por reembolsar.',
    fullyRefunded: 'Este gasto ya se reembolsó por completo.',
    notFound: 'No se encontró el reembolso.',
    alreadyVoided: 'El reembolso ya está anulado.',
    changedBeforeVoid: 'El reembolso cambió antes de poder anularlo.',
    unableToLoadVoided: 'No se pudo cargar el reembolso anulado.',
    unableToVoid: 'No se pudo anular el reembolso.',
  },
};
