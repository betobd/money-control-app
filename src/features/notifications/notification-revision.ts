export function notificationRevision(parts: readonly (string | number | boolean | null | undefined)[]): string {
  let hash = 0x811c9dc5;
  const value = parts.map((part) => String(part ?? '')).join('\u001f');
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `v1-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
