import { ScheduleItem, MasterCourseSection, CodeAnalysisResult } from '../types';

/**
 * Client-Side Image Pre-processing & Downscaling
 * Automatically downscales uploaded schedule images (max width 1080px, JPEG/WebP format, 75% quality)
 * to reduce payload size by ~80%, cutting network latency down to sub-second upload speeds.
 */
export async function compressImageClientSide(
  fileOrBase64: File | string,
  maxWidth = 1080,
  quality = 0.75
): Promise<{ base64: string; mimeType: string }> {
  // If running in an environment without window/DOM (SSR or worker), pass through
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    if (typeof fileOrBase64 === 'string') {
      const mime = fileOrBase64.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,/)?.[1] || 'image/jpeg';
      return { base64: fileOrBase64, mimeType: mime };
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve({ base64: result, mimeType: fileOrBase64.type || 'image/jpeg' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBase64);
    });
  }

  // Convert File to Object URL or use string base64 directly
  return new Promise((resolve, reject) => {
    let srcUrl = '';
    let shouldRevoke = false;

    if (typeof fileOrBase64 === 'string') {
      srcUrl = fileOrBase64;
    } else {
      srcUrl = URL.createObjectURL(fileOrBase64);
      shouldRevoke = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (shouldRevoke) {
        URL.revokeObjectURL(srcUrl);
      }

      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback if 2d context unavailable
        if (typeof fileOrBase64 === 'string') {
          return resolve({ base64: fileOrBase64, mimeType: 'image/jpeg' });
        }
        const reader = new FileReader();
        reader.onload = () => resolve({ base64: reader.result as string, mimeType: fileOrBase64.type });
        reader.onerror = reject;
        reader.readAsDataURL(fileOrBase64);
        return;
      }

      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Export as compressed JPEG
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve({
        base64: compressedDataUrl,
        mimeType: 'image/jpeg'
      });
    };

    img.onerror = (err) => {
      if (shouldRevoke) {
        URL.revokeObjectURL(srcUrl);
      }
      // If error loading image (e.g. PDF or text file), return original representation
      if (typeof fileOrBase64 === 'string') {
        resolve({ base64: fileOrBase64, mimeType: 'image/jpeg' });
      } else {
        const reader = new FileReader();
        reader.onload = () => resolve({ base64: reader.result as string, mimeType: fileOrBase64.type });
        reader.onerror = () => reject(err);
        reader.readAsDataURL(fileOrBase64);
      }
    };

    img.src = srcUrl;
  });
}

/**
 * Parses university master schedule files with client-side image downscaling and fail-fast API handling.
 */
export async function parseMasterScheduleAI(payload: {
  imageBase64?: string;
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
  textData?: string;
  fileType?: string;
  customPrompt?: string;
  systemInstruction?: string;
  universityPreset?: string;
}): Promise<{ success: boolean; data: MasterCourseSection[]; isMock?: boolean; message?: string }> {
  try {
    let finalBase64 = payload.fileBase64 || payload.imageBase64;
    let finalMimeType = payload.mimeType;

    // Downscale if it's an image
    if (finalBase64 && (!finalMimeType || finalMimeType.startsWith('image/'))) {
      try {
        const compressed = await compressImageClientSide(finalBase64, 1080, 0.75);
        finalBase64 = compressed.base64;
        finalMimeType = compressed.mimeType;
      } catch (compErr) {
        console.warn('Image downscaling skipped:', compErr);
      }
    }

    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'PARSE_MASTER_SCHEDULE',
        payload: {
          ...payload,
          fileBase64: finalBase64,
          imageBase64: finalBase64,
          mimeType: finalMimeType
        }
      })
    });

    const resJson = await response.json();
    if (!response.ok || resJson.success === false) {
      const errMsg = resJson.error || `Lỗi máy chủ (${response.status}): ${response.statusText}`;
      throw new Error(errMsg);
    }

    return resJson;
  } catch (error: any) {
    console.error('Lỗi phân tích Thời khóa biểu:', error);
    // Surface precise error to prevent UI hanging
    throw new Error(error.message || 'Không thể kết nối đến Gemini 3.7 Flash.');
  }
}

/**
 * Parses personal schedule images or text with client-side pre-processing and fail-fast execution.
 */
export async function parseScheduleAI(payload: {
  imageBase64?: string;
  mimeType?: string;
  textData?: string;
}): Promise<{ success: boolean; data: ScheduleItem[]; isMock?: boolean; message?: string }> {
  try {
    let finalImageBase64 = payload.imageBase64;
    let finalMimeType = payload.mimeType || 'image/jpeg';

    if (finalImageBase64) {
      try {
        const compressed = await compressImageClientSide(finalImageBase64, 1080, 0.75);
        finalImageBase64 = compressed.base64;
        finalMimeType = compressed.mimeType;
      } catch (compErr) {
        console.warn('Image downscaling skipped:', compErr);
      }
    }

    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'PARSE_SCHEDULE',
        payload: {
          ...payload,
          imageBase64: finalImageBase64,
          mimeType: finalMimeType
        }
      })
    });

    const resJson = await response.json();
    if (!response.ok || resJson.success === false) {
      const errMsg = resJson.error || `Lỗi nhận diện thời khóa biểu (${response.status})`;
      throw new Error(errMsg);
    }

    return resJson;
  } catch (error: any) {
    console.error('Lỗi nhận diện thời khóa biểu cá nhân:', error);
    throw new Error(error.message || 'Không thể nhận diện thời khóa biểu.');
  }
}

/**
 * Ultra-fast algorithm and Big-O explanation via Gemini 3.7 Flash with fail-fast handling.
 */
export async function explainCodeAI(payload: {
  code: string;
  language: string;
}): Promise<{ success: boolean; data: CodeAnalysisResult; isMock?: boolean; message?: string }> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'EXPLAIN_CODE',
        payload
      })
    });

    const resJson = await response.json();
    if (!response.ok || resJson.success === false) {
      const errMsg = resJson.error || `Lỗi phân tích mã nguồn (${response.status})`;
      throw new Error(errMsg);
    }

    return resJson;
  } catch (error: any) {
    console.error('Lỗi phân tích thuật toán:', error);
    throw new Error(error.message || 'Không thể phân tích thuật toán.');
  }
}
