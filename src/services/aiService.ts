import { CodeAnalysisResult, MasterCourseSection } from '../types';

export interface ExplainCodeParams {
  code: string;
  language: string;
}

export interface ParseScheduleParams {
  textData?: string;
  customPrompt?: string;
  universityPreset?: string;
  imageBase64?: string;
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
  fileType?: string;
}

export interface ExplainCodeResponse {
  success: boolean;
  data?: CodeAnalysisResult;
  error?: string;
}

export interface ParseScheduleResponse {
  success: boolean;
  data: MasterCourseSection[];
  message?: string;
  error?: string;
}

/**
 * Hàm phân tích JSON an toàn phòng vệ chống HTML error từ máy chủ
 */
async function parseResponseSafely(response: Response): Promise<any> {
  const rawText = await response.text();
  try {
    return JSON.parse(rawText);
  } catch {
    if (!response.ok) {
      throw new Error(`Máy chủ phản hồi lỗi (${response.status}): ${rawText.slice(0, 120)}`);
    }
    throw new Error('Dữ liệu máy chủ trả về không đúng định dạng JSON');
  }
}

export async function explainCodeAI(
  params: ExplainCodeParams
): Promise<ExplainCodeResponse> {
  if (!params.code || !params.code.trim()) {
    throw new Error('Vui lòng nhập hoặc dán mã nguồn cần phân tích.');
  }

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'EXPLAIN_CODE',
        payload: {
          code: params.code,
          language: params.language || 'cpp',
        },
      }),
    });

    const result = await parseResponseSafely(response);

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Lỗi máy chủ (${response.status})`);
    }

    if (result.success && result.data) {
      return {
        success: true,
        data: result.data,
      };
    }

    throw new Error(result.error || 'Không nhận được dữ liệu phân tích từ AI.');
  } catch (err: any) {
    console.error('Lỗi khi phân tích mã nguồn qua explainCodeAI:', err);
    throw new Error(err.message || 'Không thể kết nối đến máy chủ AI.');
  }
}

export async function parseMasterScheduleAI(
  params: ParseScheduleParams
): Promise<ParseScheduleResponse> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'PARSE_MASTER_SCHEDULE',
        payload: {
          textData: params.textData,
          customPrompt: params.customPrompt,
          universityPreset: params.universityPreset,
          imageBase64: params.imageBase64,
          fileBase64: params.fileBase64,
          mimeType: params.mimeType,
          fileName: params.fileName,
          fileType: params.fileType,
        },
      }),
    });

    const result = await parseResponseSafely(response);

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Lỗi trích xuất thời khóa biểu (${response.status})`);
    }

    return {
      success: true,
      data: Array.isArray(result.data) ? result.data : [],
      message: result.message || `Trích xuất thành công ${result.data?.length || 0} lớp học phần.`,
    };
  } catch (err: any) {
    console.error('Lỗi khi trích xuất thời khóa biểu qua parseMasterScheduleAI:', err);
    throw new Error(err.message || 'Không thể trích xuất thời khóa biểu bằng AI.');
  }
}

export async function parsePersonalScheduleAI(
  params: ParseScheduleParams
): Promise<{ success: boolean; data: any[]; message?: string }> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'PARSE_SCHEDULE',
        payload: {
          textData: params.textData,
          imageBase64: params.imageBase64,
          fileBase64: params.fileBase64,
          mimeType: params.mimeType,
          fileName: params.fileName,
          fileType: params.fileType,
        },
      }),
    });

    const result = await parseResponseSafely(response);

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Lỗi nhận diện thời khóa biểu cá nhân');
    }

    return {
      success: true,
      data: Array.isArray(result.data) ? result.data : [],
      message: result.message,
    };
  } catch (err: any) {
    console.error('Lỗi khi nhận diện thời khóa biểu cá nhân:', err);
    throw new Error(err.message || 'Không thể nhận diện thời khóa biểu cá nhân bằng AI.');
  }
}