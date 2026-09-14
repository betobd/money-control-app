import type { more as en } from '../en/more';

export const more: typeof en = {
  title: 'Más',
  closeLabel: 'Cerrar Más',
  items: {
    security: {
      label: 'Seguridad',
      description: 'PIN, biometría y bloqueo automático',
      accessibilityLabel: 'Abrir ajustes de seguridad',
      accessibilityHint: 'Configura el PIN, la biometría del dispositivo y el bloqueo automático de la app',
    },
    notifications: {
      label: 'Notificaciones',
      description: 'Recordatorios locales y privacidad de notificaciones',
      accessibilityLabel: 'Abrir ajustes de notificaciones',
      accessibilityHint: 'Configura recordatorios locales de recurrentes, presupuestos y diarios',
    },
    backup: {
      label: 'Copia de seguridad',
      description: 'Crea o restaura una copia local completa',
      accessibilityLabel: 'Abrir copia de seguridad y restauración',
      accessibilityHint: 'Crea una copia local o reemplaza los datos locales desde un archivo de copia',
    },
    dataExport: {
      label: 'Exportar datos',
      description: 'Archivos CSV legibles para analizar y compartir',
      accessibilityLabel: 'Abrir exportación de datos',
      accessibilityHint: 'Crea archivos CSV legibles para hojas de cálculo, análisis y compartir',
    },
    investments: {
      label: 'Inversiones',
      description: 'Sigue saldos, valoraciones y rentabilidad estimada',
      accessibilityLabel: 'Abrir inversiones',
      accessibilityHint: 'Revisa cuentas de inversión, valoraciones y ganancia o pérdida estimada',
    },
    reports: {
      label: 'Informes',
      description: 'Explora flujo de caja, categorías y patrimonio neto',
      accessibilityLabel: 'Abrir informes',
      accessibilityHint: 'Revisa ingresos, gastos, categorías, patrimonio neto y comparaciones entre periodos',
    },
    currency: {
      label: 'Moneda y tasas',
      description: 'Moneda principal y tasas de cambio',
      accessibilityLabel: 'Abrir moneda y tasas',
      accessibilityHint: 'Revisa la moneda principal y las tasas de cambio',
    },
    categories: {
      label: 'Categorías',
      description: 'Administra categorías de gastos e ingresos',
      accessibilityLabel: 'Administrar categorías',
      accessibilityHint: 'Crea, edita, archiva y restaura categorías',
    },
    recurring: {
      label: 'Movimientos recurrentes',
      description: 'Revisa, confirma, pausa y programa recurrentes',
      accessibilityLabel: 'Administrar movimientos recurrentes',
      accessibilityHint: 'Revisa los pendientes y administra las reglas recurrentes',
    },
    language: {
      label: 'Idioma',
      accessibilityLabel: 'Cambiar idioma',
      accessibilityHint: 'Elige el idioma de la app',
    },
  },
  language: {
    title: 'Idioma',
    intro: 'Elige el idioma de la app. Las categorías predeterminadas que no hayas renombrado también se traducen.',
    deviceOption: 'Igual que el dispositivo',
    deviceDetail: (languageName) => `Ahora: ${languageName}`,
    selectedHint: 'Seleccionado',
    changeFailed: 'No se pudo cambiar el idioma. Inténtalo de nuevo.',
  },
};
