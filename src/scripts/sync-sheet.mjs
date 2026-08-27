/**
 * Script Đồng bộ Dữ liệu Môn học từ Google Sheets vào StudyVault (HCMUE-FIT)
 * 
 * Cách sử dụng:
 * 1. Đặt GOOGLE_SHEET_CSV_URL vào biến môi trường hoặc tham số dòng lệnh
 * 2. Chạy: node src/scripts/sync-sheet.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE_PATH = path.join(__dirname, '../data/subjects.json');

// URL mặc định của Google Sheets xuất bản dạng CSV (nếu có)
const DEFAULT_SHEET_CSV_URL = process.env.GOOGLE_SHEET_CSV_URL || '';

async function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i].trim();
    if (!currentLine) continue;

    // Phân tích dòng CSV có xử lý dấu ngoặc kép
    const values = [];
    let insideQuotes = false;
    let currentValue = '';

    for (let char of currentLine) {
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim().replace(/^"|"$/g, ''));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim().replace(/^"|"$/g, ''));

    const rowObj = {};
    headers.forEach((header, index) => {
      rowObj[header] = values[index] || '';
    });
    results.push(rowObj);
  }

  return results;
}

async function syncSubjects() {
  console.log('🔄 Đang khởi động quá trình đồng bộ HCMUE-FIT StudyVault...');

  try {
    let rawSubjects;

    if (DEFAULT_SHEET_CSV_URL) {
      console.log(`🌐 Đang tải dữ liệu từ Google Sheets: ${DEFAULT_SHEET_CSV_URL}`);
      const response = await fetch(DEFAULT_SHEET_CSV_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const csvText = await response.text();
      const rows = await parseCSV(csvText);
      console.log(`✅ Đã phân tích thành công ${rows.length} dòng từ Google Sheets.`);
      
      // Chuyển đổi dữ liệu từ dạng bảng Google Sheet sang cấu trúc chuẩn JSON
      rawSubjects = rows.map((r, idx) => ({
        id: (r['Mã môn'] || `subj_${idx}`).toLowerCase().replace(/[^a-z0-9]/g, ''),
        code: r['Mã môn'] || `COMP${1000 + idx}`,
        name: r['Tên môn học'] || 'Chưa cập nhật tên',
        englishName: r['Tên tiếng Anh'] || '',
        category: r['Phân loại'] || 'foundation',
        categoryName: r['Tên phân loại'] || 'Môn học cơ sở ngành',
        semester: r['Học kỳ'] || 'Học kỳ 3 (Năm 2)',
        credits: parseInt(r['Số tín chỉ'] || '3', 10),
        theoryHours: parseInt(r['Lý thuyết'] || '2', 10),
        practicalHours: parseInt(r['Thực hành'] || '1', 10),
        description: r['Mô tả tóm tắt'] || '',
        driveUrl: r['Link Google Drive'] || 'https://drive.google.com',
        lastUpdated: new Date().toLocaleString('vi-VN', { hour12: false }),
        gradingWeights: {
          process: parseFloat(r['Điểm quá trình'] || '0.2'),
          midterm: r['Điểm giữa kỳ'] ? parseFloat(r['Điểm giữa kỳ']) : null,
          practical: r['Điểm thực hành'] ? parseFloat(r['Điểm thực hành']) : null,
          final: parseFloat(r['Điểm cuối kỳ'] || '0.4')
        },
        prerequisites: {
          previousCourses: r['Môn học trước'] ? [{ code: r['Môn học trước'], name: r['Môn học trước'] }] : [],
          prerequisiteCourses: r['Môn tiên quyết'] ? [{ code: r['Môn tiên quyết'], name: r['Môn tiên quyết'] }] : []
        },
        syllabus: []
      }));
    } else {
      console.log('ℹ️ Không có GOOGLE_SHEET_CSV_URL, kiểm tra và chuẩn hóa tệp cục bộ:', DATA_FILE_PATH);
      if (fs.existsSync(DATA_FILE_PATH)) {
        const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        rawSubjects = JSON.parse(fileContent);
        console.log(`📁 Tệp cục bộ hiện có ${rawSubjects.length} môn học.`);
      } else {
        throw new Error('Không tìm thấy tệp subjects.json để đồng bộ');
      }
    }

    // Ghi đè hoặc cập nhật lại
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(rawSubjects, null, 2), 'utf-8');
    console.log(`✨ Đồng bộ thành công ${rawSubjects.length} môn học vào src/data/subjects.json!`);

  } catch (error) {
    console.error('❌ Lỗi trong quá trình đồng bộ:', error.message);
    process.exit(1);
  }
}

syncSubjects();
