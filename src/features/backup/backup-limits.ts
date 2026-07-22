export const backupLimits = {
  maxFileBytes: 25 * 1024 * 1024,
  maxNestingDepth: 8,
  maxIdLength: 200,
  maxStringLength: 512,
  maxNoteLength: 200,
  collections: {
    accounts: 10_000,
    categories: 10_000,
    transactions: 50_000,
    transactionSplits: 50_000,
    budgets: 10_000,
    recurringTransactions: 10_000,
    recurringOccurrences: 50_000,
    creditCardStatements: 50_000,
  },
} as const;

export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else bytes += 3;
    } else bytes += 3;
  }
  return bytes;
}
