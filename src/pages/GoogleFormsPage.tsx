import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  ExternalLink,
  Share2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
  Eye,
  Copy,
  ChevronRight,
  ListOrdered,
  Layers,
  HelpCircle,
  X,
  MessageSquareQuote
} from 'lucide-react';
import { useGoogleWorkspace } from '../context/GoogleWorkspaceContext';
import {
  listGoogleForms,
  getGoogleForm,
  getGoogleFormResponses,
  createGoogleFormWithQuestions,
  ACADEMIC_FORM_TEMPLATES,
  GoogleFormDetails,
  GoogleFormResponse,
  FormResponseAnswer,
  FormQuestionDef
} from '../services/googleFormsService';
import { DriveFileItem } from '../services/googleDriveService';
import { useToast } from '../context/ToastContext';

export const GoogleFormsPage: React.FC = () => {
  const { user, accessToken, isLoading: authLoading, signIn } = useGoogleWorkspace();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [formsList, setFormsList] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Create Form State
  const [formTitle, setFormTitle] = useState('Khảo sát & Đóng góp ý kiến môn học CNTT');
  const [formDescription, setFormDescription] = useState(
    'Biểu mẫu khảo sát học vụ từ Ban học tập & Sinh viên Khoa CNTT - HCMUE.'
  );
  const [questions, setQuestions] = useState<FormQuestionDef[]>([
    {
      title: 'Họ và tên sinh viên',
      type: 'TEXT',
      required: true
    },
    {
      title: 'Mã số sinh viên (MSSV)',
      type: 'TEXT',
      required: true
    },
    {
      title: 'Đánh giá độ hữu ích của tài liệu & bài tập thực hành',
      type: 'RADIO',
      required: true,
      options: ['Rất tốt (5 sao)', 'Tốt (4 sao)', 'Bình thường (3 sao)', 'Cần bổ sung (2 sao)']
    },
    {
      title: 'Nội dung thắc mắc hoặc đề xuất cải tiến cho môn học',
      type: 'PARAGRAPH',
      required: false
    }
  ]);
  const [isCreating, setIsCreating] = useState(false);

  // Success Created Modal
  const [createdForm, setCreatedForm] = useState<GoogleFormDetails | null>(null);

  // View Responses Modal
  const [selectedFormForResponses, setSelectedFormForResponses] = useState<DriveFileItem | null>(null);
  const [formResponses, setFormResponses] = useState<GoogleFormResponse[]>([]);
  const [selectedFormDetails, setSelectedFormDetails] = useState<GoogleFormDetails | null>(null);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const fetchForms = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const items = await listGoogleForms(accessToken);
      setFormsList(items);
    } catch (err: any) {
      console.error('Fetch forms error:', err);
      setError(err?.message || 'Không thể tải danh sách Google Forms.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      fetchForms();
    }
  }, [accessToken, fetchForms]);

  const handleApplyTemplate = (templateId: string) => {
    const tmpl = ACADEMIC_FORM_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;

    setFormTitle(tmpl.name);
    setFormDescription(tmpl.description);
    setQuestions(JSON.parse(JSON.stringify(tmpl.questions)));
    setActiveTab('create');
    toast.success('Đã áp dụng mẫu biểu mẫu!', tmpl.name);
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        title: `Câu hỏi số ${questions.length + 1}`,
        type: 'TEXT',
        required: true
      }
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast.info('Tối thiểu 1 câu hỏi', 'Biểu mẫu cần có ít nhất một trường thông tin.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof FormQuestionDef, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleAddOption = (questionIndex: number) => {
    const updated = [...questions];
    const opts = updated[questionIndex].options || [];
    opts.push(`Lựa chọn ${opts.length + 1}`);
    updated[questionIndex].options = opts;
    setQuestions(updated);
  };

  const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    const opts = updated[questionIndex].options || [];
    if (opts.length <= 2) {
      toast.info('Tối thiểu 2 lựa chọn', 'Câu hỏi trắc nghiệm/danh sách cần ít nhất 2 lựa chọn.');
      return;
    }
    updated[questionIndex].options = opts.filter((_, i) => i !== optionIndex);
    setQuestions(updated);
  };

  const handleOptionTextChange = (questionIndex: number, optionIndex: number, text: string) => {
    const updated = [...questions];
    const opts = [...(updated[questionIndex].options || [])];
    opts[optionIndex] = text;
    updated[questionIndex].options = opts;
    setQuestions(updated);
  };

  const handleCreateFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!formTitle.trim()) {
      toast.error('Thiếu tiêu đề', 'Vui lòng nhập tiêu đề cho biểu mẫu.');
      return;
    }

    setIsCreating(true);
    try {
      const result = await createGoogleFormWithQuestions(
        accessToken,
        formTitle.trim(),
        formDescription.trim(),
        questions
      );

      setCreatedForm(result);
      toast.success(
        'Đã tạo Google Form thành công!',
        `Biểu mẫu "${result.info?.title || formTitle}" đã được xuất bản trực tiếp lên Google Forms.`
      );
      fetchForms();
    } catch (err: any) {
      toast.error('Lỗi tạo Google Form', err?.message || 'Không thể tạo biểu mẫu Google Forms.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInspectResponses = async (formItem: DriveFileItem) => {
    if (!accessToken) return;
    setSelectedFormForResponses(formItem);
    setLoadingResponses(true);
    setFormResponses([]);
    setSelectedFormDetails(null);

    try {
      const [details, responsesData] = await Promise.all([
        getGoogleForm(accessToken, formItem.id).catch(() => null),
        getGoogleFormResponses(accessToken, formItem.id).catch(() => ({ responses: [] }))
      ]);

      setSelectedFormDetails(details);
      setFormResponses(responsesData.responses || []);
    } catch (err: any) {
      console.error('Inspect responses error:', err);
      toast.error('Lỗi đọc phản hồi', err?.message || 'Không thể tải phản hồi từ Google Forms API.');
    } finally {
      setLoadingResponses(false);
    }
  };

  // Not authenticated screen
  if (!accessToken || !user) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
        <div className="rounded-3xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-6 shadow-sm">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-md">
            <FileText className="w-10 h-10" />
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Tạo & Quản lý Biểu mẫu Google Forms Học tập
            </h1>
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 mt-2.5 font-normal border-l-2 border-purple-500/80 dark:border-purple-400/80 pl-3.5 py-0.5 text-left max-w-xl mx-auto leading-relaxed">
              Tự động tạo khảo sát môn học, biểu mẫu đăng ký nhóm đồ án, tiếp nhận đề thi và xem câu trả lời của sinh viên tức thì thông qua Google Forms API.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Mẫu Biểu Mẫu Học Thuật
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Mẫu khảo sát giảng dạy, đăng ký nhóm đồ án, tiếp nhận đề thi có sẵn.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Google Forms API v1
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Khởi tạo Form chính thức trên tài khoản Google của bạn với 1 lần bấm.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Xem Phản Hồi Thời Gian Thực
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Đọc phản hồi câu hỏi trực tiếp từ ứng dụng mà không cần rời trang.
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="google-forms-login-btn"
              onClick={() => signIn()}
              disabled={authLoading}
              className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-semibold text-sm shadow-lg shadow-purple-600/25 transition-all duration-200 flex items-center gap-2.5 cursor-pointer"
            >
              {authLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Đăng nhập với Google Forms</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Google Forms Học Thuật Khoa CNTT
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-semibold border border-purple-200 dark:border-purple-800/50">
                API Connected
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tài khoản: <span className="font-semibold text-slate-700 dark:text-slate-300">{user.email}</span>
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#131b2e] p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-white dark:bg-[#0e1424] text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Biểu mẫu của bạn ({formsList.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Biểu mẫu Mới</span>
          </button>
        </div>
      </div>

      {/* Main Tab 1: Forms List */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* Quick Academic Template Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-900/10 via-indigo-900/5 to-transparent border border-purple-200/80 dark:border-purple-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300 font-mono">
                  Mẫu Biểu Mẫu Học Thuật Khuyến Nghị
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">Khởi tạo nhanh 1-Click</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {ACADEMIC_FORM_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => handleApplyTemplate(tmpl.id)}
                  className="p-3.5 rounded-2xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 cursor-pointer shadow-xs hover:shadow-md transition-all group space-y-2"
                >
                  <div className="text-[10px] font-semibold font-mono text-purple-600 dark:text-purple-400">
                    {tmpl.category}
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 line-clamp-1">
                    {tmpl.name}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {tmpl.description}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                    <span>{tmpl.questions.length} câu hỏi mẫu</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800 space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto text-purple-600 dark:text-purple-400 animate-spin" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Đang nạp danh sách Google Forms từ Drive API...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-rose-900 dark:text-rose-200">Lỗi truy vấn Google Forms</div>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{error}</p>
                <button
                  onClick={() => fetchForms()}
                  className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Thử lại</span>
                </button>
              </div>
            </div>
          ) : formsList.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800 space-y-4">
              <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Chưa có Google Forms nào được tạo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Bấm nút "Tạo Biểu mẫu Mới" hoặc chọn một mẫu học thuật phía trên để tạo Google Form tự động với Google Forms API.
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-600/20 cursor-pointer"
              >
                Bắt đầu Tạo Biểu mẫu ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formsList.map((form) => {
                const editUrl = `https://docs.google.com/forms/d/${form.id}/edit`;
                const viewUrl = `https://docs.google.com/forms/d/${form.id}/viewform`;

                return (
                  <div
                    key={form.id}
                    className="p-5 rounded-3xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800/60 text-purple-600 dark:text-purple-400">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {form.modifiedTime ? new Date(form.modifiedTime).toLocaleDateString('vi-VN') : 'Mới tạo'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2" title={form.name}>
                          {form.name}
                        </h4>
                        <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                          ID: {form.id}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={viewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#131b2e] hover:bg-slate-200 dark:hover:bg-[#1a243b] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Link trả lời</span>
                        </a>

                        <a
                          href={editUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Mở Trình sửa</span>
                        </a>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => handleInspectResponses(form)}
                          className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Xem phản hồi câu trả lời</span>
                        </button>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(viewUrl);
                            toast.success('Đã sao chép link gửi biểu mẫu!', viewUrl);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Sao chép link biểu mẫu"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Tab 2: Create Form Builder */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreateFormSubmit} className="space-y-6">
          {/* Header config card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 font-mono">
                Thông tin chung Biểu Mẫu
              </span>
              <span className="text-xs text-slate-400">Google Forms API v1 Integration</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tiêu đề biểu mẫu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Nhập tiêu đề biểu mẫu..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả / Hướng dẫn điền
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Mô tả mục đích của form khảo sát hoặc thu thập thông tin..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Questions Builder Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Danh sách Câu hỏi ({questions.length})
              </h3>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800/60 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Câu hỏi</span>
              </button>
            </div>

            {questions.map((q, qIndex) => (
              <div
                key={qIndex}
                className="p-5 rounded-3xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center font-mono">
                      {qIndex + 1}
                    </span>
                    <input
                      type="text"
                      required
                      value={q.title}
                      onChange={(e) => handleQuestionChange(qIndex, 'title', e.target.value)}
                      placeholder="Nội dung câu hỏi..."
                      className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-purple-500 focus:outline-none px-1 py-0.5"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Question Type Selector */}
                    <select
                      value={q.type}
                      onChange={(e) => {
                        const newType = e.target.value as any;
                        const updated = [...questions];
                        updated[qIndex].type = newType;
                        if (['RADIO', 'CHECKBOX', 'DROP_DOWN'].includes(newType) && (!q.options || q.options.length === 0)) {
                          updated[qIndex].options = ['Lựa chọn 1', 'Lựa chọn 2'];
                        }
                        setQuestions(updated);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                    >
                      <option value="TEXT">Trả lời ngắn (Text)</option>
                      <option value="PARAGRAPH">Đoạn văn (Paragraph)</option>
                      <option value="RADIO">Trắc nghiệm (Radio)</option>
                      <option value="CHECKBOX">Hộp kiểm (Checkbox)</option>
                      <option value="DROP_DOWN">Menu thả xuống (Dropdown)</option>
                    </select>

                    {/* Required switch */}
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!q.required}
                        onChange={(e) => handleQuestionChange(qIndex, 'required', e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Bắt buộc</span>
                    </label>

                    {/* Delete question */}
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer"
                      title="Xóa câu hỏi này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Multiple choice options editor */}
                {['RADIO', 'CHECKBOX', 'DROP_DOWN'].includes(q.type) && (
                  <div className="pl-8 space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Các phương án lựa chọn:
                    </div>
                    {q.options?.map((opt, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleOptionTextChange(qIndex, optIndex, e.target.value)}
                          placeholder={`Lựa chọn ${optIndex + 1}`}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(qIndex, optIndex)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                          title="Xóa phương án"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddOption(qIndex)}
                      className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm lựa chọn khác</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Action Card */}
          <div className="flex items-center justify-between p-6 rounded-3xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Sẵn sàng xuất bản?</div>
              <p className="text-[11px] text-slate-500">
                Biểu mẫu sẽ được tạo chính thức trên tài khoản Google Forms của bạn.
              </p>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-lg shadow-purple-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isCreating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Xuất bản Google Form (API)</span>
            </button>
          </div>
        </form>
      )}

      {/* Success Created Modal */}
      {createdForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0e1424] border border-purple-200 dark:border-purple-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Đã tạo Google Form thành công!
                </h3>
                <p className="text-xs text-slate-500">Biểu mẫu đã hoạt động và sẵn sàng nhận phản hồi.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 space-y-3">
              <div>
                <div className="text-[11px] font-semibold text-slate-400">Tiêu đề:</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {createdForm.info?.title}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-400">Link chia sẻ cho sinh viên:</div>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={createdForm.responderUri || `https://docs.google.com/forms/d/${createdForm.formId}/viewform`}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={() => {
                      const url = createdForm.responderUri || `https://docs.google.com/forms/d/${createdForm.formId}/viewform`;
                      navigator.clipboard.writeText(url);
                      toast.success('Đã sao chép link biểu mẫu!', url);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={`https://docs.google.com/forms/d/${createdForm.formId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                <span>Mở trong Google Forms Editor</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => {
                  setCreatedForm(null);
                  setActiveTab('list');
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responses Modal */}
      {selectedFormForResponses && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    Phản hồi: {selectedFormForResponses.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Dữ liệu thời gian thực từ Google Forms API
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedFormForResponses(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {loadingResponses ? (
                <div className="p-12 text-center space-y-3">
                  <RefreshCw className="w-6 h-6 mx-auto text-purple-600 dark:text-purple-400 animate-spin" />
                  <p className="text-xs text-slate-500 font-mono">Đang truy vấn câu trả lời từ Google API...</p>
                </div>
              ) : formResponses.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <MessageSquareQuote className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Chưa có sinh viên nào điền biểu mẫu này
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Hãy gửi link điền cho các bạn trong lớp hoặc nhóm học tập để nhận phản hồi.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tổng số phản hồi: <span className="text-purple-600 dark:text-purple-400">{formResponses.length}</span>
                  </div>

                  {formResponses.map((resp, rIdx) => (
                    <div
                      key={resp.responseId || rIdx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700/60 space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-900 dark:text-white font-mono">
                          Phản hồi #{rIdx + 1}
                        </span>
                        <span className="font-mono">{new Date(resp.lastSubmittedTime).toLocaleString('vi-VN')}</span>
                      </div>

                      {resp.answers &&
                        Object.entries(resp.answers).map(([qId, answer]) => {
                          const ans = answer as FormResponseAnswer;
                          return (
                            <div key={qId} className="space-y-0.5">
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                Câu hỏi ID: {qId}
                              </div>
                              <div className="font-semibold text-slate-900 dark:text-white bg-white dark:bg-[#0e1424] p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                                {ans?.textAnswers?.answers?.map((a) => a.value).join(', ') || '(Trống)'}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
              <button
                onClick={() => setSelectedFormForResponses(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
