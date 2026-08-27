/**
 * Utilities for Contribution Form validation, URL sanitization & subject handling.
 */

export interface UrlValidationResult {
  isValid: boolean;
  sanitizedUrl: string;
  provider: 'google-drive' | 'github' | 'onedrive' | 'dropbox' | 'other' | 'invalid';
  warningMessage?: string;
  errorMessage?: string;
}

/**
 * Automatically sanitizes and checks document URL (auto-prepend https://, validation, provider detection).
 */
export function sanitizeAndValidateResourceUrl(inputUrl: string): UrlValidationResult {
  let trimmed = (inputUrl || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      sanitizedUrl: '',
      provider: 'invalid',
      errorMessage: 'Vui lòng nhập đường liên kết tài liệu.'
    };
  }

  // Prepend https:// if protocol is missing
  if (!/^https?:\/\//i.test(trimmed)) {
    // If it looks like a domain or path, add https://
    trimmed = 'https://' + trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (err) {
    return {
      isValid: false,
      sanitizedUrl: trimmed,
      provider: 'invalid',
      errorMessage: 'Định dạng đường dẫn không hợp lệ. Vui lòng kiểm tra lại liên kết.'
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  let provider: UrlValidationResult['provider'] = 'other';
  let warningMessage: string | undefined;

  if (hostname.includes('drive.google.com') || hostname.includes('docs.google.com')) {
    provider = 'google-drive';
    // Check for personal root my-drive link
    if (parsed.pathname === '/drive/my-drive' || parsed.pathname === '/drive/u/0/my-drive') {
      warningMessage = 'Link này đang trỏ về thư mục cá nhân chung (My Drive). Hãy nhấp chuột phải vào thư mục/tập tin cụ thể và chọn "Chia sẻ" > "Sao chép liên kết".';
    }
  } else if (hostname.includes('github.com')) {
    provider = 'github';
  } else if (hostname.includes('onedrive') || hostname.includes('1drv.ms') || hostname.includes('sharepoint.com')) {
    provider = 'onedrive';
  } else if (hostname.includes('dropbox.com')) {
    provider = 'dropbox';
  }

  return {
    isValid: true,
    sanitizedUrl: trimmed,
    provider,
    warningMessage
  };
}
