import type { addTransaction as en } from '../en/add-transaction';
import { createPlural } from '../../plural';

const plural = createPlural('es');

export const addTransaction: typeof en = {
  title: 'Agregar movimiento',
  close: 'Cerrar Agregar movimiento',
  unableToSave: 'No se pudo guardar el movimiento.',
  missingPairRate: (currency: string, base: string) =>
    `Agrega una tasa de cambio ${currency}/${base} antes de guardar este movimiento.`,
  referenceRate: (rate: string, date: string) =>
    `Tasa de referencia ${rate} · fecha de la tasa ${date}. Tu banco puede usar otra tasa.`,
  noRate: (currency: string, base: string) =>
    `No hay tasa de cambio disponible. Agrega una tasa ${currency}/${base} en Más → Moneda y tasas antes de guardar.`,
  transferReducesDebt: 'Esta transferencia reduce la deuda actual de la tarjeta.',
  transferIncreasesDebt: 'Esto aumenta la deuda actual de la tarjeta o reduce el saldo a favor.',
  selectAccount: 'Seleccionar cuenta',
  selectSourceAccount: 'Seleccionar cuenta de origen',
  selectDestinationAccount: 'Seleccionar cuenta de destino',
  selectCategory: 'Seleccionar categoría',
  selectExpenseCategory: 'Seleccionar categoría de gasto',
  selectIncomeCategory: 'Seleccionar categoría de ingreso',
  amountReceived: (currency: string) => `Monto recibido (${currency})`,
  amountReceivedA11y: (currency: string) => `Monto recibido en ${currency}`,
  estimateFromRate: 'Estimar con la tasa de referencia',
  amountReceivedHelp: 'Ingresa el monto que realmente acreditó tu banco. Se guardan ambos montos.',
  manageCategories: 'Administrar categorías',
  sourceAccount: 'Cuenta de origen',
  destinationAccount: 'Cuenta de destino',
  fromAccount: 'Cuenta de origen',
  toAccount: 'Cuenta de destino',
  transferDescription: 'Mueve dinero entre dos cuentas distintas',
  transactionDate: 'Fecha del movimiento',
  noteOptional: 'Nota (opcional)',
  noteA11y: 'Nota del movimiento, opcional',
  notePlaceholder: 'Agrega una descripción…',
  transactionType: 'Tipo de movimiento',
  amount: 'Monto',
  amountIn: (currencyName: string) => `Monto en ${currencyName}`,
  upToTwoDecimals: 'Hasta 2 decimales',
  wholeUnitsOnly: 'Sin decimales',
  saving: 'Guardando…',
  save: {
    expense: 'Guardar gasto',
    income: 'Guardar ingreso',
    transfer: 'Guardar transferencia',
  },
  saved: {
    expense: 'Gasto guardado',
    income: 'Ingreso guardado',
    transfer: 'Transferencia guardada',
  },
  accountPicker: {
    close: 'Cerrar selector de cuentas',
    empty: 'Aún no hay cuentas activas. Agrega una cuenta primero y luego elígela aquí.',
    accountA11y: (name: string, type: string, balance: string) => `${name}, ${type}, saldo ${balance}`,
  },
  categoryGrid: {
    title: 'Categoría',
    viewAll: 'Ver todas',
    viewAllA11y: 'Ver todas las categorías',
    hasSubcategories: (count: number) => `Tiene ${count} ${plural(count, 'subcategoría', 'subcategorías')}`,
    categoryA11y: (name: string) => `Categoría ${name}`,
    noActive: 'No hay categorías activas.',
    detail: (name: string) => `Detalle de ${name}`,
    none: 'Ninguna',
    noneA11y: (category: string) => `Sin subcategoría, solo ${category}`,
    subcategoryA11y: (subcategory: string, category: string) => `${subcategory}, subcategoría de ${category}`,
  },
  categoryPicker: {
    close: 'Cerrar selector de categorías',
    searchLabel: 'Buscar categorías',
    searchPlaceholder: 'Buscar categorías…',
    noMatches: (query: string) => `Ninguna categoría coincide con “${query}”.`,
    noActive: 'Aún no hay categorías activas.',
    subcategoryA11y: (subcategory: string, category: string) => `${subcategory}, subcategoría de ${category}`,
  },
};
