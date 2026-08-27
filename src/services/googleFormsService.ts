import { listDriveFiles, DriveFileItem } from './googleDriveService';

export interface FormQuestionChoice {
  value: string;
  isOther?: boolean;
}

export interface FormQuestionDef {
  title: string;
  description?: string;
  type: 'TEXT' | 'PARAGRAPH' | 'RADIO' | 'CHECKBOX' | 'DROP_DOWN';
  required?: boolean;
  options?: string[];
}

export interface GoogleFormItem {
  itemId: string;
  title: string;
  description?: string;
  questionItem?: {
    question: {
      questionId: string;
      required?: boolean;
      textQuestion?: { paragraph: boolean };
      choiceQuestion?: {
        type: 'RADIO' | 'CHECKBOX' | 'DROP_DOWN';
        options: { value: string }[];
      };
    };
  };
}

export interface GoogleFormDetails {
  formId: string;
  info: {
    title: string;
    documentTitle?: string;
    description?: string;
  };
  responderUri?: string;
  revisionId?: string;
  items?: GoogleFormItem[];
}

export interface FormResponseAnswer {
  questionId: string;
  textAnswers?: {
    answers: { value: string }[];
  };
}

export interface GoogleFormResponse {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  respondentEmail?: string;
  answers?: Record<string, FormResponseAnswer>;
}

export interface GoogleFormResponsesList {
  responses?: GoogleFormResponse[];
  nextPageToken?: string;
}

/**
 * List all Google Forms created by or accessible to the user
 */
export const listGoogleForms = async (
  accessToken: string,
  query?: string
): Promise<DriveFileItem[]> => {
  const result = await listDriveFiles(accessToken, {
    mimeTypeFilter: 'forms',
    query
  });
  return result.files;
};

/**
 * Get form details (structure, questions)
 */
export const getGoogleForm = async (
  accessToken: string,
  formId: string
): Promise<GoogleFormDetails> => {
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Không thể lấy thông tin biểu mẫu Google Forms');
  }

  return await res.json();
};

/**
 * Get form responses
 */
export const getGoogleFormResponses = async (
  accessToken: string,
  formId: string
): Promise<GoogleFormResponsesList> => {
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Không thể lấy danh sách câu trả lời Google Forms');
  }

  return await res.json();
};

/**
 * Create a new Google Form with optional description and questions
 */
export const createGoogleFormWithQuestions = async (
  accessToken: string,
  title: string,
  description?: string,
  questions: FormQuestionDef[] = []
): Promise<GoogleFormDetails> => {
  // Step 1: Create initial blank form
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      info: {
        title,
        documentTitle: title
      }
    })
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Không thể tạo biểu mẫu Google Forms mới');
  }

  const form: GoogleFormDetails = await createRes.json();
  const formId = form.formId;

  // Step 2: If description or questions exist, batchUpdate form
  const requests: any[] = [];

  if (description) {
    requests.push({
      updateFormInfo: {
        info: {
          description
        },
        updateMask: 'description'
      }
    });
  }

  questions.forEach((q, index) => {
    let questionItem: any = {
      question: {
        required: !!q.required
      }
    };

    if (q.type === 'TEXT') {
      questionItem.question.textQuestion = { paragraph: false };
    } else if (q.type === 'PARAGRAPH') {
      questionItem.question.textQuestion = { paragraph: true };
    } else {
      const options = (q.options && q.options.length > 0 ? q.options : ['Lựa chọn 1', 'Lựa chọn 2']).map(
        (opt) => ({ value: opt })
      );
      questionItem.question.choiceQuestion = {
        type: q.type,
        options
      };
    }

    requests.push({
      createItem: {
        item: {
          title: q.title,
          description: q.description || undefined,
          questionItem
        },
        location: {
          index
        }
      }
    });
  });

  if (requests.length > 0) {
    const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    if (!updateRes.ok) {
      console.warn('Batch update form failed, returning basic form');
    } else {
      // Re-fetch updated form with all items
      return await getGoogleForm(accessToken, formId);
    }
  }

  return form;
};

// Academic Templates for HCMUE FIT
export const ACADEMIC_FORM_TEMPLATES: {
  id: string;
  name: string;
  category: string;
  description: string;
  questions: FormQuestionDef[];
}[] = [
  {
    id: 'course-feedback',
    name: 'Khảo sát Chất lượng Môn học & Giảng dạy',
    category: 'Đánh giá học phần',
    description: 'Biểu mẫu thu thập ý kiến sinh viên về nội dung bài giảng, slide tài liệu, mức độ hỗ trợ của giảng viên và bài tập thực hành.',
    questions: [
      {
        title: 'Môn học bạn đang đánh giá là gì?',
        type: 'TEXT',
        required: true
      },
      {
        title: 'Mức độ hài lòng chung về tài liệu học tập (Slide, Bài tập, Lab)',
        type: 'RADIO',
        required: true,
        options: ['Rất hài lòng (5/5)', 'Hài lòng (4/5)', 'Bình thường (3/5)', 'Cần cải thiện (2/5)', 'Chưa đạt yêu cầu (1/5)']
      },
      {
        title: 'Bạn thấy nội dung nào trong môn học cần bổ sung thêm tài liệu / bài tập mẫu?',
        type: 'CHECKBOX',
        required: false,
        options: [
          'Lý thuyết cơ bản & sơ đồ tư duy',
          'Bài tập thực hành Lab từng tuần',
          'Đề thi trắc nghiệm mẫu & lời giải',
          'Source code đồ án tham khảo'
        ]
      },
      {
        title: 'Ý kiến đóng góp cụ thể giúp nâng cao chất lượng môn học',
        type: 'PARAGRAPH',
        required: false
      }
    ]
  },
  {
    id: 'group-registration',
    name: 'Đăng ký Nhóm Học tập & Đồ án Môn học',
    category: 'Học nhóm & Đồ án',
    description: 'Biểu mẫu thu thập thông tin thành viên, phân công vai trò, đề tài đồ án và thông tin liên lạc (Zalo / GitHub).',
    questions: [
      {
        title: 'Tên nhóm hoặc Mã nhóm',
        type: 'TEXT',
        required: true
      },
      {
        title: 'Họ và tên Trưởng nhóm & MSSV',
        type: 'TEXT',
        required: true
      },
      {
        title: 'Danh sách các thành viên (Họ tên + MSSV + Lớp)',
        type: 'PARAGRAPH',
        required: true
      },
      {
        title: 'Đề tài đồ án nhóm đăng ký thực hiện',
        type: 'TEXT',
        required: true
      },
      {
        title: 'Công nghệ / Framework chính nhóm dự kiến sử dụng',
        type: 'CHECKBOX',
        required: true,
        options: ['React / Next.js / TypeScript', 'Node.js / Express / NestJS', 'Python / Django / FastAPI', 'Java / Spring Boot', 'Flutter / React Native', 'Khác']
      },
      {
        title: 'Link Repository GitHub hoặc Google Drive của nhóm (nếu có)',
        type: 'TEXT',
        required: false
      }
    ]
  },
  {
    id: 'exam-submission',
    name: 'Đóng góp Đề thi & Câu hỏi Ôn tập Môn học',
    category: 'Chia sẻ học thuật',
    description: 'Biểu mẫu tiếp nhận đề thi giữa kỳ, cuối kỳ và câu hỏi trắc nghiệm ôn tập từ sinh viên các khóa.',
    questions: [
      {
        title: 'Môn học đóng góp (Ví dụ: Cấu trúc dữ liệu, Mạng máy tính)',
        type: 'TEXT',
        required: true
      },
      {
        title: 'Loại đề thi / Câu hỏi',
        type: 'RADIO',
        required: true,
        options: ['Đề thi Giữa kỳ (GK)', 'Đề thi Cuối kỳ (CK)', 'Bài kiểm tra 15 phút / Lab', 'Câu hỏi trắc nghiệm ôn tập']
      },
      {
        title: 'Học kỳ & Năm học',
        type: 'TEXT',
        required: true
      },
      {
        title: 'Link Google Drive hoặc nội dung chi tiết đề thi / lời giải',
        type: 'PARAGRAPH',
        required: true
      }
    ]
  },
  {
    id: 'quick-quiz',
    name: 'Bài Kiểm tra Trắc nghiệm Ôn tập Kiến thức CNTT',
    category: 'Trắc nghiệm & Quiz',
    description: 'Biểu mẫu kiểm tra nhanh kiến thức lập trình, cấu trúc dữ liệu và giải thuật 5 câu hỏi.',
    questions: [
      {
        title: 'Họ tên sinh viên & Mã số sinh viên',
        type: 'TEXT',
        required: true
      },
      {
        title: 'Câu 1: Độ phức tạp thời gian trung bình của thuật toán QuickSort là gì?',
        type: 'RADIO',
        required: true,
        options: ['O(n log n)', 'O(n^2)', 'O(n)', 'O(log n)']
      },
      {
        title: 'Câu 2: Cấu trúc dữ liệu nào hoạt động theo nguyên lý LIFO (Last In, First Out)?',
        type: 'RADIO',
        required: true,
        options: ['Stack (Ngăn xếp)', 'Queue (Hàng đợi)', 'Array (Mảng)', 'Linked List (Danh sách liên kết)']
      },
      {
        title: 'Câu 3: Trong giao thức TCP/IP, cổng mặc định của giao thức HTTPS là bao nhiêu?',
        type: 'RADIO',
        required: true,
        options: ['443', '80', '8080', '22']
      },
      {
        title: 'Câu 4: Ngôn ngữ nào sau đây có cơ chế Static Type Checking?',
        type: 'CHECKBOX',
        required: true,
        options: ['TypeScript', 'C++', 'Java', 'Python thuần (không type annotations)']
      }
    ]
  }
];
