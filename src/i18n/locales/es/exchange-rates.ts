import type { exchangeRates as en } from '../en/exchange-rates';

export const exchangeRates: typeof en = {
  title: 'Moneda y tasas',
  savedRate: (currency, base) => `Se guardó la tasa ${currency}/${base}.`,
  baseCurrencyNow: (code) => `Tu moneda principal ahora es ${code}.`,
  cannotChangeBaseTitle: 'No se puede cambiar la moneda principal',
  cannotChangeBaseFallback: 'No se pudo cambiar la moneda principal.',
  confirmBaseTitle: (code) => `¿Usar ${code} como moneda principal?`,
  confirmBaseMessage: (code) =>
    `Todos los totales consolidados (patrimonio neto, Inicio, Informes y Presupuestos) se mostrarán en ${code}. Puedes cambiarla libremente hasta que registres tu primer movimiento o presupuesto.`,
  confirmBaseLabel: (code) => `Usar ${code}`,
  baseCurrency: 'Moneda principal',
  baseCurrencyBody: (name, code) =>
    `${name}. Todos los totales consolidados (patrimonio neto, Inicio, Informes y Presupuestos) se muestran en ${code}. Cada cuenta conserva su propia moneda.`,
  changeBaseCurrency: 'Cambiar moneda principal',
  baseCurrencyUnlockedHint:
    'Puedes cambiarla libremente hasta que registres tu primer movimiento o presupuesto. Después queda fija, porque todos los montos guardados se miden con ella.',
  exchangeRatesTitle: 'Tasas de cambio',
  noRatesNeeded: (code) =>
    `Todas tus cuentas están en ${code}, así que no necesitas ninguna tasa de cambio. Agrega una cuenta en otra moneda y su tasa aparecerá aquí.`,
  providerDisclaimer:
    'Frankfurter ofrece tasas de cambio de referencia de fuentes oficiales. Tu banco puede usar una tasa distinta.',
  alreadyBaseCurrency: 'Ya es la moneda principal',
  sourceFrankfurter: 'Tasa de referencia de Frankfurter',
  sourceManual: 'Ingreso manual',
  staleBadge: 'La tasa puede estar desactualizada',
  freshBadge: 'Actualizada',
  source: 'Origen',
  rateDate: 'Fecha de la tasa',
  lastUpdated: 'Última actualización',
  noRateAvailable: (code) =>
    `No hay tasa de cambio disponible. Las cuentas en ${code} quedan fuera de los totales consolidados hasta que guardes una.`,
  refreshFromFrankfurter: 'Actualizar desde Frankfurter',
  manualRateHint: (base, code) =>
    `O ingresa cuántos ${base} equivalen a un ${code}. Hasta cuatro decimales.`,
  manualRateLabel: (code, base) => `Tasa manual de ${code} a ${base}`,
  manualRatePlaceholder: 'p. ej. 4100',
  saveManualRate: 'Guardar tasa manual',
  loadError: 'No se pudieron cargar las tasas de cambio.',
  refreshError: 'No se pudo actualizar la tasa de cambio.',
  saveError: 'No se pudo guardar la tasa de cambio.',
  baseHasNoRate: 'La moneda principal no tiene tasa de cambio consigo misma.',
  refreshFailedCached: (currency, base) =>
    `No se pudo actualizar la tasa de referencia ${currency}/${base}. Se sigue usando la última tasa guardada.`,
  noRateEnterManually: (currency, base) =>
    `No hay tasa de cambio disponible para ${currency}. Ingresa una tasa ${currency}/${base} manualmente.`,
  invalidManualRate: (currency, base) =>
    `Ingresa una tasa ${currency}/${base} válida mayor que cero.`,
};
