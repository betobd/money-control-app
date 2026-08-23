/**
 * Shared integer arithmetic for report aggregates.
 *
 * Lives apart from the service so other report modules can use it without
 * importing the service back — money math must never depend on orchestration.
 */

export function safeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} exceeds the supported safe integer range.`);
  }
  return value;
}

export function roundedIntegerDivision(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  const result = (BigInt(numerator) + BigInt(Math.floor(denominator / 2))) / BigInt(denominator);
  return safeInteger(Number(result), 'Rounded report value');
}

export function calculateBasisPoints(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  const numeratorValue = BigInt(numerator);
  const denominatorValue = BigInt(Math.abs(denominator));
  const sign = numeratorValue < 0n ? -1n : 1n;
  const absoluteNumerator = numeratorValue < 0n ? -numeratorValue : numeratorValue;
  const rounded = (absoluteNumerator * 10_000n + denominatorValue / 2n) / denominatorValue;
  return safeInteger(Number(rounded * sign), 'Percentage change');
}
