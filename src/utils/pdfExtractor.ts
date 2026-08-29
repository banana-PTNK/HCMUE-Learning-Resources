/**
 * High-Performance Client-Side PDF Text Extractor
 * Extracts tabular text from PDF files directly in the browser using pdfjs-dist
 * with automatic fallback to native DecompressionStream/text-stream extraction.
 */

import { yieldToMainThread } from './scheduleParser';

/**
 * Extracts plain text from a PDF file in the browser
 */
export async function extractTextFromPdfFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Strategy 1: Dynamic import pdfjs-dist
    try {
      const pdfjsLib = await import('pdfjs-dist');
      
      // Configure worker if in browser
      if (typeof window !== 'undefined') {
        try {
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            // Use CDN or disable worker port
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
          }
        } catch {
          // Ignore worker config error
        }
      }

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useWorkerFetch: false,
        useSystemFonts: true
      });

      const pdf = await loadingTask.promise;
      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        await yieldToMainThread();
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Group items by vertical position (Y coordinate) to preserve row structure
        const items = textContent.items as Array<{ str?: string; transform?: number[] }>;
        const lineMap = new Map<number, string[]>();

        for (const item of items) {
          if (!item.str || item.str.trim() === '') continue;
          // transform[5] is the Y-coordinate in PDF space
          const y = item.transform && item.transform[5] ? Math.round(item.transform[5] / 4) * 4 : 0;
          if (!lineMap.has(y)) {
            lineMap.set(y, []);
          }
          lineMap.get(y)!.push(item.str);
        }

        // Sort descending by Y (PDF Y goes bottom to top)
        const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
        const pageLines = sortedYs.map(y => lineMap.get(y)!.join('\t'));

        fullText += `\n--- Trang ${pageNum} ---\n` + pageLines.join('\n');
      }

      if (fullText.trim().length > 50) {
        return fullText.trim();
      }
    } catch (pdfjsErr) {
      console.warn('pdfjs-dist text extraction encountered an issue, trying raw text fallback:', pdfjsErr);
    }

    // Strategy 2: Fast raw stream string decoding fallback
    const rawText = await extractRawTextFallback(new Uint8Array(arrayBuffer));
    return rawText;
  } catch (err) {
    console.warn('All PDF text extraction strategies failed:', err);
    return '';
  }
}

/**
 * Fallback parser that decodes uncompressed text tokens from PDF buffer
 */
async function extractRawTextFallback(bytes: Uint8Array): Promise<string> {
  try {
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const rawString = textDecoder.decode(bytes);
    
    const textPieces: string[] = [];
    
    // Extract Tj operators: (text) Tj
    const tjRegex = /\(([^()]*)\)\s*Tj/g;
    let match;
    while ((match = tjRegex.exec(rawString)) !== null) {
      if (match[1] && match[1].trim()) {
        textPieces.push(match[1]);
      }
    }

    // Extract TJ array operators: [(text) 20 (more)] TJ
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    while ((match = tjArrayRegex.exec(rawString)) !== null) {
      const arrayContent = match[1];
      const innerMatches = arrayContent.match(/\(([^()]*)\)/g);
      if (innerMatches) {
        const line = innerMatches.map(m => m.slice(1, -1)).join(' ');
        if (line.trim()) {
          textPieces.push(line);
        }
      }
    }

    return textPieces.join('\n');
  } catch {
    return '';
  }
}
