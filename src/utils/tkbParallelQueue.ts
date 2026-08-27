import { MasterCourseSection, BatchFileItem } from '../types';
import {
  parseExcelOrCsvFileNonBlocking,
  parseRawTextScheduleNonBlocking,
  mergeAndDeduplicateSections,
  compressImageFileNonBlocking,
  yieldToMainThread
} from './scheduleParser';
import { parseMasterScheduleAI } from '../services/aiService';
import * as XLSX from 'xlsx';

export interface QueueMetrics {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  activeWorkers: number;
  overallProgress: number;
  totalExtractedSections: number;
  throughputItemsPerSec: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
}

export interface QueueCallbacks {
  onItemProgress?: (id: string, progress: number, message: string, status?: BatchFileItem['status']) => void;
  onItemComplete?: (id: string, sections: MasterCourseSection[]) => void;
  onItemError?: (id: string, error: string) => void;
  onMetricsUpdate?: (metrics: QueueMetrics) => void;
  onQueueComplete?: (results: {
    sections: MasterCourseSection[];
    successFiles: string[];
    failedFiles: string[];
    metrics: QueueMetrics;
  }) => void;
}

export interface QueueOptions {
  concurrency?: number; // Number of concurrent file workers (default: 3)
  customPrompt?: string;
  batchMode?: 'merge' | 'replace';
}

/**
 * High-performance parallel processing queue for parsing large TKB files.
 * Provides multi-worker concurrent dispatch, non-blocking UI thread yielding,
 * live throughput calculation, and atomic deduplicated result merging.
 */
export class TkbParallelQueue {
  private concurrency: number;
  private queue: BatchFileItem[] = [];
  private activeTasks = new Map<string, AbortController>();
  private completedTasks = new Set<string>();
  private failedTasks = new Set<string>();
  private isRunning = false;
  private isPaused = false;
  private callbacks: QueueCallbacks;
  private startTime = 0;
  private totalExtracted = 0;
  private accumulatedSections: MasterCourseSection[] = [];
  private successfulFileNames: string[] = [];
  private failedFileNames: string[] = [];

  constructor(options: QueueOptions = {}, callbacks: QueueCallbacks = {}) {
    this.concurrency = Math.max(1, Math.min(6, options.concurrency || 3));
    this.callbacks = callbacks;
  }

  /**
   * Set or update event listeners
   */
  public setCallbacks(callbacks: QueueCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Update concurrency level
   */
  public setConcurrency(concurrency: number): void {
    this.concurrency = Math.max(1, Math.min(6, concurrency));
    if (this.isRunning && !this.isPaused) {
      this.dispatchNext();
    }
  }

  public getConcurrency(): number {
    return this.concurrency;
  }

  /**
   * Load files into queue and start processing only pending/queued items
   */
  public async addAndStart(items: BatchFileItem[], existingExtractedSections: MasterCourseSection[] = []): Promise<void> {
    this.queue = [...items];
    
    // Retain already completed tasks and extracted count
    const alreadyDone = items.filter((i) => i.status === 'done');
    this.completedTasks = new Set(alreadyDone.map((i) => i.id));
    this.failedTasks.clear();
    this.activeTasks.clear();
    this.accumulatedSections = [...existingExtractedSections];
    this.successfulFileNames = alreadyDone.map((i) => i.name);
    this.failedFileNames = [];
    this.totalExtracted = existingExtractedSections.length;
    this.isRunning = true;
    this.isPaused = false;
    this.startTime = performance.now();

    this.emitMetrics();
    this.dispatchNext();
  }

  /**
   * Pause execution of pending items
   */
  public pause(): void {
    this.isPaused = true;
    this.emitMetrics();
  }

  /**
   * Resume execution
   */
  public resume(): void {
    if (!this.isRunning) return;
    this.isPaused = false;
    this.dispatchNext();
  }

  /**
   * Cancel a specific file processing
   */
  public cancelItem(id: string): void {
    const controller = this.activeTasks.get(id);
    if (controller) {
      controller.abort();
      this.activeTasks.delete(id);
    }
    this.callbacks.onItemProgress?.(id, 100, 'Đã hủy xử lý', 'error');
    this.failedTasks.add(id);
    this.emitMetrics();
    this.dispatchNext();
  }

  /**
   * Cancel all tasks and stop queue
   */
  public cancelAll(): void {
    this.isRunning = false;
    for (const [id, controller] of this.activeTasks.entries()) {
      controller.abort();
      this.callbacks.onItemProgress?.(id, 100, 'Đã hủy', 'error');
    }
    this.activeTasks.clear();
    this.emitMetrics();
  }

  /**
   * Core concurrency dispatcher
   */
  private dispatchNext(): void {
    if (!this.isRunning || this.isPaused) return;

    // Check if entire queue is finished
    const total = this.queue.length;
    const processed = this.completedTasks.size + this.failedTasks.size;
    if (processed >= total && this.activeTasks.size === 0) {
      this.finishQueue();
      return;
    }

    // Fill available concurrency slots
    while (this.activeTasks.size < this.concurrency) {
      const nextItem = this.queue.find(
        (item) =>
          !this.activeTasks.has(item.id) &&
          !this.completedTasks.has(item.id) &&
          !this.failedTasks.has(item.id)
      );

      if (!nextItem) break;

      const abortController = new AbortController();
      this.activeTasks.set(nextItem.id, abortController);

      // Execute worker asynchronously without blocking main thread
      this.processWorker(nextItem, abortController);
    }

    this.emitMetrics();
  }

  /**
   * Worker task processor with non-blocking slicing & error isolation
   */
  private async processWorker(item: BatchFileItem, abortController: AbortController): Promise<void> {
    const { id, file, type, name } = item;

    this.callbacks.onItemProgress?.(id, 10, 'Đang chuẩn bị phân tích...', 'processing');
    await yieldToMainThread();

    try {
      if (abortController.signal.aborted) {
        throw new Error('Task aborted');
      }

      if (!file) {
        throw new Error('Tệp không tồn tại');
      }

      const sections = await this.parseFileContent(item, abortController);

      if (abortController.signal.aborted) {
        throw new Error('Task aborted');
      }

      if (sections && sections.length > 0) {
        // Atomic thread-safe merge
        const { merged, addedCount } = mergeAndDeduplicateSections(
          this.accumulatedSections,
          sections
        );
        this.accumulatedSections = merged;
        this.totalExtracted += addedCount;
        this.successfulFileNames.push(name);
        this.completedTasks.add(id);

        this.callbacks.onItemProgress?.(
          id,
          100,
          `✓ Đã trích xuất ${sections.length} lớp học phần`,
          'done'
        );
        this.callbacks.onItemComplete?.(id, sections);
      } else {
        this.failedTasks.add(id);
        this.failedFileNames.push(name);
        this.callbacks.onItemProgress?.(
          id,
          100,
          'Không tìm thấy dữ liệu thời khóa biểu hợp lệ',
          'error'
        );
        this.callbacks.onItemError?.(id, 'Không tìm thấy cấu trúc TKB hợp lệ');
      }
    } catch (err: any) {
      if (abortController.signal.aborted) {
        this.failedTasks.add(id);
        this.callbacks.onItemProgress?.(id, 100, 'Đã hủy', 'error');
      } else {
        console.error(`Error processing file ${name}:`, err);
        this.failedTasks.add(id);
        this.failedFileNames.push(name);
        const errMsg = err?.message || 'Lỗi không xác định khi phân tích tệp';
        this.callbacks.onItemProgress?.(id, 100, `⚠️ ${errMsg}`, 'error');
        this.callbacks.onItemError?.(id, errMsg);
      }
    } finally {
      this.activeTasks.delete(id);
      this.emitMetrics();
      // Schedule next item dispatch
      this.dispatchNext();
    }
  }

  /**
   * Parses file content depending on type using fast non-blocking parsers or AI fallback
   */
  private async parseFileContent(
    item: BatchFileItem,
    abortController: AbortController
  ): Promise<MasterCourseSection[]> {
    const { id, file, type, name } = item;
    if (!file) return [];

    const engineeredPrompt = `=== QUY TẮC TRÍCH XUẤT CHÍNH XÁC CAO & GHÉP NỐI CỘT (JOIN) ===
1. GHÉP NỐI CỘT BẢNG PHÂN TÁCH: Nếu tài liệu PDF/bảng gồm nhiều khối lặp lại STT hoặc Mã LHP (Khối 1: STT, Mã HP, Mã LHP, Tên môn, Số TC; Khối 2: STT, Thứ, Tiết BĐ, Tiết KT; Khối 3: STT, Phòng, GV), BẮT BUỘC dùng 'STT' hoặc 'Mã LHP' làm Khóa chính (Primary Key) để gom (JOIN) thành bản ghi hoàn chỉnh.
2. GIẢNG VIÊN (lecturer): Giữ nguyên 100% họ tên và chức danh học hàm/học vị (TS, ThS, PGS.TS, v.v.). Không tự ý bịa tên hoặc thay thế tên. Nếu ô trống, đặt "Chưa phân công".
3. PHÒNG HỌC (room): Giữ đúng ký hiệu phòng thực tế (A.302, B.204, Lab 1, PM3, Online...). Không tự gán phòng mặc định bừa bãi. Nếu ô trống, đặt "Chưa xếp phòng".
4. MÃ LỚP HỌC PHẦN (classCode) & MÃ HỌC PHẦN (courseCode): Lấy chính xác mã lớp học phần cụ thể của từng dòng.
5. NHIỀU BUỔI HỌC: Nếu lớp có nhiều buổi trong tuần (hoặc 1 buổi LT + 1 buổi TH), tách thành các dòng JSON riêng biệt nhưng có cùng mã môn và mã lớp.`;

    // 1. FAST NON-BLOCKING SPREADSHEET (Excel / CSV)
    if (type === 'excel' || type === 'csv') {
      this.callbacks.onItemProgress?.(id, 25, `Đang phân tích bảng tính song song...`, 'processing');
      await yieldToMainThread();

      try {
        const localParsed = await parseExcelOrCsvFileNonBlocking(file, (p, msg) => {
          if (abortController.signal.aborted) return;
          this.callbacks.onItemProgress?.(id, p, msg, 'processing');
        }, abortController.signal);

        if (localParsed && localParsed.length > 0) {
          return localParsed;
        }
      } catch (e) {
        console.warn('Local non-blocking Excel parse error, attempting fallback:', e);
      }

      if (abortController.signal.aborted) throw new Error('Aborted');

      this.callbacks.onItemProgress?.(id, 55, `Đang đối chiếu dữ liệu nâng cao...`, 'processing');
      await yieldToMainThread();

      let textData = '';
      try {
        const arrayBuf = await file.arrayBuffer();
        const wb = XLSX.read(arrayBuf, { type: 'array' });
        textData = wb.SheetNames.map(
          (s) => `--- Sheet: ${s} ---\n${XLSX.utils.sheet_to_csv(wb.Sheets[s])}`
        ).join('\n\n');
      } catch (e) {}

      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const res = (reader.result as string) || '';
          resolve(res.includes(',') ? res.split(',')[1] : res);
        };
        reader.readAsDataURL(file);
      });

      if (abortController.signal.aborted) throw new Error('Aborted');

      const res = await parseMasterScheduleAI({
        fileBase64: base64,
        textData: textData || undefined,
        fileName: file.name,
        fileType: 'excel',
        customPrompt: engineeredPrompt
      });

      if (res.success && res.data && res.data.length > 0) {
        return res.data.map((s) => ({ ...s, sourceFile: file.name }));
      }
      return [];
    }

    // 2. IMAGE COMPRESSION & EXTRACTION
    if (type === 'image') {
      this.callbacks.onItemProgress?.(id, 30, `Đang tối ưu hóa hình ảnh...`, 'processing');
      await yieldToMainThread();

      const { base64, mimeType } = await compressImageFileNonBlocking(file);
      if (abortController.signal.aborted) throw new Error('Aborted');

      this.callbacks.onItemProgress?.(id, 60, `Đang nhận diện quang học (OCR)...`, 'processing');
      await yieldToMainThread();

      const res = await parseMasterScheduleAI({
        fileBase64: base64,
        imageBase64: base64,
        mimeType,
        fileName: file.name,
        fileType: 'image',
        customPrompt: engineeredPrompt
      });

      if (res.success && res.data && res.data.length > 0) {
        return res.data.map((s) => ({ ...s, sourceFile: file.name }));
      }
      return [];
    }

    // 3. PDF DOCUMENT
    if (type === 'pdf') {
      this.callbacks.onItemProgress?.(id, 25, `Đang đọc tệp PDF...`, 'processing');
      await yieldToMainThread();

      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const res = (reader.result as string) || '';
          resolve(res.includes(',') ? res.split(',')[1] : res);
        };
        reader.readAsDataURL(file);
      });

      if (abortController.signal.aborted) throw new Error('Aborted');

      this.callbacks.onItemProgress?.(id, 60, `Đang trích xuất dữ liệu PDF...`, 'processing');
      await yieldToMainThread();

      const res = await parseMasterScheduleAI({
        fileBase64: base64,
        imageBase64: base64,
        mimeType: 'application/pdf',
        fileName: file.name,
        fileType: 'pdf',
        customPrompt: engineeredPrompt
      });

      if (res.success && res.data && res.data.length > 0) {
        return res.data.map((s) => ({ ...s, sourceFile: file.name }));
      }
      return [];
    }

    // 4. RAW TEXT / TSV / CSV TEXT
    if (type === 'text') {
      this.callbacks.onItemProgress?.(id, 30, `Đang đọc văn bản bảng biểu...`, 'processing');
      await yieldToMainThread();

      const reader = new FileReader();
      const text = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string) || '');
        reader.readAsText(file);
      });

      const localParsed = await parseRawTextScheduleNonBlocking(text);
      if (localParsed && localParsed.length > 0) {
        return localParsed.map((s) => ({ ...s, sourceFile: file.name }));
      }

      if (abortController.signal.aborted) throw new Error('Aborted');

      this.callbacks.onItemProgress?.(id, 65, `Đang bóc tách cột dữ liệu...`, 'processing');
      await yieldToMainThread();

      const res = await parseMasterScheduleAI({
        textData: text.slice(0, 35000),
        fileName: file.name,
        fileType: 'text',
        customPrompt: engineeredPrompt
      });

      if (res.success && res.data && res.data.length > 0) {
        return res.data.map((s) => ({ ...s, sourceFile: file.name }));
      }
      return [];
    }

    return [];
  }

  /**
   * Calculate and emit real-time metrics
   */
  private emitMetrics(): void {
    const totalFiles = this.queue.length;
    const completedFiles = this.completedTasks.size;
    const failedFiles = this.failedTasks.size;
    const processedFiles = completedFiles + failedFiles;
    const activeWorkers = this.activeTasks.size;

    const overallProgress =
      totalFiles > 0 ? Math.min(100, Math.round((processedFiles / totalFiles) * 100)) : 0;

    const now = performance.now();
    const elapsedMs = this.startTime > 0 ? Math.max(1, now - this.startTime) : 0;
    const elapsedSec = elapsedMs / 1000;

    const throughputItemsPerSec =
      elapsedSec > 0 ? Math.round((this.totalExtracted / elapsedSec) * 10) / 10 : 0;

    const remainingFiles = Math.max(0, totalFiles - processedFiles);
    const avgTimePerFile = processedFiles > 0 ? elapsedMs / processedFiles : 500;
    const estimatedRemainingMs = Math.round((remainingFiles / Math.max(1, this.concurrency)) * avgTimePerFile);

    const metrics: QueueMetrics = {
      totalFiles,
      completedFiles,
      failedFiles,
      activeWorkers,
      overallProgress,
      totalExtractedSections: this.totalExtracted,
      throughputItemsPerSec,
      elapsedMs,
      estimatedRemainingMs
    };

    this.callbacks.onMetricsUpdate?.(metrics);
  }

  /**
   * Completion callback
   */
  private finishQueue(): void {
    this.isRunning = false;
    const now = performance.now();
    const elapsedMs = this.startTime > 0 ? Math.max(1, now - this.startTime) : 0;
    const elapsedSec = elapsedMs / 1000;

    const metrics: QueueMetrics = {
      totalFiles: this.queue.length,
      completedFiles: this.completedTasks.size,
      failedFiles: this.failedTasks.size,
      activeWorkers: 0,
      overallProgress: 100,
      totalExtractedSections: this.accumulatedSections.length,
      throughputItemsPerSec:
        elapsedSec > 0 ? Math.round((this.accumulatedSections.length / elapsedSec) * 10) / 10 : 0,
      elapsedMs,
      estimatedRemainingMs: 0
    };

    this.callbacks.onMetricsUpdate?.(metrics);
    this.callbacks.onQueueComplete?.({
      sections: this.accumulatedSections,
      successFiles: this.successfulFileNames,
      failedFiles: this.failedFileNames,
      metrics
    });
  }
}
