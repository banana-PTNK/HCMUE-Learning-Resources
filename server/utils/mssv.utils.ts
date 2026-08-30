export function normalizeMssv(id: string | null | undefined): string {
  if (!id || typeof id !== 'string') return '';
  return id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
}

export function isSameMssv(a: string | null | undefined, b: string | null | undefined): boolean {
  const normA = normalizeMssv(a);
  const normB = normalizeMssv(b);
  if (!normA || !normB) return false;
  return normA === normB;
}
