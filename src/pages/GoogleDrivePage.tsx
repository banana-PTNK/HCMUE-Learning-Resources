import React, { useState, useEffect, useCallback } from 'react';
import {
  Folder,
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  Search,
  Upload,
  FolderPlus,
  RefreshCw,
  Trash2,
  ExternalLink,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Grid,
  List,
  Sparkles,
  ArrowRight,
  Plus
} from 'lucide-react';
import { useGoogleWorkspace } from '../context/GoogleWorkspaceContext';
import { EmptyStateIllustration } from '../components/EmptyStateIllustration';
import {
  listDriveFiles,
  createDriveFolder,
  uploadFileToDrive,
  saveTextFileToDrive,
  deleteDriveFile,
  DriveFileItem
} from '../services/googleDriveService';
import { useToast } from '../context/ToastContext';

export const GoogleDrivePage: React.FC = () => {
  const { user, accessToken, isLoading: authLoading, signIn, signOut } = useGoogleWorkspace();
  const { toast } = useToast();

  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // New folder modal
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Upload file state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  // Delete confirm modal
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick sync sample resource state
  const [isSyncingSample, setIsSyncingSample] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listDriveFiles(accessToken, {
        query: searchQuery,
        mimeTypeFilter: filterType,
        pageSize: 50
      });
      setFiles(res.files || []);
    } catch (err: any) {
      console.error('Fetch drive files error:', err);
      setError(err?.message || 'Không thể tải danh sách tệp từ Google Drive.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, searchQuery, filterType]);

  useEffect(() => {
    if (accessToken) {
      fetchFiles();
    }
  }, [accessToken, fetchFiles]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const folder = await createDriveFolder(accessToken, newFolderName.trim());
      toast.success('Tạo thư mục thành công!', `Đã tạo thư mục "${folder.name}" trên Google Drive.`);
      setNewFolderName('');
      setIsFolderModalOpen(false);
      fetchFiles();
    } catch (err: any) {
      toast.error('Lỗi tạo thư mục', err?.message || 'Không thể tạo thư mục.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!accessToken || !uploadedFiles || uploadedFiles.length === 0) return;

    const file = uploadedFiles[0];
    setIsUploading(true);
    setUploadProgressText(`Đang tải lên: ${file.name}...`);

    try {
      await uploadFileToDrive(accessToken, file, file.name, file.type || 'application/octet-stream');
      toast.success('Tải lên thành công!', `File "${file.name}" đã được lưu trên Google Drive.`);
      fetchFiles();
    } catch (err: any) {
      toast.error('Lỗi tải file', err?.message || 'Không thể tải file lên Drive.');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      e.target.value = '';
    }
  };

  const handleDeleteFile = async () => {
    if (!accessToken || !fileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(accessToken, fileToDelete.id);
      toast.info('Đã xóa tệp', `Đã chuyển "${fileToDelete.name}" vào thùng rác Google Drive.`);
      setFileToDelete(null);
      fetchFiles();
    } catch (err: any) {
      toast.error('Lỗi khi xóa', err?.message || 'Không thể xóa tệp trên Google Drive.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSyncSampleResources = async () => {
    if (!accessToken) return;
    setIsSyncingSample(true);
    try {
      const sampleText = `# HCMUE-FIT StudyVault: Lộ trình & Tài liệu Cơ sở ngành CNTT
Kính gửi Sinh viên Khoa Công nghệ Thông tin - Trường ĐH Sư Phạm TP.HCM,

Tài liệu này bao gồm danh mục môn học trọng tâm và liên kết học tập:
1. Nhập môn Lập trình (C/C++): Cú pháp, con trỏ, cấp phát động.
2. Cấu trúc dữ liệu & Giải thuật: Stack, Queue, Linked List, BST, AVL Tree, Graph.
3. Cơ sở dữ liệu: Mô hình quan hệ, Đại số quan hệ, Chuẩn hóa 1NF-3NF-BCNF, SQL nâng cao.
4. Mạng máy tính: Mô hình OSI, TCP/IP, Định tuyến Subnetting & Socket Programming.
5. Kiến trúc máy tính & HĐH: Luồng tiến trình, Quản lý bộ nhớ ảo, Semaphore.

Được tạo tự động từ ứng dụng HCMUE-FIT StudyVault vào ngày ${new Date().toLocaleDateString('vi-VN')}.`;

      await saveTextFileToDrive(
        accessToken,
        sampleText,
        `HCMUE_FIT_StudyVault_LoTrinh_${Date.now().toString().slice(-4)}.md`,
        'text/markdown'
      );

      toast.success(
        'Đã đồng bộ tài liệu mẫu!',
        'Đã lưu tệp lộ trình học tập Markdown vào Google Drive của bạn.'
      );
      fetchFiles();
    } catch (err: any) {
      toast.error('Lỗi đồng bộ', err?.message || 'Không thể lưu tài liệu mẫu.');
    } finally {
      setIsSyncingSample(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-5 h-5 text-amber-500 shrink-0" />;
    }
    if (mimeType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-rose-500 shrink-0" />;
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('sheet')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />;
    }
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return <FileText className="w-5 h-5 text-orange-500 shrink-0" />;
    }
    if (mimeType.includes('form')) {
      return <FileText className="w-5 h-5 text-purple-500 shrink-0" />;
    }
    if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('text/')) {
      return <FileCode className="w-5 h-5 text-indigo-500 shrink-0" />;
    }
    return <File className="w-5 h-5 text-slate-400 shrink-0" />;
  };

  const formatFileSize = (bytesStr?: string) => {
    if (!bytesStr) return '—';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // If user is not authenticated yet
  if (!accessToken || !user) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
        <div className="rounded-3xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-6 shadow-sm">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-md">
            <HardDrive className="w-10 h-10" />
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Kết nối Google Drive Khoa CNTT & Cá nhân
            </h1>
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 mt-2.5 font-normal border-l-2 border-indigo-500/80 dark:border-indigo-400/80 pl-3.5 py-0.5 text-left max-w-xl mx-auto leading-relaxed">
              Quản lý, tìm kiếm bài giảng, tài liệu ôn thi và đồng bộ thời khóa biểu trực tiếp với tài khoản Google Drive của bạn một cách bảo mật và tức thì.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Tải lên & Lưu trữ tài liệu
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Lưu trữ slide, đề cương môn học và code mẫu trực tiếp vào Google Drive.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Tìm kiếm & Lọc thông minh
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tìm kiếm tài liệu theo định dạng PDF, Docs, Sheets, Slide, Code và Forms.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Bảo mật OAuth 2.0
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Xác thực chuẩn Google Workspace. Token chỉ lưu trong bộ nhớ tạm thời.
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="google-drive-login-btn"
              onClick={() => signIn()}
              disabled={authLoading}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all duration-200 flex items-center gap-2.5 cursor-pointer"
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
              <span>Đăng nhập với Google Drive</span>
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
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Google Drive Khoa CNTT & Cá nhân
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800/50">
                Connected
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Đăng nhập với: <span className="font-semibold text-slate-700 dark:text-slate-300">{user.email}</span>
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            id="drive-sync-sample-btn"
            onClick={handleSyncSampleResources}
            disabled={isSyncingSample}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#131b2e] hover:bg-slate-200/70 dark:hover:bg-[#1a243b] text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Tạo file lộ trình học tập Markdown trên Drive của bạn"
          >
            <Sparkles className={`w-3.5 h-3.5 text-indigo-500 ${isSyncingSample ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Lưu Lộ trình mẫu</span>
          </button>

          <button
            id="drive-create-folder-btn"
            onClick={() => setIsFolderModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#131b2e] hover:bg-slate-200/70 dark:hover:bg-[#1a243b] text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Tạo Thư mục</span>
          </button>

          <label
            htmlFor="drive-file-upload-input"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Tải File Lên</span>
            <input
              id="drive-file-upload-input"
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            id="drive-refresh-btn"
            onClick={() => fetchFiles()}
            disabled={loading}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Uploading indicator */}
      {isUploading && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-3 animate-pulse">
          <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
          <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">{uploadProgressText}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search input */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="drive-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm tài liệu, bài giảng, file code trên Drive..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'folders', label: 'Thư mục' },
            { id: 'pdf', label: 'PDF' },
            { id: 'docs', label: 'Docs / Word' },
            { id: 'sheets', label: 'Bảng tính' },
            { id: 'slides', label: 'Slide bài giảng' },
            { id: 'forms', label: 'Google Forms' },
            { id: 'code', label: 'Mã nguồn & Zip' }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterType(pill.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filterType === pill.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#0e1424] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {pill.label}
            </button>
          ))}

          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center ml-2 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-white dark:bg-[#0e1424]">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
              title="Chế độ danh sách"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
              title="Chế độ lưới"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800 space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto text-indigo-600 dark:text-indigo-400 animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Đang tải dữ liệu từ Google Drive API...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-rose-900 dark:text-rose-200">Lỗi truy xuất Drive</div>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{error}</p>
            <button
              onClick={() => fetchFiles()}
              className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Thử lại</span>
            </button>
          </div>
        </div>
      ) : files.length === 0 ? (
        <EmptyStateIllustration
          title="Không tìm thấy tệp nào"
          description={searchQuery
            ? `Không có tệp tin nào khớp với từ khóa "${searchQuery}". Hãy thử tìm kiếm bằng từ khóa khác.`
            : 'Google Drive của bạn chưa có tài liệu nào trong thư mục này. Hãy tạo thư mục hoặc tải lên tệp mới!'}
          actionText={searchQuery ? "Xóa bộ lọc tìm kiếm" : undefined}
          onAction={searchQuery ? () => setSearchQuery('') : undefined}
          badge={searchQuery ? "0 kết quả" : "Thư mục trống"}
        />
      ) : viewMode === 'list' ? (
        /* List Table View */
        <div className="rounded-3xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#131b2e] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Tên Tệp / Thư mục</th>
                  <th className="px-4 py-3">Chủ sở hữu</th>
                  <th className="px-4 py-3">Thời gian sửa đổi</th>
                  <th className="px-4 py-3">Kích thước</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {files.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.mimeType)}
                        <span className="font-medium text-slate-900 dark:text-slate-100 max-w-xs md:max-w-md truncate">
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                      {file.owners?.[0]?.displayName || 'Tôi'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {formatDate(file.modifiedTime)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                            title="Mở trên Google Drive"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {file.webContentLink && (
                          <a
                            href={file.webContentLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                            title="Tải xuống tệp"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => {
                            if (file.webViewLink) {
                              navigator.clipboard.writeText(file.webViewLink);
                              toast.success('Đã sao chép liên kết!', file.name);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Sao chép link chia sẻ"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setFileToDelete(file)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                          title="Xóa tệp khỏi Drive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="p-4 rounded-2xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200/60 dark:border-slate-700/60">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <div className="font-semibold text-xs text-slate-900 dark:text-white line-clamp-2" title={file.name}>
                  {file.name}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono text-[10px]">{formatDate(file.modifiedTime)}</span>
                <div className="flex items-center gap-1">
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => setFileToDelete(file)}
                    className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Folder */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <FolderPlus className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tạo Thư mục mới trên Google Drive
              </h3>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên thư mục
                </label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ví dụ: HCMUE-FIT - Bài tập Cấu trúc dữ liệu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isCreatingFolder && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Tạo thư mục</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation Dialog (Mandatory per Skill guidelines) */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0e1424] border border-rose-200 dark:border-rose-900/60 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Xác nhận xóa tệp trên Google Drive
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400">Hành động này sẽ chuyển file vào thùng rác.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 text-xs">
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">Tên tệp:</div>
              <div className="font-semibold text-slate-900 dark:text-white break-all mt-0.5">
                {fileToDelete.name}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Giữ lại
              </button>
              <button
                type="button"
                onClick={handleDeleteFile}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác nhận Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
