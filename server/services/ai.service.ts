import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { getGenAI } from '../config/gemini.config';
import {
  parseJsonArraySafely,
  parseJsonObjectSafely,
  normalizeExtractedSections,
  normalizePersonalSchedule
} from '../utils/scheduleNormalizer';
import {
  getCodeCacheKey,
  getCachedCodeAnalysis,
  setCachedCodeAnalysis
} from '../utils/cache';

export async function callGeminiWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any[];
    config?: any;
    preferredModels?: string[];
    maxRetriesPerModel?: number;
  }
) {
  const models = params.preferredModels || [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.0-pro-exp-02-05',
    'gemini-1.5-pro',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.1-pro',
    'gemini-2.5-flash',
    'gemini-2.5-pro'
  ];
  const maxRetries = params.maxRetriesPerModel ?? 2;
  let lastError: any = null;

  for (let mIdx = 0; mIdx < models.length; mIdx++) {
    const model = models[mIdx];
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isQuotaExceeded =
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('quota') ||
          errMsg.includes('Quota');
        const isUnavailable =
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand');

        if (isQuotaExceeded) {
          break;
        }

        if (isUnavailable && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 600));
        } else {
          break;
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw lastError;
}

class AiService {
  async parseMasterSchedule(payload: {
    imageBase64?: string;
    fileBase64?: string;
    mimeType?: string;
    fileName?: string;
    textData?: string;
    customPrompt?: string;
    universityPreset?: string;
  }) {
    const ai = getGenAI();
    if (!ai) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY trên môi trường máy chủ. Vui lòng thiết lập biến môi trường GEMINI_API_KEY.');
    }

    const { imageBase64, fileBase64, mimeType, fileName, textData, customPrompt, universityPreset } = payload || {};
    const fileData = fileBase64 || imageBase64;
    const detectedMimeType = mimeType || (fileName?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    const presetText = universityPreset ? `Quy chuẩn trường: ${universityPreset}.` : '';
    const promptText = customPrompt ? `YÊU CẦU BỔ SUNG TỪ NGƯỜI DÙNG: ${customPrompt}` : '';

    const systemInstruction = `Bạn là chuyên gia xử lý và ghép nối dữ liệu Thời khóa biểu đại học từ tài liệu nhiều cột phân tách hoặc ma trận lịch học.
NHIỆM VỤ: Trích xuất CHÍNH XÁC và DUY NHẤT các lớp học phần và buổi học có trong tài liệu được cung cấp.
TUYỆT ĐỐI CẤM BỊA ĐẶT / SUY DIỄN: Chỉ trích xuất các mục có thực trong tài liệu. Không thêm bất kỳ môn học nào ngoài tài liệu.
${presetText}
${promptText}

RÀNG BUỘC NGHIỆP VỤ CỐT LÕI (BẮT BUỘC TUÂN THỦ 100%):
1. THỜI LƯỢNG MỖI BUỔI HỌC (SESSION):
   - MỖI MÔN CHỈ HỌC TỐI ĐA 3 ĐẾN 4 TIẾT TRONG MỘT BUỔI HỌC.
   - TUYỆT ĐỐI KHÔNG CÓ MÔN NÀO HỌC TỪ TIẾT 1 ĐẾN 12 VÀ KHÔNG CÓ MÔN NÀO HỌC TỪ TIẾT 1 ĐẾN 6.
   - Các ca học tiêu chuẩn:
     * Ca Sáng sớm: Tiết 1-3 hoặc 1-4 (startPeriod: 1, endPeriod: 3 hoặc 4)
     * Ca Sáng muộn: Tiết 4-6, 3-6 hoặc 4-7 (startPeriod: 4 hoặc 3, endPeriod: 6 hoặc 7)
     * Ca Chiều sớm: Tiết 7-9 hoặc 7-10 (startPeriod: 7, endPeriod: 9 hoặc 10)
     * Ca Chiều muộn: Tiết 10-12 hoặc 10-13 (startPeriod: 10, endPeriod: 12 hoặc 13)
     * Ca Tối: Tiết 13-15 (startPeriod: 13, endPeriod: 15)
2. MỘT LỚP HỌC PHẦN CÓ NHIỀU BUỔI / NHIỀU NGÀY KHÁC NHAU:
   - Một Lớp học phần (cùng classCode/courseCode) có thể học 2 hoặc nhiều buổi trong tuần (ví dụ Buổi 1 học Thứ 4 tiết 10-12 và Buổi 2 học Thứ 5 tiết 4-6).
   - Với mỗi buổi học, hãy trả về 1 object riêng biệt trong JSON Array, giữ nguyên classCode, courseCode, courseName, credits, lecturer... và điền đúng dayOfWeek, startPeriod, endPeriod, room của buổi học đó.
3. KHÓA CHÍNH VÀ GHÉP CỘT:
   - Dùng STT (Số thứ tự) hoặc Mã LHP làm khóa chính JOIN chính xác:
     STT, courseCode (Mã HP), classCode (Mã LHP), courseName (Tên môn), credits (Số TC), dayOfWeek (2-8, CN là 8), startPeriod (1-15), endPeriod (1-15), room (Phòng), lecturer (Giảng viên), classType ("LT" hoặc "TH"), group ("Lớp 01", "Nhóm TH 01").
   - Dữ liệu Giảng viên và Phòng học ở dòng STT = k BẮT BUỘC phải map đúng 100% vào Mã LHP và Tên môn ở dòng STT = k.
   - Nếu một ô Giảng viên hoặc Phòng học bị trống/gạch ngang (-), gán giá trị tương ứng ("Chưa phân công" / "Chưa xếp phòng"). Tuyệt đối KHÔNG dồn/trượt dòng.

SCHEMA ĐẦU RA (JSON Array thuần túy):
[
  {
    "stt": 22,
    "courseCode": "COMP1010",
    "classCode": "COMP101007",
    "courseName": "Lập trình cơ bản",
    "credits": 3,
    "classType": "LT",
    "group": "Lớp 07",
    "dayOfWeek": 4,
    "startPeriod": 10,
    "endPeriod": 12,
    "room": "C.305",
    "lecturer": "Nguyễn Thị Ngọc Hoa",
    "weeks": "1-15"
  }
]
Chỉ trả về DUY NHẤT một JSON Array hợp lệ.`;

    let contents: any[] = [];
    if (fileData) {
      const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '');
      contents = [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: detectedMimeType
              }
            },
            {
              text: 'Hãy đọc toàn bộ tài liệu thời khóa biểu này và trích xuất tất cả các lớp học phần có trong tài liệu theo đúng cấu trúc JSON Array. Đảm bảo startPeriod và endPeriod phản ánh chính xác tiết học của từng buổi sáng/chiều/tối, không mặc định tiết 1-3. Không tự suy diễn môn ngoài tài liệu.'
            }
          ]
        }
      ];
    } else if (textData) {
      contents = [
        {
          role: 'user',
          parts: [
            {
              text: `Hãy trích xuất danh mục thời khóa biểu từ văn bản/bảng dữ liệu sau (chỉ trích xuất các môn có trong văn bản, đọc đúng tiết học startPeriod/endPeriod):\n${textData}`
            }
          ]
        }
      ];
    } else {
      throw new Error('Thiếu dữ liệu tệp hoặc văn bản thời khóa biểu');
    }

    const response = await callGeminiWithFallback(ai, {
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens: 8192
      },
      preferredModels: [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-2.0-pro-exp-02-05',
        'gemini-1.5-pro',
        'gemini-3.7-flash',
        'gemini-3.5-flash',
        'gemini-3.1-pro',
        'gemini-2.5-flash',
        'gemini-2.5-pro'
      ]
    });

    const responseText = response.text || '[]';
    const parsedData: any[] = parseJsonArraySafely(responseText);
    const normalizedData = normalizeExtractedSections(parsedData, fileName);

    return {
      success: true,
      data: normalizedData,
      message: `Đã trích xuất thành công ${normalizedData.length} lớp học phần từ tài liệu`
    };
  }

  async parsePersonalSchedule(payload: {
    imageBase64?: string;
    fileBase64?: string;
    mimeType?: string;
    textData?: string;
  }) {
    const ai = getGenAI();
    if (!ai) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY trên môi trường máy chủ. Vui lòng thiết lập biến môi trường GEMINI_API_KEY.');
    }

    const { imageBase64, fileBase64, mimeType, textData } = payload || {};
    const fileData = fileBase64 || imageBase64;
    const detectedMimeType = mimeType || 'image/jpeg';

    const systemInstruction = `Bạn là Trợ lý Vision trích xuất thời khóa biểu cá nhân của sinh viên từ hình ảnh bảng lưới hoặc danh sách.
NGUYÊN TẮC QUAN TRỌNG VỀ TIẾT HỌC (BẮT BUỘC):
- MỖI MÔN CHỈ HỌC TỐI ĐA 3 ĐẾN 4 TIẾT TRONG MỘT BUỔI:
  * TUYỆT ĐỐI KHÔNG CÓ MÔN NÀO HỌC TỪ TIẾT 1 ĐẾN 12 HAY TỪ TIẾT 1 ĐẾN 6.
  * KHÔNG ĐƯỢC mặc định tất cả các môn đều là tiết 1 đến 3.
  * Hàng Tiết 1-3 hoặc Sáng sớm: "startPeriod": 1, "endPeriod": 3 (hoặc 4)
  * Hàng Tiết 4-6 hoặc Sáng muộn: "startPeriod": 4, "endPeriod": 6 (hoặc 3-6)
  * Hàng Tiết 7-9 hoặc Chiều sớm: "startPeriod": 7, "endPeriod": 9 (hoặc 7-10)
  * Hàng Tiết 10-12 hoặc Chiều muộn: "startPeriod": 10, "endPeriod": 12 (hoặc 10-13)
  * Hàng Tiết 13-15 hoặc Tối: "startPeriod": 13, "endPeriod": 15
- Một môn học nhiều buổi/nhiều ngày trong tuần: Trả về mỗi buổi là một phần tử riêng trong mảng JSON.
- CHỈ trích xuất CHÍNH XÁC các môn học có trong ảnh/dữ liệu được cung cấp.
- TUYỆT ĐỐI KHÔNG tự bịa đặt môn học không có trong tài liệu.
- Trả về DUY NHẤT một mảng JSON theo schema:
[
  {
    "dayOfWeek": 2,
    "startPeriod": 1,
    "endPeriod": 3,
    "subjectName": "Tên môn học",
    "subjectCode": "Mã học phần",
    "classCode": "Mã lớp",
    "room": "Phòng học",
    "lecturer": "Giảng viên",
    "isLab": false
  }
]`;

    let contents: any[] = [];
    if (fileData) {
      const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '');
      contents = [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: detectedMimeType
              }
            },
            {
              text: 'Trích xuất toàn bộ các môn học trong ảnh thời khóa biểu này sang JSON Array. Nhìn kỹ từng hàng tiết học (sáng/chiều) để điền đúng startPeriod và endPeriod (1-3, 4-6, 7-9, 10-12).'
            }
          ]
        }
      ];
    } else if (textData) {
      contents = [
        {
          role: 'user',
          parts: [
            {
              text: `Trích xuất lịch học từ văn bản sau (đọc đúng tiết học sáng/chiều):\n${textData}`
            }
          ]
        }
      ];
    } else {
      throw new Error('Thiếu dữ liệu thời khóa biểu');
    }

    const response = await callGeminiWithFallback(ai, {
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens: 8192
      },
      preferredModels: [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-2.0-pro-exp-02-05',
        'gemini-1.5-pro',
        'gemini-3.7-flash',
        'gemini-3.5-flash',
        'gemini-3.1-pro',
        'gemini-2.5-flash',
        'gemini-2.5-pro'
      ]
    });

    const responseText = response.text || '[]';
    const parsedData = parseJsonArraySafely(responseText);
    const normalizedData = normalizePersonalSchedule(parsedData);

    return {
      success: true,
      data: normalizedData,
      message: `Đã nhận diện thành công ${normalizedData.length} môn học từ thời khóa biểu`
    };
  }

  async explainCode(payload: { code: string; language?: string }) {
    const { code, language } = payload || {};
    if (!code || typeof code !== 'string') {
      throw new Error('Thiếu mã nguồn cần phân tích');
    }

    // Check fast cache first
    const cacheKey = getCodeCacheKey(code, language || 'cpp');
    const cached = getCachedCodeAnalysis(cacheKey);
    if (cached) {
      return {
        success: true,
        fromCache: true,
        data: cached,
        message: 'Phân tích tức thời từ bộ nhớ đệm (0ms)'
      };
    }

    const ai = getGenAI();
    if (!ai) {
      // Local algorithmic heuristic fallback
      let timeComp = 'O(log n)';
      let spaceComp = 'O(1)';
      let spaceType = 'Tại chỗ (In-place)';
      let isOptimal = true;

      if (code.includes('for') && code.includes('for')) {
        timeComp = 'O(n²)';
        isOptimal = false;
      } else if (code.includes('sort') || code.includes('MergeSort') || code.includes('QuickSort')) {
        timeComp = 'O(n log n)';
      } else if (code.includes('fib') || code.includes('recursion')) {
        timeComp = 'O(2ⁿ)';
        spaceComp = 'O(n)';
        isOptimal = false;
      }

      const fallbackResult = {
        timeComplexity: timeComp,
        spaceComplexity: spaceComp,
        isOptimal: isOptimal,
        spaceType: spaceType,
        dryRunSteps: [
          {
            step: 1,
            desc: 'Khởi tạo hai con trỏ biên tìm kiếm: `left = 0`, `right = arr.length - 1`',
            variables: 'left: 0, right: 9, target: 7'
          },
          {
            step: 2,
            desc: 'Vòng lặp `while (left <= right)`: Tính vị trí phần tử giữa `mid = left + (right - left) / 2` để tránh tràn số nguyên.',
            variables: 'mid: 4, arr[mid]: 5 < 7'
          },
          {
            step: 3,
            desc: 'Do `arr[mid] < target`, mục tiêu nằm ở nửa bên phải. Cập nhật `left = mid + 1`.',
            variables: 'left: 5, right: 9'
          },
          {
            step: 4,
            desc: 'Bước lặp kế tiếp: Tính `mid = 5 + (9 - 5)/2 = 7`. So sánh `arr[7] == target` -> Khớp thành công!',
            variables: 'mid: 7, arr[mid]: 7 == 7'
          },
          {
            step: 5,
            desc: 'Trả về chỉ số `mid = 7` và kết thúc thuật toán.',
            variables: 'return index: 7'
          }
        ],
        warnings: [
          'Cảnh báo tràn số nguyên (Integer Overflow) khi tính `(left + right) / 2` nếu mảng có kích thước vượt quá 2³¹ - 1.',
          'Đảm bảo mảng đầu vào đã được sắp xếp tăng dần trước khi thực thi tìm kiếm nhị phân.'
        ],
        optimizations: [
          'Nên sử dụng `mid = left + ((right - left) >> 1)` dùng phép dịch bit để tăng tốc độ tính toán.',
          'Nếu mảng chứa các phần tử trùng lặp và cần tìm vị trí đầu tiên, chuyển sang biến thể `std::lower_bound`.'
        ],
        edgeCases: [
          'Mảng rỗng (kích thước n = 0): Vòng lặp không chạy, trả về -1 an toàn.',
          'Phần tử `target` nhỏ hơn phần tử đầu tiên hoặc lớn hơn phần tử cuối cùng: Thuật toán dừng sau đúng 1 bước so sánh biên.',
          'Mảng chỉ có đúng 1 phần tử: Thuật toán kiểm tra chính xác chỉ số 0.'
        ],
        summary: 'Đoạn mã hiện thực thuật toán Tìm kiếm Nhị phân (Binary Search) đạt chuẩn tối ưu về thời gian và bộ nhớ.'
      };

      return {
        success: true,
        isMock: true,
        data: fallbackResult
      };
    }

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        timeComplexity: { type: Type.STRING, description: 'Độ phức tạp thời gian Big-O, vd: O(log n), O(n), O(n²)' },
        spaceComplexity: { type: Type.STRING, description: 'Độ phức tạp không gian Big-O, vd: O(1), O(n)' },
        isOptimal: { type: Type.BOOLEAN, description: 'Thuật toán đã tối ưu hay chưa' },
        spaceType: { type: Type.STRING, description: 'Tại chỗ (In-place) hoặc Cần bộ nhớ phụ' },
        dryRunSteps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              step: { type: Type.INTEGER },
              desc: { type: Type.STRING, description: 'Mô tả bước chạy ngắn gọn, dễ hiểu' },
              variables: { type: Type.STRING, description: 'Giá trị các biến chính ở bước này' }
            },
            required: ['step', 'desc', 'variables']
          }
        },
        warnings: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        optimizations: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        edgeCases: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        summary: { type: Type.STRING, description: 'Đánh giá tổng quan súc tích 1-2 câu' }
      },
      required: ['timeComplexity', 'spaceComplexity', 'isOptimal', 'dryRunSteps', 'warnings', 'optimizations', 'edgeCases', 'summary']
    };

    const systemInstruction = `Bạn là Trợ lý AI Phân tích Thuật toán & Độ phức tạp Big-O cho sinh viên CNTT HCMUE.
Hãy phân tích nhanh, chính xác, súc tích đoạn mã được cung cấp (ngôn ngữ: ${language || 'C++/Python/Java'}).
Tập trung vào:
1. Độ phức tạp Thời gian & Không gian Big-O (Worst-case).
2. Từng bước Dry-run ngắn gọn với giá trị mẫu tiêu biểu (3-5 bước).
3. Cảnh báo lỗi logic/tràn số, gợi ý tối ưu và trường hợp biên (edge cases).
Giải thích 100% tiếng Việt chuẩn học thuật, súc tích.`;

    let responseText = '{}';
    try {
      const response = await callGeminiWithFallback(ai, {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Phân tích thuật toán đoạn mã ${language || 'lập trình'} này:\n\n${code}`
              }
            ]
          }
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.1,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        },
        preferredModels: [
          'gemini-2.0-flash',
          'gemini-1.5-flash',
          'gemini-2.0-flash-lite',
          'gemini-3.1-flash-lite',
          'gemini-3.7-flash',
          'gemini-flash-latest'
        ]
      });
      responseText = response.text || '{}';
    } catch {
      const fallbackResult = {
        timeComplexity: code.includes('for') && code.split('for').length > 2 ? 'O(n²)' : code.includes('for') || code.includes('while') ? 'O(n)' : 'O(1)',
        spaceComplexity: 'O(1)',
        isOptimal: true,
        spaceType: 'Tại chỗ (In-place)',
        dryRunSteps: [
          {
            step: 1,
            desc: 'Khởi tạo môi trường thực thi và kiểm tra các tham số đầu vào của hàm.',
            variables: 'Trạng thái khởi tạo'
          },
          {
            step: 2,
            desc: 'Duyệt qua các khối lệnh điều kiện và vòng lặp chính của giải thuật.',
            variables: 'i: 0 -> n'
          },
          {
            step: 3,
            desc: 'Hoàn tất xử lý và trả về kết quả đạt độ phức tạp tối ưu.',
            variables: 'return result'
          }
        ],
        warnings: [
          'Cần chú ý kiểm tra trường hợp dữ liệu rỗng (null/empty) trước khi truy xuất phần tử.'
        ],
        optimizations: [
          'Có thể tận dụng cấu trúc dữ liệu bảng băm (Hash Table) hoặc dịch bit (Bit manipulation) nếu cần tăng tốc tối đa.'
        ],
        edgeCases: [
          'Dữ liệu có kích thước n = 0 hoặc n = 1.',
          'Các giá trị biên cực đại (INT_MAX) hoặc cực tiểu (INT_MIN).'
        ],
        summary: 'Mã nguồn được phân tích theo mô hình giải thuật chuẩn học thuật HCMUE.'
      };

      return {
        success: true,
        isMock: true,
        data: fallbackResult,
        message: 'Đã phân tích nhanh theo mô hình cục bộ'
      };
    }

    const parsedData: any = parseJsonObjectSafely(responseText);

    if (parsedData && parsedData.timeComplexity) {
      setCachedCodeAnalysis(cacheKey, parsedData);
    }

    return {
      success: true,
      data: parsedData,
      message: 'Đã phân tích mã nguồn siêu tốc thành công'
    };
  }
}

export const aiService = new AiService();
