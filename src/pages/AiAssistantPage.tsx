import React, { useState } from 'react';
import { Bot, Sparkles, ShieldAlert, CheckCircle2, Zap, HelpCircle, Layers, Code } from 'lucide-react';
import { CodeEditor } from '../components/CodeEditor';
import { explainCodeAI } from '../services/aiService';
import { CodeAnalysisResult } from '../types';
import { useToast } from '../context/ToastContext';

const renderFormattedText = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="bg-slate-800 dark:bg-slate-900 border border-slate-700/60 px-1.5 py-0.5 rounded font-mono text-amber-300 dark:text-amber-300 font-medium text-[0.9em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={idx}>{part}</span>;
  });
};

interface AiAssistantPageProps {
  onNavigate?: (path: string) => void;
}

export const AiAssistantPage: React.FC<AiAssistantPageProps> = ({ onNavigate }) => {
  const { toast } = useToast();
  const [code, setCode] = useState<string>(`// Thuật toán Tìm kiếm Nhị phân - HCMUE FIT
int binarySearch(const vector<int>& arr, int target) {
    int left = 0;
    int right = arr.size() - 1;
    
    while (left <= right) {
        int mid = left + (right - left) / 2;
        
        if (arr[mid] == target) {
            return mid; // Tìm thấy phần tử
        } else if (arr[mid] < target) {
            left = mid + 1; // Tìm ở nửa bên phải
        } else {
            right = mid - 1; // Tìm ở nửa bên trái
        }
    }
    return -1; // Không tìm thấy
}`);

  const [language, setLanguage] = useState<string>('cpp');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisDuration, setAnalysisDuration] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'dryrun' | 'warnings' | 'optimizations' | 'edgecases'>('dryrun');

  const [analysisResult, setAnalysisResult] = useState<CodeAnalysisResult>({
    timeComplexity: "O(log n)",
    spaceComplexity: "O(1)",
    isOptimal: true,
    spaceType: "Tại chỗ (In-place)",
    dryRunSteps: [
      {
        step: 1,
        desc: "Khởi tạo boundaries `left = 0`, `right = arr.size() - 1`",
        variables: "left: 0, right: 9, target: 7"
      },
      {
        step: 2,
        desc: "Tính điểm giữa `mid = left + (right - left) / 2` để tránh tràn số nguyên",
        variables: "mid: 4, arr[mid]: 5 < 7"
      },
      {
        step: 3,
        desc: "Thu hẹp không gian tìm kiếm sang nửa phải: `left = mid + 1`",
        variables: "left: 5, right: 9"
      }
    ],
    warnings: [
      "Mảng đầu vào bắt buộc phải được sắp xếp tăng dần."
    ],
    optimizations: [
      "Có thể thay phép chia `/ 2` bằng phép dịch bit `>> 1`."
    ],
    edgeCases: [
      "Mảng rỗng (size = 0).",
      "Phần tử nằm ở vị trí đầu tiên hoặc cuối cùng."
    ],
    summary: "Thuật toán Tìm kiếm Nhị phân đạt chuẩn tối ưu về thời gian thực thi."
  });

  const handleAnalyze = async () => {
    if (!code.trim()) {
      toast.warning('Mã nguồn trống', 'Vui lòng nhập hoặc dán mã nguồn cần phân tích.');
      return;
    }

    setIsAnalyzing(true);
    const startTime = performance.now();
    try {
      const res = await explainCodeAI({ code, language });
      if (res && res.data) {
        setAnalysisResult(res.data);
        const elapsed = Math.round(performance.now() - startTime);
        setAnalysisDuration(elapsed);
        toast.success('Phân tích thành công!', `Hoàn tất trong ${(elapsed / 1000).toFixed(1)}s`);
      } else {
        throw new Error(res.error || 'Không nhận được dữ liệu phân tích');
      }
    } catch (e: any) {
      console.error('Lỗi khi phân tích mã nguồn qua explainCodeAI:', e);
      toast.error('Lỗi phân tích mã nguồn', e.message || 'Không thể kết nối đến máy chủ AI');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-50 to-white dark:from-[#131b2e] dark:to-[#0f172a] border border-slate-200 dark:border-slate-700/60 shadow-xs transition-colors duration-200">
        <div>
          <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-mono">
            <button
              onClick={() => onNavigate && onNavigate('/')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Trang chủ
            </button>
            <span>/</span>
            <span>Công cụ thông minh</span>
            <span>/</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Trợ lý Code & Thuật toán</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Bot className="w-8 h-8 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Trợ Lý Phân Tích Thuật Toán & Big-O</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed max-w-3xl mt-2.5 font-normal border-l-2 border-indigo-500/80 dark:border-indigo-400/80 pl-3.5 py-0.5">
            Đồng hành cùng sinh viên phân tích và giải thích thuật toán trực quan, phát hiện lỗi mã nguồn và nâng cao tư duy lập trình hiệu quả.
          </p>
        </div>
      </div>

      <div className="flex flex-col space-y-3 w-full">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 font-mono">
          <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Code className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Không gian soạn thảo mã nguồn
          </span>
        </div>

        <CodeEditor
          code={code}
          onChange={setCode}
          language={language}
          onLanguageChange={setLanguage}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
        />
      </div>

      <div className="space-y-5 w-full pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Kết Quả Phân Tích Thuật Toán & Độ Phức Tạp Big-O</span>
              </h2>
            </div>
          </div>

          {analysisDuration !== null && (
            <div className="self-start sm:self-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-mono">
              <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Phân tích siêu tốc ({analysisDuration < 1000 ? `${analysisDuration}ms` : `${(analysisDuration / 1000).toFixed(1)}s`})</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono">
                Thời gian (Time)
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-mono">
                {analysisResult.isOptimal !== false ? 'Tối ưu' : 'Chưa tối ưu'}
              </span>
            </div>
            <div className="text-[24px] md:text-[28px] leading-[36px] font-extrabold text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
              {analysisResult.timeComplexity}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Worst-case Time Complexity
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono">
                Bộ nhớ (Space)
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 font-mono">
                {analysisResult.spaceType || 'Tại chỗ (In-place)'}
              </span>
            </div>
            <div className="text-[24px] md:text-[28px] leading-[36px] font-extrabold text-sky-600 dark:text-sky-400 font-mono tracking-tight">
              {analysisResult.spaceComplexity}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Auxiliary Space Complexity
            </div>
          </div>
        </div>

        <div className="p-5 md:p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            {[
              { id: 'dryrun', label: 'Từng bước chạy (Dry Run)', icon: Layers },
              { id: 'warnings', label: `Cảnh báo rủi ro (${analysisResult.warnings?.length || 0})`, icon: ShieldAlert },
              { id: 'optimizations', label: 'Tối ưu hóa', icon: Zap },
              { id: 'edgecases', label: 'Trường hợp biên', icon: HelpCircle }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`ai-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab === 'dryrun' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {analysisResult.dryRunSteps?.map((step) => (
                  <div
                    key={step.step}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-[#090e18] border border-slate-200 dark:border-slate-800/90 space-y-2 text-xs hover:border-indigo-300 dark:hover:border-indigo-900/60 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 px-2.5 py-1 rounded-md">
                        Bước {step.step}
                      </span>
                      {step.variables && (
                        <span className="font-mono text-xs md:text-sm font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 px-3 py-1 rounded-lg">
                          {step.variables}
                        </span>
                      )}
                    </div>
                    <div className="text-sm md:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-normal mt-2.5">
                      {renderFormattedText(step.desc)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'warnings' && (
            <div className="space-y-2.5 animate-in fade-in duration-150">
              {analysisResult.warnings?.map((warn, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-sm text-amber-950 dark:text-amber-200 flex items-start gap-3 transition-colors"
                >
                  <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium">
                    {renderFormattedText(warn)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'optimizations' && (
            <div className="space-y-2.5 animate-in fade-in duration-150">
              {analysisResult.optimizations?.map((opt, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-sm text-indigo-950 dark:text-indigo-200 flex items-start gap-3 transition-colors"
                >
                  <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium">
                    {renderFormattedText(opt)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'edgecases' && (
            <div className="space-y-2.5 animate-in fade-in duration-150">
              {analysisResult.edgeCases?.map((edge, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#090e18] border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 flex items-start gap-3 transition-colors"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    {renderFormattedText(edge)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {analysisResult.summary && (
            <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 text-sm leading-relaxed text-slate-700 dark:text-slate-200 flex items-start gap-2">
              <span className="text-lg shrink-0">💡</span>
              <div>
                <span className="font-bold text-slate-900 dark:text-white mr-1.5">Đánh giá chung:</span>
                <span>{analysisResult.summary}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};