export const MAX_CACHE_ENTRIES = 100;
const codeAnalysisCache = new Map<string, any>();

export function getCodeCacheKey(code: string, language: string): string {
  const normalized = code.trim().replace(/\r\n/g, '\n');
  return `${language.toLowerCase()}:::${normalized}`;
}

export function getCachedCodeAnalysis(key: string): any | null {
  return codeAnalysisCache.get(key) || null;
}

export function setCachedCodeAnalysis(key: string, data: any): void {
  if (codeAnalysisCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = codeAnalysisCache.keys().next().value;
    if (firstKey) {
      codeAnalysisCache.delete(firstKey);
    }
  }
  codeAnalysisCache.set(key, data);
}

export function hasCachedCodeAnalysis(key: string): boolean {
  return codeAnalysisCache.has(key);
}
