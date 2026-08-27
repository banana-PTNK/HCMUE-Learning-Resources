import React, { useMemo } from 'react';

interface HighlightTextProps {
  text: string;
  query?: string;
  className?: string;
  highlightClassName?: string;
}

// Remove Vietnamese accents for loose matching index calculation
const removeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  query = '',
  className = '',
  highlightClassName = 'bg-yellow-200 dark:bg-yellow-400/30 text-yellow-950 dark:text-yellow-200 font-bold px-1 py-0.5 rounded-sm shadow-xs transition-colors'
}) => {
  const parts = useMemo(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !text) {
      return [{ text, isMatch: false }];
    }

    // First try exact case-insensitive regex
    try {
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Split query terms to highlight individual words or whole phrase
      const terms = trimmedQuery
        .split(/\s+/)
        .filter((t) => t.length > 0)
        .map(escapeRegex);

      if (terms.length === 0) return [{ text, isMatch: false }];

      const regex = new RegExp(`(${terms.join('|')})`, 'gi');
      const directParts: { text: string; isMatch: boolean }[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      // Check if regex finds direct matches
      const hasDirectMatch = regex.test(text);
      regex.lastIndex = 0;

      if (hasDirectMatch) {
        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            directParts.push({
              text: text.slice(lastIndex, match.index),
              isMatch: false
            });
          }
          directParts.push({
            text: match[0],
            isMatch: true
          });
          lastIndex = regex.lastIndex;
        }
        if (lastIndex < text.length) {
          directParts.push({
            text: text.slice(lastIndex),
            isMatch: false
          });
        }
        return directParts;
      }

      // If no direct accented match, fallback to accent-folded matching
      const normalizedText = removeAccents(text);
      const normalizedQuery = removeAccents(trimmedQuery);

      const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
      if (queryTokens.length === 0) return [{ text, isMatch: false }];

      // Build intervals of matched character indices
      const matchedIndices = new Set<number>();
      for (const token of queryTokens) {
        let pos = 0;
        while ((pos = normalizedText.indexOf(token, pos)) !== -1) {
          for (let i = pos; i < pos + token.length; i++) {
            matchedIndices.add(i);
          }
          pos += token.length;
        }
      }

      if (matchedIndices.size === 0) {
        return [{ text, isMatch: false }];
      }

      const accentParts: { text: string; isMatch: boolean }[] = [];
      let currentSegment = '';
      let currentMatch = matchedIndices.has(0);

      for (let i = 0; i < text.length; i++) {
        const isM = matchedIndices.has(i);
        if (isM === currentMatch) {
          currentSegment += text[i];
        } else {
          if (currentSegment) {
            accentParts.push({ text: currentSegment, isMatch: currentMatch });
          }
          currentSegment = text[i];
          currentMatch = isM;
        }
      }
      if (currentSegment) {
        accentParts.push({ text: currentSegment, isMatch: currentMatch });
      }

      return accentParts;
    } catch {
      return [{ text, isMatch: false }];
    }
  }, [text, query]);

  if (!query || !query.trim()) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, idx) =>
        part.isMatch ? (
          <mark key={idx} className={highlightClassName}>
            {part.text}
          </mark>
        ) : (
          <React.Fragment key={idx}>{part.text}</React.Fragment>
        )
      )}
    </span>
  );
};

export default HighlightText;
