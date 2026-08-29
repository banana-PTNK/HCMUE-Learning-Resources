import React, { useRef, useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Copy,
  ChevronRight,
  Layers,
  Check,
  RefreshCw,
  Trash2,
  Square
} from 'lucide-react';
import { MasterCourseSection, BatchFileItem } from '../types';
import { formatFileSize } from '../utils/scheduleParser';
import { useSchedule } from '../context/ScheduleContext';

interface BatchScheduleUploaderProps {
  onBatchComplete: (
    newSections: MasterCourseSection[],
    sourceFileNames: string[],
    mode: 'merge' | 'replace'
  ) => void;
  activeSourceFiles: string[];
  masterCatalogCount: number;
  uniqueCoursesCount: number;
  onResetSample: () => void;
  onOpenRawInputModal: () => void;
  onProceedToStep2: () => void;
  selectedCourseCodesCount: number;
  onRemoveFile?: (fileName: string) => void;
  onClearAllFiles?: () => void;
}

export const BatchScheduleUploader: React.FC<BatchScheduleUploaderProps> = ({
  activeSourceFiles,
  masterCatalogCount,
  uniqueCoursesCount,
  onOpenRawInputModal,
  onProceedToStep2,
  selectedCourseCodesCount,
  onRemoveFile,
  onClearAllFiles
}) => {
  const {
    fileQueue,
    isProcessing,
    overallProgress,
    batchStats,
    batchMode,
    setBatchMode,
    queueMetrics,
    addFilesToQueue,
    retryFailedItems,
    cancelQueue,
    removeQueueItem,
    clearQueue
  } = useSchedule();

  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to get corresponding icon for file type
  const renderFileIcon = (type: BatchFileItem['type']) => {
    switch (type) {
      case 'excel':
      case 'csv':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-purple-500 shrink-0" />;
      case 'text':
        return <FileText className="w-5 h-5 text-blue-500 shrink-0" />;
      default:
        return <FileIcon className="w-5 h-5 text-slate-400 shrink-0" />;
    }
  };

  // Handle incoming files from input or dropzone (incremental only)
  const handleAddFiles = (files: FileList | File[]) => {
    addFilesToQueue(files);
  };

  // Remove or cancel an individual item
  const handleRemoveQueueItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = fileQueue.find((item) => item.id === id);
    if (target && target.status === 'done') {
      onRemoveFile?.(target.name);
    }
    removeQueueItem(id);
  };

  // Clear entire queue
  const handleClearQueue = () => {
    clearQueue();
    onClearAllFiles?.();
  };

  // Drag & drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Chế độ nạp dữ liệu Thời khóa biểu:</span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            {batchMode === 'merge'
              ? '✨ Gộp thêm: Bổ sung thêm các môn/lớp mới từ tệp tải lên (tự động loại trừ trùng lặp).'
              : '⚡ Thay thế: Xóa danh mục TKB hiện tại và thiết lập lại toàn bộ bằng dữ liệu từ tệp mới tải lên.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Merge / Replace Toggle */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 text-xs border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setBatchMode('merge')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                batchMode === 'merge'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Gộp thêm vào danh sách môn hiện tại"
            >
              <span>Gộp thêm</span>
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setBatchMode('replace')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                batchMode === 'replace'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Thay thế hoàn toàn bằng danh mục từ các tệp mới"
            >
              <span>Thay thế</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Grid: Batch Dropzone & Quick Info Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Dropzone */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`lg:col-span-2 relative p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#131b2e] border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center text-center space-y-4 cursor-pointer group shadow-sm ${
            isDragOver
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[1.008]'
              : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.csv,image/*,text/*,.txt,.tsv"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleAddFiles(e.target.files);
                e.target.value = '';
              }
            }}
            className="hidden"
          />

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div className="flex -space-x-2 overflow-hidden">
              <div className="inline-block p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 shadow-sm" title="Excel / CSV">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="inline-block p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-700 text-rose-600 dark:text-rose-400 shadow-sm" title="PDF">
                <FileText className="w-4 h-4" />
              </div>
              <div className="inline-block p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400 shadow-sm" title="Ảnh chụp màn hình">
                <ImageIcon className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5 max-w-xl">
            <div className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2 flex-wrap">
              <span>Kéo thả hoặc Bấm để tải lên tệp TKB</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Hỗ trợ <strong>Excel (.xlsx, .xls, .csv)</strong>, <strong>PDF Thời khóa biểu</strong>, <strong>Ảnh chụp màn hình</strong>, và <strong>Văn bản</strong>. Tự động bóc tách nhanh chóng.
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/40 py-1 px-2.5 rounded-lg inline-block border border-emerald-200 dark:border-emerald-800">
              💡 Khuyên dùng: Tải lên tệp Excel (.xlsx) để xử lý nhanh dưới 0.1s và đạt độ chính xác 100%
            </p>
          </div>
        </div>

        {/* Current Active Data Source Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>Nguồn Dữ Liệu TKB</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                {masterCatalogCount} LHP
              </span>
            </div>

            {activeSourceFiles.length > 0 ? (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 space-y-2">
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Đã nạp {activeSourceFiles.length} tệp dữ liệu:</span>
                  </span>
                  {onClearAllFiles && (
                    <button
                      type="button"
                      onClick={onClearAllFiles}
                      className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                      title="Xóa toàn bộ dữ liệu TKB"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xóa hết</span>
                    </button>
                  )}
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {activeSourceFiles.map((fname, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] text-emerald-700 dark:text-emerald-300/90 font-mono flex items-center justify-between gap-1.5 truncate bg-white/70 dark:bg-emerald-900/30 px-2 py-1 rounded-md border border-emerald-200/50 dark:border-emerald-700/40"
                    >
                      <div className="flex items-center gap-1.5 truncate min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate">{fname}</span>
                      </div>
                      {onRemoveFile && (
                        <button
                          type="button"
                          onClick={() => onRemoveFile(fname)}
                          className="text-slate-400 hover:text-rose-500 hover:bg-rose-100/60 dark:hover:bg-rose-950/50 p-0.5 rounded transition-colors shrink-0 cursor-pointer"
                          title={`Xóa tệp "${fname}" và các môn học thuộc tệp này`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400/80 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40">
                  Tổng cộng: <strong>{masterCatalogCount} lớp học phần</strong> ({uniqueCoursesCount} môn học).
                </div>
              </div>
            ) : masterCatalogCount > 0 ? (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  Đã nạp {uniqueCoursesCount} môn ({masterCatalogCount} lớp học phần)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sẵn sàng chuyển sang Bước 2 để chọn môn và tối ưu lịch học.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  Chưa có dữ liệu thời khóa biểu
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kéo thả hoặc tải lên tệp TKB (Excel, PDF, ảnh) để bắt đầu phân tích.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={onOpenRawInputModal}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Dán văn bản / Bảng TKB</span>
            </button>

            <button
              type="button"
              onClick={onProceedToStep2}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 cursor-pointer"
            >
              <span>Chuyển sang Bước 2 ({selectedCourseCodesCount} môn)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Queue Dashboard & Progress */}
      {fileQueue.length > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {isProcessing ? (
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <span>
                      {isProcessing
                        ? `Đang phân tích dữ liệu (${queueMetrics?.completedFiles ?? 0}/${fileQueue.length} tệp)`
                        : `Đã hoàn thành phân tích ${fileQueue.length} tệp`}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                        isProcessing
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 animate-pulse'
                          : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {overallProgress}%
                    </span>
                  </h4>

                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {isProcessing
                      ? 'Đang tự động bóc tách các môn học và lớp học phần trong nền...'
                      : `Tổng cộng: ${batchStats?.totalExtracted ?? masterCatalogCount} lớp học phần hợp lệ.`}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {isProcessing ? (
                <button
                  type="button"
                  onClick={cancelQueue}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                  title="Dừng xử lý"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Dừng</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleClearQueue}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5"
                  title="Xóa danh sách tải lên"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa hàng đợi</span>
                </button>
              )}
            </div>
          </div>

          {/* Master Visual Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out shadow-sm ${
                  isProcessing
                    ? 'bg-blue-600'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(4, overallProgress)}%` }}
              />
            </div>
          </div>

          {/* Individual Task Cards */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Chi tiết danh sách tệp ({fileQueue.length})</span>
              {fileQueue.some((i) => i.status === 'error') && !isProcessing && (
                <button
                  type="button"
                  onClick={retryFailedItems}
                  className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold normal-case cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Thử lại các tệp lỗi</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {fileQueue.map((item) => {
                const isActive = item.status === 'processing';
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col gap-2 ${
                      isActive
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700/60 shadow-sm ring-1 ring-blue-500/20'
                        : item.status === 'done'
                        ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                        : item.status === 'error'
                        ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
                        : 'bg-slate-50/30 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {renderFileIcon(item.type)}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                            <span className="truncate">{item.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {formatFileSize(item.size)} • {item.type.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status Badge */}
                        {item.status === 'processing' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px] font-semibold animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>{item.progress}%</span>
                          </span>
                        )}

                        {item.status === 'done' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                            <Check className="w-3 h-3" />
                            <span>+{item.extractedCount} LHP</span>
                          </span>
                        )}

                        {item.status === 'error' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                            <AlertCircle className="w-3 h-3" />
                            <span>Lỗi</span>
                          </span>
                        )}

                        {item.status === 'queued' && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium">
                            Đang chờ
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleRemoveQueueItem(item.id, e)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title={isActive ? 'Hủy xử lý tệp này' : 'Xóa tệp khỏi danh sách'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress message & mini bar for active item */}
                    {isActive && (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[10px] text-blue-600 dark:text-blue-300 font-medium">
                          <span className="truncate">{item.message}</span>
                          <span className="font-mono font-bold shrink-0">{item.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-blue-200/60 dark:bg-blue-950 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-200"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Completion message */}
                    {!isActive && item.message && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {item.message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
