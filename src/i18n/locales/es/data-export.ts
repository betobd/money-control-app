import type { dataExport as en } from '../en/data-export';
import { createPlural } from '../../plural';

const plural = createPlural('es');

export const dataExport: typeof en = {
  title: 'Exportar datos',
  sizeBytes: (bytes: number) => `unos ${bytes} B`,
  sizeKib: (kib: number) => `unos ${kib} KiB`,
  sizeMib: (mib: string) => `unos ${mib} MiB`,
  confirmMessage: (detail: string) =>
    `Los archivos CSV pueden contener información financiera sensible. Cualquier persona con acceso al archivo puede leerlo. El bloqueo de la app no protege el archivo una vez que sale de Money Control.${detail ? `\n\n${detail}` : ''}`,
  confirmLabel: 'Continuar',
  warningTitle: 'Información financiera sin cifrar',
  warningBody: 'Cualquier persona con acceso a los archivos CSV puede leerlos. Están pensados para hojas de cálculo, análisis y compartir, no para restaurar la app.',
  notBackupTitle: 'Un CSV no es una copia de seguridad',
  notBackupBody: '¿Necesitas restaurar Money Control más adelante? La copia de seguridad conserva los ID y las relaciones en JSON versionado. Un CSV no se puede restaurar.',
  openBackupHint: 'Abre la función de copia de seguridad para restauración completa',
  openBackupLabel: 'Abrir copia de seguridad y restauración',
  openBackupButton: 'Abrir copia de seguridad',
  recordCount: (count: number) => `${count} ${plural(count, 'registro', 'registros')}`,
  emptyCard: 'Aún no hay nada que exportar: este CSV no tendría filas.',
  notRestorable: 'CSV legible · No es una copia restaurable',
  notesPrivacy: 'Desactivado por defecto para proteger la privacidad del archivo.',
  footerNote: 'Los archivos se generan en el dispositivo, se comparten de uno en uno y se eliminan de la caché temporal de Money Control cuando se cierra el menú nativo. Money Control no sube ningún dato.',

  transactionsTitle: 'Movimientos',
  transactionsDescription: 'Filas legibles de movimientos con cuentas de origen y destino, categoría, estado, fechas y notas opcionales.',
  filterDate: (range: string) => `Fecha: ${range}`,
  filterType: (value: string) => `Tipo: ${value}`,
  filterStatus: (value: string) => `Estado: ${value}`,
  filterAccount: (value: string) => `Cuenta: ${value}`,
  filterCategory: (value: string) => `Categoría: ${value}`,
  allTypes: 'Todos',
  allStatuses: 'Todos',
  allAccounts: 'Todas',
  allCategories: 'Todas',
  typeValues: {
    expense: 'gasto',
    income: 'ingreso',
    transfer: 'transferencia',
    refund: 'reembolso',
  },
  statusValues: {
    posted: 'registrado',
    voided: 'anulado',
  },
  activeFilters: (count: number, size: string) =>
    `${count} ${plural(count, 'filtro activo', 'filtros activos')} · ${size}`,
  configureFiltersLabel: 'Configurar filtros de exportación de movimientos',
  configureFilters: 'Configurar filtros',
  includeTransactionNotes: 'Incluir notas de movimientos',
  noTransactionsMatch: 'Ningún movimiento coincide con los filtros seleccionados.',
  largeExport: 'Exportación grande: generarla puede tardar más y usar más memoria.',
  transactionLimitExceeded: 'Ajusta los filtros. Se supera el límite de seguridad de 50.000 filas y no se creará un archivo parcial.',
  exportTransactionsButton: 'Exportar movimientos CSV',
  exportTransactionsTitle: '¿Exportar movimientos?',
  transactionNotesIncluded: 'Las notas de movimientos están activadas y se incluirán.',
  transactionNotesExcluded: 'Las notas de movimientos no se incluyen.',

  accountsTitle: 'Cuentas',
  accountsDescription: 'Cuentas activas y archivadas con saldo inicial y saldo actual calculado. Los campos de deuda de tarjetas usan el modelo de saldo con signo.',
  accountsCaption: 'Incluye todos los tipos de cuenta. Las columnas exclusivas de tarjetas de crédito quedan vacías para las demás cuentas.',
  exportAccountsButton: 'Exportar cuentas CSV',
  exportAccountsTitle: '¿Exportar cuentas?',

  budgetsTitle: 'Presupuestos',
  budgetsDescription: 'Límites mensuales con el mismo gasto calculado, monto restante, porcentaje y estado que muestra Presupuestos.',
  previousBudgetMonth: 'Mes de presupuesto anterior',
  nextBudgetMonth: 'Mes de presupuesto siguiente',
  selectedBudgetMonth: (month: string) => `Mes de presupuesto seleccionado: ${month}`,
  exportBudgetsButton: 'Exportar presupuestos CSV',
  exportBudgetsTitle: '¿Exportar presupuestos?',

  recurringTitle: 'Movimientos recurrentes',
  recurringDescription: 'Solo plantillas recurrentes: programación, ciclo de vida, cuentas, categoría, monto y nota opcional. Exportar nunca genera ocurrencias ni movimientos.',
  includeRecurringNotes: 'Incluir notas recurrentes',
  exportRecurringButton: 'Exportar reglas recurrentes CSV',
  exportRecurringTitle: '¿Exportar reglas recurrentes?',
  recurringNotesIncluded: 'Las notas recurrentes están activadas y se incluirán.',
  recurringNotesExcluded: 'Las notas recurrentes no se incluyen.',

  statementsTitle: 'Extractos de tarjeta de crédito',
  statementsDescription: 'Extractos históricos con saldo y pago mínimo del banco, pagos aplicados, montos pendientes y estado.',
  statementsCaption: 'No se guardan ni exportan números de tarjeta, CVV, fechas de vencimiento, cuotas inferidas ni credenciales.',
  exportStatementsButton: 'Exportar extractos CSV',
  exportStatementsTitle: '¿Exportar extractos de tarjeta?',

  reportTitle: 'Resumen del informe',
  reportDescription: 'Una fila por métrica de resumen, con los mismos periodos y reglas financieras que usa Informes.',
  exportReportButton: 'Exportar resumen CSV',
  exportReportTitle: '¿Exportar resumen del informe?',

  investmentsTitle: 'Inversiones',
  investmentsDescription: 'Cuentas de inversión con valor actual, aportes netos, ganancia o pérdida estimada, rentabilidad simple y valor estimado en tu moneda principal (vacío si no hay tasa de cambio). Incluye inversiones archivadas.',
  investmentsCaption: 'Los valores se estiman con la última valoración manual; la ganancia o pérdida no realizada nunca cuenta como ingreso.',
  exportInvestmentsButton: 'Exportar inversiones CSV',
  exportInvestmentsTitle: '¿Exportar inversiones?',

  valuationsTitle: 'Valoraciones de inversión',
  valuationsDescription: 'Historial completo de valoraciones manuales de cada cuenta de inversión: fecha, moneda, valor y nota opcional.',
  valuationsCaption: 'Una fila por cada valoración registrada en todas las cuentas de inversión.',
  exportValuationsButton: 'Exportar valoraciones CSV',
  exportValuationsTitle: '¿Exportar valoraciones de inversión?',

  unconfirmedCopy: (message: string) => `${message} Money Control no puede confirmar que se haya guardado una copia en el destino.`,
  exportFailed: 'No se pudo completar la exportación CSV. Tus datos financieros no cambiaron. Intenta de nuevo.',
  overviewFailed: 'No se pudieron cargar los conteos de exportación. Intenta abrir esta pantalla de nuevo.',
  exportSucceeded: (fileName: string, rowCount: number, formattedRowCount: string) =>
    `Se generó ${fileName} con ${formattedRowCount} ${plural(rowCount, 'fila', 'filas')}. El menú nativo para guardar o compartir se cerró; Money Control no puede saber si guardaste, compartiste o cancelaste.`,

  noData: {
    transactions: 'Ningún movimiento coincide con las opciones seleccionadas.',
    accounts: 'Ninguna cuenta coincide con las opciones seleccionadas.',
    budgets: 'Ningún presupuesto coincide con las opciones seleccionadas.',
    recurringRules: 'Ninguna regla recurrente coincide con las opciones seleccionadas.',
    creditCardStatements: 'Ningún extracto de tarjeta coincide con las opciones seleccionadas.',
    investments: 'Ninguna inversión coincide con las opciones seleccionadas.',
    investmentValuations: 'Ninguna valoración de inversión coincide con las opciones seleccionadas.',
  },
  rowLimitExceeded: (count: string, maximum: string) =>
    `Esta exportación tiene ${count} filas, más que el límite de seguridad de ${maximum} filas. Ajusta el periodo o los filtros e intenta de nuevo.`,

  writeFailed: 'No se pudo generar el archivo CSV. Revisa el almacenamiento del dispositivo e intenta de nuevo.',
  sharingUnavailable: 'El archivo CSV se generó, pero el menú nativo de Android para guardar o compartir no está disponible.',
  sharingOpenFailed: 'El archivo CSV se generó, pero no se pudo abrir el menú nativo de Android para guardar o compartir.',
  shareFailed: 'El archivo CSV se generó, pero no se pudo compartir.',
  shareDialogTitle: 'Guardar o compartir el CSV de Money Control',
};
