import type { onboarding as en } from '../en/onboarding';

export const onboarding: typeof en = {
  tagline: 'Tu dinero, claro y privado.',
  highlights: {
    privateTitle: 'Privada por diseño',
    privateBody: 'Sin registro. Tus datos se quedan en este teléfono, a menos que los exportes.',
    currencyTitle: 'Cualquier moneda',
    currencyBody: 'Ten cuentas en las monedas que usas y ve cada total en la tuya.',
    budgetsTitle: 'Presupuestos que te mantienen al día',
    budgetsBody: 'Define un tope mensual y límites por categoría, y mira a dónde va tu dinero.',
  },
  getStarted: 'Empezar',
  restore: 'Restaurar una copia de seguridad',
  languageButton: (languageName) => `Idioma: ${languageName}`,
  languageSheetTitle: 'Idioma',
  currencyTitle: 'Moneda principal',
  backToWelcome: 'Volver a la bienvenida',
  currencyQuestion: '¿Qué moneda usas en el día a día?',
  currencyBody: 'Los totales, presupuestos e informes se muestran en esta moneda. Igual puedes tener cuentas en otras monedas.',
  currencyCardLabel: (code, name) => `Moneda principal: ${code}, ${name}`,
  currencyCardHint: 'Abre la lista de monedas',
  change: 'Cambiar',
  lockNote: 'Puedes cambiarla hasta que registres tu primer movimiento o presupuesto. Después queda fija, porque todos los montos se guardan en ella.',
  saveFailed: 'No se pudo guardar tu moneda. Inténtalo de nuevo.',
  start: (code) => `Usar ${code} y empezar`,
  suggested: 'Sugeridas',
  baseCurrency: {
    unsupported: 'Selecciona una moneda compatible.',
    missing: 'Faltan los ajustes de la app en la base de datos.',
    lockedByHistory: (count) =>
      count === 1
        ? 'Tu movimiento guarda su valor en la moneda principal actual. Cambiarla obligaría a recalcularlo con tasas de cambio históricas, que no se guardan.'
        : `Tus ${count} movimientos guardan su valor en la moneda principal actual. Cambiarla obligaría a recalcularlos con tasas de cambio históricas, que no se guardan.`,
    lockedByBudgets: (count) =>
      count === 1
        ? 'Tu presupuesto está definido en la moneda principal actual. Elimínalo para elegir otra moneda principal.'
        : `Tus ${count} presupuestos están definidos en la moneda principal actual. Elimínalos para elegir otra moneda principal.`,
  },
};
