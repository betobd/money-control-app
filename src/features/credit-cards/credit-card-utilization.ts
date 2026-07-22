import type { CreditCardUtilization, CreditCardUtilizationStatus } from './credit-card.types';

function safeSubtract(left: number, right: number): number | null {
  const result = left - right;
  return Number.isSafeInteger(result) ? result : null;
}

export function utilizationStatus(basisPoints: number): CreditCardUtilizationStatus {
  if (basisPoints >= 10_000) return 'over-limit';
  if (basisPoints >= 8_000) return 'very-high';
  if (basisPoints >= 5_000) return 'high';
  if (basisPoints >= 3_000) return 'moderate';
  return 'low';
}

export function calculateCreditCardUtilization(
  signedBalance: number,
  creditLimit: number | null,
): CreditCardUtilization {
  const currentDebt = signedBalance < 0 ? Math.abs(signedBalance) : 0;
  if (!Number.isSafeInteger(currentDebt) || creditLimit === null || !Number.isSafeInteger(creditLimit) || creditLimit <= 0) {
    return {
      currentDebt: Number.isSafeInteger(currentDebt) ? currentDebt : 0,
      availableCredit: null,
      utilizationBasisPoints: null,
      visualProgressWidth: '0%',
      status: 'unavailable',
    };
  }
  const availableCredit = safeSubtract(creditLimit, currentDebt);
  const basisPoints = Number((BigInt(currentDebt) * 10_000n + BigInt(creditLimit) / 2n) / BigInt(creditLimit));
  const safeBasisPoints = Number.isSafeInteger(basisPoints) ? basisPoints : null;
  if (availableCredit === null || safeBasisPoints === null) {
    return {
      currentDebt,
      availableCredit,
      utilizationBasisPoints: null,
      visualProgressWidth: '0%',
      status: 'unavailable',
    };
  }
  return {
    currentDebt,
    availableCredit,
    utilizationBasisPoints: safeBasisPoints,
    visualProgressWidth: `${Math.max(0, Math.min(100, safeBasisPoints / 100))}%`,
    status: utilizationStatus(safeBasisPoints),
  };
}
