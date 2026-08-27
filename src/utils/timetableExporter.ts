import { toPng, toBlob, toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { MasterCourseSection } from '../types';

export interface ExportOptions {
  theme?: 'dark' | 'light';
  includeHeader?: boolean;
  includeCourseList?: boolean;
  studentName?: string;
  semesterTitle?: string;
}

/**
 * Downloads a data URL / Blob as a file
 */
export function triggerFileDownload(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports an HTML element (like the Timetable Matrix) as a High-Res PNG Image
 * Uses html-to-image which natively supports modern CSS3/CSS4 color spaces (oklch, lab, etc.)
 */
export async function exportTimetableToPng(
  elementIdOrElement: string | HTMLElement,
  filename = 'ThoiKhoaBieu_HCMUE_FitVault.png',
  options: ExportOptions = {}
): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
  try {
    const targetElement =
      typeof elementIdOrElement === 'string'
        ? document.getElementById(elementIdOrElement)
        : elementIdOrElement;

    if (!targetElement) {
      throw new Error('Không tìm thấy phần tử ma trận thời khóa biểu để xuất ảnh.');
    }

    const fullWidth = Math.max(targetElement.scrollWidth, targetElement.offsetWidth, 1020);
    const fullHeight = Math.max(targetElement.scrollHeight, targetElement.offsetHeight);

    const dataUrl = await toPng(targetElement, {
      pixelRatio: 2.5,
      backgroundColor: options.theme === 'light' ? '#ffffff' : '#020617',
      cacheBust: true,
      width: fullWidth,
      height: fullHeight,
      style: {
        overflow: 'visible',
        overflowX: 'visible',
        overflowY: 'visible',
        maxHeight: 'none',
        maxWidth: 'none',
        width: `${fullWidth}px`,
        height: `${fullHeight}px`,
        borderRadius: '16px',
        scrollbarWidth: 'none',
      }
    });

    triggerFileDownload(dataUrl, filename);

    return { success: true, dataUrl };
  } catch (err: any) {
    console.error('Lỗi khi xuất ảnh PNG:', err);
    return { success: false, error: err.message || 'Lỗi xuất ảnh' };
  }
}

/**
 * Copies the timetable element as a PNG image to the system clipboard
 */
export async function copyTimetableImageToClipboard(
  elementIdOrElement: string | HTMLElement
): Promise<boolean> {
  try {
    const targetElement =
      typeof elementIdOrElement === 'string'
        ? document.getElementById(elementIdOrElement)
        : elementIdOrElement;

    if (!targetElement) return false;

    const fullWidth = Math.max(targetElement.scrollWidth, targetElement.offsetWidth, 1020);
    const fullHeight = Math.max(targetElement.scrollHeight, targetElement.offsetHeight);

    const blob = await toBlob(targetElement, {
      pixelRatio: 2.5,
      backgroundColor: '#020617',
      cacheBust: true,
      width: fullWidth,
      height: fullHeight,
      style: {
        overflow: 'visible',
        overflowX: 'visible',
        overflowY: 'visible',
        maxHeight: 'none',
        maxWidth: 'none',
        width: `${fullWidth}px`,
        height: `${fullHeight}px`,
        scrollbarWidth: 'none',
      }
    });

    if (!blob) return false;

    if (navigator.clipboard && (window as any).ClipboardItem) {
      const item = new (window as any).ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      return true;
    }

    return false;
  } catch (e) {
    console.error('Copy to clipboard failed:', e);
    return false;
  }
}

/**
 * Exports the timetable matrix into an A4 PDF document with crisp Unicode Vietnamese fonts
 */
export async function exportTimetableToPdf(
  elementIdOrElement: string | HTMLElement,
  sections: MasterCourseSection[],
  filename = 'ThoiKhoaBieu_HCMUE_FitVault.pdf',
  options: ExportOptions = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const targetElement =
      typeof elementIdOrElement === 'string'
        ? document.getElementById(elementIdOrElement)
        : elementIdOrElement;

    if (!targetElement) {
      throw new Error('Không tìm thấy phần tử ma trận thời khóa biểu để xuất PDF.');
    }

    const fullWidth = Math.max(targetElement.scrollWidth, targetElement.offsetWidth, 1020);
    const fullHeight = Math.max(targetElement.scrollHeight, targetElement.offsetHeight);

    // Capture the matrix table as high-quality canvas via html-to-image with 2.5x retina and no scrollbars
    const canvas = await toCanvas(targetElement, {
      pixelRatio: 2.5,
      backgroundColor: options.theme === 'light' ? '#ffffff' : '#020617',
      cacheBust: true,
      width: fullWidth,
      height: fullHeight,
      style: {
        overflow: 'visible',
        overflowX: 'visible',
        overflowY: 'visible',
        maxHeight: 'none',
        maxWidth: 'none',
        width: `${fullWidth}px`,
        height: `${fullHeight}px`,
        borderRadius: '16px',
        scrollbarWidth: 'none',
      }
    });

    const imgData = canvas.toDataURL('image/png');

    // Create PDF in Landscape A4 (297mm x 210mm)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 8;

    // Background fill to match theme
    if (options.theme === 'light') {
      pdf.setFillColor(255, 255, 255);
    } else {
      pdf.setFillColor(2, 6, 23); // slate-950
    }
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Calculate dimensions for fitting timetable image perfectly on A4 landscape
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgHeight / imgWidth;

    let renderWidth = availableWidth;
    let renderHeight = availableWidth * ratio;

    if (renderHeight > availableHeight) {
      renderHeight = availableHeight;
      renderWidth = renderHeight / ratio;
    }

    // Center image on the page
    const xOffset = (pageWidth - renderWidth) / 2;
    const yOffset = (pageHeight - renderHeight) / 2;

    pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight, undefined, 'FAST');

    // Save and download PDF
    pdf.save(filename);

    return { success: true };
  } catch (err: any) {
    console.error('Lỗi khi xuất PDF:', err);
    return { success: false, error: err.message || 'Lỗi xuất PDF' };
  }
}

