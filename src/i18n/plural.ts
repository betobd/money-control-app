import type { Language } from './languages';

/**
 * CLDR plural category for a whole count, reduced to the two categories these
 * six languages use for integers.
 *
 * French and Brazilian Portuguese treat 0 like 1 ("0 transaction", "0 transação");
 * English, Spanish, German and Italian use the singular for exactly 1. Written out
 * rather than `Intl.PluralRules`, which Hermes does not reliably provide.
 */
export function pluralCategory(language: Language, count: number): 'one' | 'other' {
  const whole = Math.abs(Math.trunc(count));
  if (language === 'fr' || language === 'pt') return whole <= 1 ? 'one' : 'other';
  return whole === 1 && Number.isInteger(count) ? 'one' : 'other';
}

/**
 * A plural picker bound to one language, for use inside that language's catalog:
 *
 *   const plural = createPlural('fr');
 *   transactionCount: (count: number) => `${count} ${plural(count, 'transaction', 'transactions')}`,
 */
export function createPlural(language: Language) {
  return (count: number, one: string, other: string): string =>
    pluralCategory(language, count) === 'one' ? one : other;
}
