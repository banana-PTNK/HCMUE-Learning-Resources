export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  parents?: string[];
  owners?: { displayName: string; emailAddress: string; photoLink?: string }[];
}

export interface DriveListResponse {
  files: DriveFileItem[];
  nextPageToken?: string;
}

export const listDriveFiles = async (
  accessToken: string,
  options: {
    query?: string;
    mimeTypeFilter?: string;
    pageSize?: number;
    pageToken?: string;
    folderId?: string;
  } = {}
): Promise<DriveListResponse> => {
  const { query, mimeTypeFilter, pageSize = 40, pageToken, folderId } = options;

  let q = 'trashed = false';
  if (folderId) {
    q += ` and '${folderId}' in parents`;
  }
  if (query && query.trim()) {
    const escapedQuery = query.replace(/'/g, "\\'");
    q += ` and (name contains '${escapedQuery}' or fullText contains '${escapedQuery}')`;
  }
  if (mimeTypeFilter && mimeTypeFilter !== 'all') {
    if (mimeTypeFilter === 'folders') {
      q += ` and mimeType = 'application/vnd.google-apps.folder'`;
    } else if (mimeTypeFilter === 'pdf') {
      q += ` and mimeType = 'application/pdf'`;
    } else if (mimeTypeFilter === 'docs') {
      q += ` and (mimeType contains 'document' or mimeType contains 'wordprocessingml')`;
    } else if (mimeTypeFilter === 'sheets') {
      q += ` and (mimeType contains 'spreadsheet' or mimeType contains 'sheet')`;
    } else if (mimeTypeFilter === 'slides') {
      q += ` and (mimeType contains 'presentation' or mimeType contains 'powerpoint')`;
    } else if (mimeTypeFilter === 'forms') {
      q += ` and mimeType = 'application/vnd.google-apps.form'`;
    } else if (mimeTypeFilter === 'code') {
      q += ` and (mimeType contains 'javascript' or mimeType contains 'json' or mimeType contains 'text/' or mimeType contains 'zip')`;
    }
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', q);
  url.searchParams.set('pageSize', String(pageSize));
  url.searchParams.set(
    'fields',
    'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents, owners)'
  );
  url.searchParams.set('orderBy', 'folder,modifiedTime desc');
  if (pageToken) {
    url.searchParams.set('pageToken', pageToken);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Lỗi truy vấn Google Drive: ${res.statusText}`);
  }

  return await res.json();
};

export const createDriveFolder = async (
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<DriveFileItem> => {
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Không thể tạo thư mục trên Google Drive');
  }

  return await res.json();
};

export const uploadFileToDrive = async (
  accessToken: string,
  file: File | Blob,
  fileName: string,
  mimeType: string,
  parentFolderId?: string
): Promise<DriveFileItem> => {
  const metadata: any = {
    name: fileName,
    mimeType
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  // Read file as binary/arrayBuffer
  const fileData = await file.arrayBuffer();

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}`;
  const mediaHeader = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`;

  // Concatenate parts into a single ArrayBuffer / Uint8Array
  const encoder = new TextEncoder();
  const metadataBuffer = encoder.encode(metadataPart);
  const mediaHeaderBuffer = encoder.encode(mediaHeader);
  const closeBuffer = encoder.encode(closeDelimiter);

  const combinedLength =
    metadataBuffer.byteLength +
    mediaHeaderBuffer.byteLength +
    fileData.byteLength +
    closeBuffer.byteLength;

  const combined = new Uint8Array(combinedLength);
  let offset = 0;

  combined.set(metadataBuffer, offset);
  offset += metadataBuffer.byteLength;

  combined.set(mediaHeaderBuffer, offset);
  offset += mediaHeaderBuffer.byteLength;

  combined.set(new Uint8Array(fileData), offset);
  offset += fileData.byteLength;

  combined.set(closeBuffer, offset);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: combined
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Không thể tải file lên Google Drive');
  }

  return await res.json();
};

export const saveTextFileToDrive = async (
  accessToken: string,
  content: string,
  fileName: string,
  mimeType: string = 'text/plain',
  parentFolderId?: string
): Promise<DriveFileItem> => {
  const blob = new Blob([content], { type: mimeType });
  return uploadFileToDrive(accessToken, blob, fileName, mimeType, parentFolderId);
};

export const deleteDriveFile = async (accessToken: string, fileId: string): Promise<void> => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok && res.status !== 204) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Không thể xóa file trên Google Drive');
  }
};
