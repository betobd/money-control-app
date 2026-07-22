export type CsvScalar = string | number | boolean | null | undefined;

export type CsvColumn<Row> = {
  header: string;
  value: (row: Row) => CsvScalar;
  protectFormula?: boolean;
};

export type CsvSerializerOptions = {
  includeBom?: boolean;
  lineEnding?: '\r\n' | '\n';
  chunkSizeCharacters?: number;
};

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'] as const;

export function protectSpreadsheetFormula(value: string): string {
  return FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix)) ? `'${value}` : value;
}

export function escapeCsvField(value: CsvScalar, protectFormula = false): string {
  if (value === null || value === undefined) return '';
  const raw = typeof value === 'string' && protectFormula
    ? protectSpreadsheetFormula(value)
    : String(value);
  return /[",\r\n]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
}

async function* toAsyncRows<Row>(rows: Iterable<Row> | AsyncIterable<Row>): AsyncIterable<Row> {
  for await (const row of rows) yield row;
}

export class CsvSerializer {
  async *serialize<Row>(
    columns: readonly CsvColumn<Row>[],
    rows: Iterable<Row> | AsyncIterable<Row>,
    options: CsvSerializerOptions = {},
  ): AsyncIterable<string> {
    if (columns.length === 0) throw new Error('CSV export requires at least one column.');
    const lineEnding = options.lineEnding ?? '\r\n';
    const chunkSize = options.chunkSizeCharacters ?? 65_536;
    let chunk = options.includeBom === false ? '' : '\uFEFF';
    chunk += `${columns.map((column) => escapeCsvField(column.header)).join(',')}${lineEnding}`;

    for await (const row of toAsyncRows(rows)) {
      chunk += `${columns
        .map((column) => escapeCsvField(column.value(row), column.protectFormula))
        .join(',')}${lineEnding}`;
      if (chunk.length >= chunkSize) {
        yield chunk;
        chunk = '';
      }
    }

    if (chunk) yield chunk;
  }
}

