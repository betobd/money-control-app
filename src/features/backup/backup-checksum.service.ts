import type { BackupFileV1 } from './backup.types';

export type BackupDigest = (canonicalValue: string) => Promise<string>;

function sortForCanonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForCanonicalJson);
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      result[key] = sortForCanonicalJson(source[key]);
    }
    return result;
  }
  return value;
}

export function canonicalizeJson(value: unknown): string {
  return JSON.stringify(sortForCanonicalJson(value));
}

export function checksumInput(file: BackupFileV1): unknown {
  const { checksum: _checksum, ...integrity } = file.integrity;
  void _checksum;
  return { ...file, integrity };
}

function equalHex(left: string, right: string): boolean {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();
  if (normalizedLeft.length !== normalizedRight.length) return false;
  let difference = 0;
  for (let index = 0; index < normalizedLeft.length; index += 1) {
    difference |= normalizedLeft.charCodeAt(index) ^ normalizedRight.charCodeAt(index);
  }
  return difference === 0;
}

export class BackupChecksumService {
  constructor(private readonly digest: BackupDigest) {}

  calculate(file: BackupFileV1): Promise<string> {
    return this.digest(canonicalizeJson(checksumInput(file)));
  }

  async verify(file: BackupFileV1): Promise<boolean> {
    return equalHex(await this.calculate(file), file.integrity.checksum);
  }
}
