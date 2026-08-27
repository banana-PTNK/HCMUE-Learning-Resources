const fs = require('fs');

// We compile all 138 entries from the 35 pages of the HCMUE master schedule PDF
// Block 1 (P1-7): STT, Mã HP, Mã LHP, Tên HP, Số TC, VLE
// Block 2 (P8-14): STT, Mã HP, Mã LHP, Tên HP, Số tiết TKB, Sĩ số, Thứ
// Block 3 (P15-21): STT, Mã HP, Mã LHP, Tên HP, Tiết bắt đầu, Tiết kết thúc
// Block 4 (P22-28): STT, Mã HP, Mã LHP, Tên HP, Phòng học
// Block 5 (P29-35): STT, Mã HP, Mã LHP, Tên HP, Giảng viên

const data = [
  // 1: COMP1801, COMP180101, Toán rời rạc và ứng dụng, 2 TC, Thứ 2 (1-3) D.207 LVS, Thứ 3 (1-3) D.207 LVS, Nguyễn Trần Phi Phượng
  { stt: 1, courseCode: "COMP1801", classCode: "COMP180101", courseName: "Toán rời rạc và ứng dụng", credits: 2, classType: "LT", group: "Lớp 01", dayOfWeek: 2, startPeriod: 1, endPeriod: 3, room: "D.207 LVS", lecturer: "Nguyễn Trần Phi Phượng", weeks: "1-15" },
  { stt: 1, courseCode: "COMP1801", classCode: "COMP180101", courseName: "Toán rời rạc và ứng dụng", credits: 2, classType: "LT", group: "Lớp 01", dayOfWeek: 3, startPeriod: 1, endPeriod: 3, room: "D.207 LVS", lecturer: "Nguyễn Trần Phi Phượng", weeks: "1-15" },

  // 2: COMP1801, COMP180102, Toán rời rạc và ứng dụng, 2 TC, Thứ 2 (4-6) D.207 LVS, Thứ 3 (4-6) D.207 LVS, Nguyễn Trần Phi Phượng
  { stt: 2, courseCode: "COMP1801", classCode: "COMP180102", courseName: "Toán rời rạc và ứng dụng", credits: 2, classType: "LT", group: "Lớp 02", dayOfWeek: 2, startPeriod: 4, endPeriod: 6, room: "D.207 LVS", lecturer: "Nguyễn Trần Phi Phượng", weeks: "1-15" },
  { stt: 2, courseCode: "COMP1801", classCode: "COMP180102", courseName: "Toán rời rạc và ứng dụng", credits: 2, classType: "LT", group: "Lớp 02", dayOfWeek: 3, startPeriod: 4, endPeriod: 6, room: "D.207 LVS", lecturer: "Nguyễn Trần Phi Phượng", weeks: "1-15" },

  // 3: COMP1801, COMP180103, Toán rời rạc và ứng dụng, 2 TC, Thứ 5 (1-3) B.114, Nguyễn Ngọc Trung
  { stt: 3, courseCode: "COMP1801", classCode: "COMP180103", courseName: "Toán rời rạc và ứng dụng", credits: 2, classType: "LT", group: "Lớp 03", dayOfWeek: 5, startPeriod: 1, endPeriod: 3, room: "B.114", lecturer: "Nguyễn Ngọc Trung", weeks: "1-15" },

  // 4: COMP1801, COMP180104, Toán rời rạc và ứng dụng, 2 TC, Thứ 5 (4-6) B.114, Trần Quang Huy
  { stt: 4, courseCode: "COMP1801", classCode: "COMP180104", courseName: "Toán rời rạc và ứng dụng", credits: 2, classType: "LT", group: "Lớp 04", dayOfWeek: 5, startPeriod: 4, endPeriod: 6, room: "B.114", lecturer: "Trần Quang Huy", weeks: "1-15" },

  // 5: COMP1801, COMP180105, Toán rời rạc và ứng dụng, 2 TC, Thứ 7 (4-6) A.414, Trần Quang Huy
  { stt: 5, courseCode: "COMP1801", classCode: "COMP180105", courseName: "Toán rời rạc và ứng dụng", credits: 2, classType: "LT", group: "Lớp 05", dayOfWeek: 7, startPeriod: 4, endPeriod: 6, room: "A.414", lecturer: "Trần Quang Huy", weeks: "1-15" },

  // 6: COMP1801, COMP180106, Toán rời rạc và ứng dụng, 2 TC, Thứ 7 (10-12) A.414, Trần Quang Huy
  { stt: 6, courseCode: "COMP1801", classCode: "COMP180106", courseName: "Toán rời rạc và ứng dụng", credits: 2, classType: "LT", group: "Lớp 06", dayOfWeek: 7, startPeriod: 10, endPeriod: 12, room: "A.414", lecturer: "Trần Quang Huy", weeks: "1-15" },

  // 7: COMP1801, COMP180107, Toán rời rạc và ứng dụng, 2 TC, Thứ 2 (7-9) D.207 LVS, Trần Quang Huy
  { stt: 7, courseCode: "COMP1801", classCode: "COMP180107", courseName: "Toán rời rạc và ứng dụng", credits: 2, classType: "LT", group: "Lớp 07", dayOfWeek: 2, startPeriod: 7, endPeriod: 9, room: "D.207 LVS", lecturer: "Trần Quang Huy", weeks: "1-15" },

  // 8: COMP1800, COMP180001, Cơ sở toán trong Công nghệ thông tin, 4 TC, Thứ 4 (7-9) A.414, Thứ 5 (7-9) B.114, Thứ 6 (7-9) B.114, Lê Thị Huyền
  { stt: 8, courseCode: "COMP1800", classCode: "COMP180001", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 01", dayOfWeek: 4, startPeriod: 7, endPeriod: 9, room: "A.414", lecturer: "Lê Thị Huyền", weeks: "1-15" },
  { stt: 8, courseCode: "COMP1800", classCode: "COMP180001", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 01", dayOfWeek: 5, startPeriod: 7, endPeriod: 9, room: "B.114", lecturer: "Lê Thị Huyền", weeks: "1-15" },
  { stt: 8, courseCode: "COMP1800", classCode: "COMP180001", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 01", dayOfWeek: 6, startPeriod: 7, endPeriod: 9, room: "B.114", lecturer: "Lê Thị Huyền", weeks: "1-15" },

  // 9: COMP1800, COMP180002, Cơ sở toán trong Công nghệ thông tin, 4 TC, Thứ 4 (10-12) A.414, Thứ 5 (10-12) B.114, Thứ 6 (10-12) B.114, Lê Thị Huyền
  { stt: 9, courseCode: "COMP1800", classCode: "COMP180002", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 02", dayOfWeek: 4, startPeriod: 10, endPeriod: 12, room: "A.414", lecturer: "Lê Thị Huyền", weeks: "1-15" },
  { stt: 9, courseCode: "COMP1800", classCode: "COMP180002", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 02", dayOfWeek: 5, startPeriod: 10, endPeriod: 12, room: "B.114", lecturer: "Lê Thị Huyền", weeks: "1-15" },
  { stt: 9, courseCode: "COMP1800", classCode: "COMP180002", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 02", dayOfWeek: 6, startPeriod: 10, endPeriod: 12, room: "B.114", lecturer: "Lê Thị Huyền", weeks: "1-15" },

  // 10: COMP1800, COMP180003, Cơ sở toán trong CNTT, 4 TC, Thứ 3 (10-12) A.414, Thứ 5 (7-9) A.414, Bùi Thế Quân
  { stt: 10, courseCode: "COMP1800", classCode: "COMP180003", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 03", dayOfWeek: 3, startPeriod: 10, endPeriod: 12, room: "A.414", lecturer: "Bùi Thế Quân", weeks: "1-15" },
  { stt: 10, courseCode: "COMP1800", classCode: "COMP180003", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 03", dayOfWeek: 5, startPeriod: 7, endPeriod: 9, room: "A.414", lecturer: "Bùi Thế Quân", weeks: "1-15" },

  // 11: COMP1800, COMP180004, Cơ sở toán trong CNTT, 4 TC, Thứ 2 (1-3) A.414, Thứ 3 (1-3) A.414, Trịnh Huy Hoàng
  { stt: 11, courseCode: "COMP1800", classCode: "COMP180004", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 04", dayOfWeek: 2, startPeriod: 1, endPeriod: 3, room: "A.414", lecturer: "Trịnh Huy Hoàng", weeks: "1-15" },
  { stt: 11, courseCode: "COMP1800", classCode: "COMP180004", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 04", dayOfWeek: 3, startPeriod: 1, endPeriod: 3, room: "A.414", lecturer: "Trịnh Huy Hoàng", weeks: "1-15" },

  // 12: COMP1800, COMP180005, Cơ sở toán trong CNTT, 4 TC, Thứ 2 (4-6) A.414, Thứ 3 (4-6) A.414, Trịnh Huy Hoàng
  { stt: 12, courseCode: "COMP1800", classCode: "COMP180005", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 05", dayOfWeek: 2, startPeriod: 4, endPeriod: 6, room: "A.414", lecturer: "Trịnh Huy Hoàng", weeks: "1-15" },
  { stt: 12, courseCode: "COMP1800", classCode: "COMP180005", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 05", dayOfWeek: 3, startPeriod: 4, endPeriod: 6, room: "A.414", lecturer: "Trịnh Huy Hoàng", weeks: "1-15" },

  // 13: COMP1800, COMP180006, Cơ sở toán trong CNTT, 4 TC, Thứ 6 (1-3) A.414, Thứ 7 (1-3) A.414, Trần Quang Huy
  { stt: 13, courseCode: "COMP1800", classCode: "COMP180006", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 06", dayOfWeek: 6, startPeriod: 1, endPeriod: 3, room: "A.414", lecturer: "Trần Quang Huy", weeks: "1-15" },
  { stt: 13, courseCode: "COMP1800", classCode: "COMP180006", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 06", dayOfWeek: 7, startPeriod: 1, endPeriod: 3, room: "A.414", lecturer: "Trần Quang Huy", weeks: "1-15" },

  // 14: COMP1800, COMP180007, Cơ sở toán trong CNTT, 4 TC, Thứ 4 (1-3) A.414, Thứ 5 (1-3) A.414, Trịnh Huy Hoàng
  { stt: 14, courseCode: "COMP1800", classCode: "COMP180007", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 07", dayOfWeek: 4, startPeriod: 1, endPeriod: 3, room: "A.414", lecturer: "Trịnh Huy Hoàng", weeks: "1-15" },
  { stt: 14, courseCode: "COMP1800", classCode: "COMP180007", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 07", dayOfWeek: 5, startPeriod: 1, endPeriod: 3, room: "A.414", lecturer: "Trịnh Huy Hoàng", weeks: "1-15" },

  // 15: COMP1800, COMP180008, Cơ sở toán trong CNTT, 4 TC, Thứ 4 (4-6) A.414, Thứ 5 (4-6) A.414, Trịnh Huy Hoàng
  { stt: 15, courseCode: "COMP1800", classCode: "COMP180008", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 08", dayOfWeek: 4, startPeriod: 4, endPeriod: 6, room: "A.414", lecturer: "Trịnh Huy Hoàng", weeks: "1-15" },
  { stt: 15, courseCode: "COMP1800", classCode: "COMP180008", courseName: "Cơ sở toán trong Công nghệ thông tin", credits: 4, classType: "LT", group: "Lớp 08", dayOfWeek: 5, startPeriod: 4, endPeriod: 6, room: "A.414", lecturer: "Trịnh Huy Hoàng", weeks: "1-15" },

  // 16: COMP1010, COMP101001, Lập trình cơ bản, 3 TC, Thứ 3 (7-9) I.203, Thứ 5 (10-12) I.102, Trần Hữu Quốc Thư
  { stt: 16, courseCode: "COMP1010", classCode: "COMP101001", courseName: "Lập trình cơ bản", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 3, startPeriod: 7, endPeriod: 9, room: "I.203", lecturer: "Trần Hữu Quốc Thư", weeks: "1-15" },
  { stt: 16, courseCode: "COMP1010", classCode: "COMP101001", courseName: "Lập trình cơ bản", credits: 3, classType: "TH", group: "Lớp 01 (TH)", dayOfWeek: 5, startPeriod: 10, endPeriod: 12, room: "I.102", lecturer: "Trần Hữu Quốc Thư", weeks: "1-15" },

  // 17: COMP1010, COMP101002, Lập trình cơ bản, 3 TC, Thứ 3 (10-12) I.203, Thứ 5 (7-9) I.102, Trần Hữu Quốc Thư
  { stt: 17, courseCode: "COMP1010", classCode: "COMP101002", courseName: "Lập trình cơ bản", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 3, startPeriod: 10, endPeriod: 12, room: "I.203", lecturer: "Trần Hữu Quốc Thư", weeks: "1-15" },
  { stt: 17, courseCode: "COMP1010", classCode: "COMP101002", courseName: "Lập trình cơ bản", credits: 3, classType: "TH", group: "Lớp 02 (TH)", dayOfWeek: 5, startPeriod: 7, endPeriod: 9, room: "I.102", lecturer: "Trần Hữu Quốc Thư", weeks: "1-15" },

  // 18: COMP1010, COMP101003, Lập trình cơ bản, 3 TC, Thứ 7 (2-5) I.203, Trương Thị Thanh Tuyền
  { stt: 18, courseCode: "COMP1010", classCode: "COMP101003", courseName: "Lập trình cơ bản", credits: 3, classType: "LT", group: "Lớp 03", dayOfWeek: 7, startPeriod: 2, endPeriod: 5, room: "I.203", lecturer: "Trương Thị Thanh Tuyền", weeks: "1-15" },

  // 19: COMP1010, COMP101004, Lập trình cơ bản, 3 TC, Thứ 2 (7-9) I.203, Thứ 4 (7-9) I.203, Nguyễn Phương Nam
  { stt: 19, courseCode: "COMP1010", classCode: "COMP101004", courseName: "Lập trình cơ bản", credits: 3, classType: "LT", group: "Lớp 04", dayOfWeek: 2, startPeriod: 7, endPeriod: 9, room: "I.203", lecturer: "Nguyễn Phương Nam", weeks: "1-15" },
  { stt: 19, courseCode: "COMP1010", classCode: "COMP101004", courseName: "Lập trình cơ bản", credits: 3, classType: "TH", group: "Lớp 04 (TH)", dayOfWeek: 4, startPeriod: 7, endPeriod: 9, room: "I.203", lecturer: "Nguyễn Phương Nam", weeks: "1-15" },

  // 20: COMP1010, COMP101005, Lập trình cơ bản, 3 TC, Thứ 2 (10-12) I.203, Thứ 4 (10-12) I.203, Nguyễn Phương Nam
  { stt: 20, courseCode: "COMP1010", classCode: "COMP101005", courseName: "Lập trình cơ bản", credits: 3, classType: "LT", group: "Lớp 05", dayOfWeek: 2, startPeriod: 10, endPeriod: 12, room: "I.203", lecturer: "Nguyễn Phương Nam", weeks: "1-15" },
  { stt: 20, courseCode: "COMP1010", classCode: "COMP101005", courseName: "Lập trình cơ bản", credits: 3, classType: "TH", group: "Lớp 05 (TH)", dayOfWeek: 4, startPeriod: 10, endPeriod: 12, room: "I.203", lecturer: "Nguyễn Phương Nam", weeks: "1-15" },

  // 21: COMP1010, COMP101006, Lập trình cơ bản, 3 TC, Thứ 4 (3-6) I.102, Trần Hữu Quốc Thư
  { stt: 21, courseCode: "COMP1010", classCode: "COMP101006", courseName: "Lập trình cơ bản", credits: 3, classType: "LT", group: "Lớp 06", dayOfWeek: 4, startPeriod: 3, endPeriod: 6, room: "I.102", lecturer: "Trần Hữu Quốc Thư", weeks: "1-15" },

  // 22: COMP1010, COMP101007, Lập trình cơ bản, 3 TC, Thứ 4 (10-12) C.305, Thứ 5 (4-6) C.305, Nguyễn Thị Ngọc Hoa
  { stt: 22, courseCode: "COMP1010", classCode: "COMP101007", courseName: "Lập trình cơ bản", credits: 3, classType: "LT", group: "Lớp 07", dayOfWeek: 4, startPeriod: 10, endPeriod: 12, room: "C.305", lecturer: "Nguyễn Thị Ngọc Hoa", weeks: "1-15" },
  { stt: 22, courseCode: "COMP1010", classCode: "COMP101007", courseName: "Lập trình cơ bản", credits: 3, classType: "TH", group: "Lớp 07 (TH)", dayOfWeek: 5, startPeriod: 4, endPeriod: 6, room: "C.305", lecturer: "Nguyễn Thị Ngọc Hoa", weeks: "1-15" },

  // 23: COMP1010, COMP101008, Lập trình cơ bản, 3 TC, Buổi 1: Thứ 2 (4-6) I.203 & Thứ 6 (4-6) B.114; Buổi 2: Thứ 5 (7-9) I.203 & Thứ 7 (7-9) A.414, Trần Quang Huy
  { stt: 23, courseCode: "COMP1010", classCode: "COMP101008", courseName: "Lập trình cơ bản", credits: 3, classType: "LT", group: "Lớp 08", dayOfWeek: 2, startPeriod: 4, endPeriod: 6, room: "I.203", lecturer: "Trần Quang Huy", weeks: "1-15" },
  { stt: 23, courseCode: "COMP1010", classCode: "COMP101008", courseName: "Lập trình cơ bản", credits: 3, classType: "TH", group: "Lớp 08 (TH)", dayOfWeek: 6, startPeriod: 4, endPeriod: 6, room: "B.114", lecturer: "Trần Quang Huy", weeks: "1-15" },
  { stt: 23, courseCode: "COMP1010", classCode: "COMP101008", courseName: "Lập trình cơ bản", credits: 3, classType: "LT", group: "Lớp 08-B", dayOfWeek: 5, startPeriod: 7, endPeriod: 9, room: "I.203", lecturer: "Trần Quang Huy", weeks: "1-15" },
  { stt: 23, courseCode: "COMP1010", classCode: "COMP101008", courseName: "Lập trình cơ bản", credits: 3, classType: "TH", group: "Lớp 08-B (TH)", dayOfWeek: 7, startPeriod: 7, endPeriod: 9, room: "A.414", lecturer: "Trần Quang Huy", weeks: "1-15" },

  // 24: COMP1016, COMP101601, Cấu trúc dữ liệu, 3 TC, Thứ 3 (1-3) I.102, Thứ 5 (1-3) I.203, Nguyễn Đỗ Thái Nguyên
  { stt: 24, courseCode: "COMP1016", classCode: "COMP101601", courseName: "Cấu trúc dữ liệu", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 3, startPeriod: 1, endPeriod: 3, room: "I.102", lecturer: "Nguyễn Đỗ Thái Nguyên", weeks: "1-15" },
  { stt: 24, courseCode: "COMP1016", classCode: "COMP101601", courseName: "Cấu trúc dữ liệu", credits: 3, classType: "TH", group: "Lớp 01 (TH)", dayOfWeek: 5, startPeriod: 1, endPeriod: 3, room: "I.203", lecturer: "Nguyễn Đỗ Thái Nguyên", weeks: "1-15" },

  // 25: COMP1016, COMP101602, Cấu trúc dữ liệu, 3 TC, Thứ 3 (4-6) I.102, Thứ 5 (4-6) I.203, Nguyễn Đỗ Thái Nguyên
  { stt: 25, courseCode: "COMP1016", classCode: "COMP101602", courseName: "Cấu trúc dữ liệu", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 3, startPeriod: 4, endPeriod: 6, room: "I.102", lecturer: "Nguyễn Đỗ Thái Nguyên", weeks: "1-15" },
  { stt: 25, courseCode: "COMP1016", classCode: "COMP101602", courseName: "Cấu trúc dữ liệu", credits: 3, classType: "TH", group: "Lớp 02 (TH)", dayOfWeek: 5, startPeriod: 4, endPeriod: 6, room: "I.203", lecturer: "Nguyễn Đỗ Thái Nguyên", weeks: "1-15" },

  // 26: COMP1016, COMP101603, Cấu trúc dữ liệu, 3 TC, Thứ 4 (7-9) I.102, Thứ 5 (4-6) I.102, Trần Hữu Quốc Thư
  { stt: 26, courseCode: "COMP1016", classCode: "COMP101603", courseName: "Cấu trúc dữ liệu", credits: 3, classType: "LT", group: "Lớp 03", dayOfWeek: 4, startPeriod: 7, endPeriod: 9, room: "I.102", lecturer: "Trần Hữu Quốc Thư", weeks: "1-15" },
  { stt: 26, courseCode: "COMP1016", classCode: "COMP101603", courseName: "Cấu trúc dữ liệu", credits: 3, classType: "TH", group: "Lớp 03 (TH)", dayOfWeek: 5, startPeriod: 4, endPeriod: 6, room: "I.102", lecturer: "Trần Hữu Quốc Thư", weeks: "1-15" },

  // 27: COMP1016, COMP101604, Cấu trúc dữ liệu, 3 TC, Thứ 3 (4-6) I.203, Thứ 4 (10-12) I.102, Trần Hữu Quốc Thư
  { stt: 27, courseCode: "COMP1016", classCode: "COMP101604", courseName: "Cấu trúc dữ liệu", credits: 3, classType: "LT", group: "Lớp 04", dayOfWeek: 3, startPeriod: 4, endPeriod: 6, room: "I.203", lecturer: "Trần Hữu Quốc Thư", weeks: "1-15" },
  { stt: 27, courseCode: "COMP1016", classCode: "COMP101604", courseName: "Cấu trúc dữ liệu", credits: 3, classType: "TH", group: "Lớp 04 (TH)", dayOfWeek: 4, startPeriod: 10, endPeriod: 12, room: "I.102", lecturer: "Trần Hữu Quốc Thư", weeks: "1-15" },

  // 28: COMP1016, COMP101605, Cấu trúc dữ liệu, 3 TC, Thứ 6 (7-9) I.203, Thứ 4 (7-9) D.207 LVS, Trần Quang Huy
  { stt: 28, courseCode: "COMP1016", classCode: "COMP101605", courseName: "Cấu trúc dữ liệu", credits: 3, classType: "LT", group: "Lớp 05", dayOfWeek: 6, startPeriod: 7, endPeriod: 9, room: "I.203", lecturer: "Trần Quang Huy", weeks: "1-15" },
  { stt: 28, courseCode: "COMP1016", classCode: "COMP101605", courseName: "Cấu trúc dữ liệu", credits: 3, classType: "TH", group: "Lớp 05 (TH)", dayOfWeek: 4, startPeriod: 7, endPeriod: 9, room: "D.207 LVS", lecturer: "Trần Quang Huy", weeks: "1-15" },

  // 29: COMP1016, COMP101606, Cấu trúc dữ liệu, 3 TC, Thứ 6 (10-12) I.203, Thứ 4 (10-12) D.207 LVS, Trần Quang Huy
  { stt: 29, courseCode: "COMP1016", classCode: "COMP101606", courseName: "Cấu trúc dữ liệu", credits: 3, classType: "LT", group: "Lớp 06", dayOfWeek: 6, startPeriod: 10, endPeriod: 12, room: "I.203", lecturer: "Trần Quang Huy", weeks: "1-15" },
  { stt: 29, courseCode: "COMP1016", classCode: "COMP101606", courseName: "Cấu trúc dữ liệu", credits: 3, classType: "TH", group: "Lớp 06 (TH)", dayOfWeek: 4, startPeriod: 10, endPeriod: 12, room: "D.207 LVS", lecturer: "Trần Quang Huy", weeks: "1-15" },

  // 30: COMP1017, COMP101701, Lập trình hướng đối tượng, 3 TC, Thứ 2 (7-9) I.102, Thứ 3 (7-9) I.102, Lương Trần Ngọc Khiết
  { stt: 30, courseCode: "COMP1017", classCode: "COMP101701", courseName: "Lập trình hướng đối tượng", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 2, startPeriod: 7, endPeriod: 9, room: "I.102", lecturer: "Lương Trần Ngọc Khiết", weeks: "1-15" },
  { stt: 30, courseCode: "COMP1017", classCode: "COMP101701", courseName: "Lập trình hướng đối tượng", credits: 3, classType: "TH", group: "Lớp 01 (TH)", dayOfWeek: 3, startPeriod: 7, endPeriod: 9, room: "I.102", lecturer: "Lương Trần Ngọc Khiết", weeks: "1-15" },

  // 31: COMP1017, COMP101702, Lập trình hướng đối tượng, 3 TC, Thứ 2 (10-12) I.102, Thứ 3 (10-12) I.102, Lương Trần Ngọc Khiết
  { stt: 31, courseCode: "COMP1017", classCode: "COMP101702", courseName: "Lập trình hướng đối tượng", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 2, startPeriod: 10, endPeriod: 12, room: "I.102", lecturer: "Lương Trần Ngọc Khiết", weeks: "1-15" },
  { stt: 31, courseCode: "COMP1017", classCode: "COMP101702", courseName: "Lập trình hướng đối tượng", credits: 3, classType: "TH", group: "Lớp 02 (TH)", dayOfWeek: 3, startPeriod: 10, endPeriod: 12, room: "I.102", lecturer: "Lương Trần Ngọc Khiết", weeks: "1-15" },

  // 32: COMP1017, COMP101703, Lập trình hướng đối tượng, 3 TC, Thứ 7 (7-10) I.102, Lê Trần Trí Thức (TG)
  { stt: 32, courseCode: "COMP1017", classCode: "COMP101703", courseName: "Lập trình hướng đối tượng", credits: 3, classType: "LT", group: "Lớp 03", dayOfWeek: 7, startPeriod: 7, endPeriod: 10, room: "I.102", lecturer: "Lê Trần Trí Thức (TG)", weeks: "1-15" },

  // 33: COMP1017, COMP101704, Lập trình hướng đối tượng, 3 TC, Thứ 7 (3-6) I.102, Lê Trần Trí Thức (TG)
  { stt: 33, courseCode: "COMP1017", classCode: "COMP101704", courseName: "Lập trình hướng đối tượng", credits: 3, classType: "LT", group: "Lớp 04", dayOfWeek: 7, startPeriod: 3, endPeriod: 6, room: "I.102", lecturer: "Lê Trần Trí Thức (TG)", weeks: "1-15" },

  // 34: COMP1501, COMP150101, Xác suất thống kê và ứng dụng, 3 TC, Thứ 2 (4-6) B.114, Nguyễn Thị Huỳnh Trâm (GV mời)
  { stt: 34, courseCode: "COMP1501", classCode: "COMP150101", courseName: "Xác suất thống kê và ứng dụng", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 2, startPeriod: 4, endPeriod: 6, room: "B.114", lecturer: "Nguyễn Thị Huỳnh Trâm (GV mời)", weeks: "1-15" },

  // 35: COMP1501, COMP150102, Xác suất thống kê và ứng dụng, 3 TC, Thứ 2 (1-3) B.114, Nguyễn Thị Huỳnh Trâm (GV mời)
  { stt: 35, courseCode: "COMP1501", classCode: "COMP150102", courseName: "Xác suất thống kê và ứng dụng", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 2, startPeriod: 1, endPeriod: 3, room: "B.114", lecturer: "Nguyễn Thị Huỳnh Trâm (GV mời)", weeks: "1-15" },

  // 36: COMP1501, COMP150103, Xác suất thống kê và ứng dụng, 3 TC, Thứ 3 (1-3) B.114, Nguyễn Thị Huỳnh Trâm (GV mời)
  { stt: 36, courseCode: "COMP1501", classCode: "COMP150103", courseName: "Xác suất thống kê và ứng dụng", credits: 3, classType: "LT", group: "Lớp 03", dayOfWeek: 3, startPeriod: 1, endPeriod: 3, room: "B.114", lecturer: "Nguyễn Thị Huỳnh Trâm (GV mời)", weeks: "1-15" },

  // 37: COMP1501, COMP150104, Xác suất thống kê và ứng dụng, 3 TC, Thứ 3 (4-6) B.114, Nguyễn Thị Huỳnh Trâm (GV mời)
  { stt: 37, courseCode: "COMP1501", classCode: "COMP150104", courseName: "Xác suất thống kê và ứng dụng", credits: 3, classType: "LT", group: "Lớp 04", dayOfWeek: 3, startPeriod: 4, endPeriod: 6, room: "B.114", lecturer: "Nguyễn Thị Huỳnh Trâm (GV mời)", weeks: "1-15" },

  // 38: COMP1701, COMP170101, Lý thuyết đồ thị và ứng dụng, 3 TC, Thứ 4 (1-3) I.203, Nguyễn Viết Hưng
  { stt: 38, courseCode: "COMP1701", classCode: "COMP170101", courseName: "Lý thuyết đồ thị và ứng dụng", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 4, startPeriod: 1, endPeriod: 3, room: "I.203", lecturer: "Nguyễn Viết Hưng", weeks: "1-15" },

  // 39: COMP1701, COMP170102, Lý thuyết đồ thị và ứng dụng, 3 TC, Thứ 5 (1-3) I.102, Nguyễn Viết Hưng
  { stt: 39, courseCode: "COMP1701", classCode: "COMP170102", courseName: "Lý thuyết đồ thị và ứng dụng", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 5, startPeriod: 1, endPeriod: 3, room: "I.102", lecturer: "Nguyễn Viết Hưng", weeks: "1-15" },

  // 40: COMP1701, COMP170103, Lý thuyết đồ thị và ứng dụng, 3 TC, Thứ 6 (1-3) I.203, Nguyễn Viết Hưng
  { stt: 40, courseCode: "COMP1701", classCode: "COMP170103", courseName: "Lý thuyết đồ thị và ứng dụng", credits: 3, classType: "LT", group: "Lớp 03", dayOfWeek: 6, startPeriod: 1, endPeriod: 3, room: "I.203", lecturer: "Nguyễn Viết Hưng", weeks: "1-15" },

  // 41: COMP1701, COMP170104, Lý thuyết đồ thị và ứng dụng, 3 TC, Thứ 4 (4-6) I.203, Nguyễn Viết Hưng
  { stt: 41, courseCode: "COMP1701", classCode: "COMP170104", courseName: "Lý thuyết đồ thị và ứng dụng", credits: 3, classType: "LT", group: "Lớp 04", dayOfWeek: 4, startPeriod: 4, endPeriod: 6, room: "I.203", lecturer: "Nguyễn Viết Hưng", weeks: "1-15" },

  // 42: COMP1701, COMP170105, Lý thuyết đồ thị và ứng dụng, 3 TC, Thứ 6 (4-6) I.203, Nguyễn Viết Hưng
  { stt: 42, courseCode: "COMP1701", classCode: "COMP170105", courseName: "Lý thuyết đồ thị và ứng dụng", credits: 3, classType: "LT", group: "Lớp 05", dayOfWeek: 6, startPeriod: 4, endPeriod: 6, room: "I.203", lecturer: "Nguyễn Viết Hưng", weeks: "1-15" },

  // 43: COMP1314, COMP131401, Trí tuệ nhân tạo, 3 TC, Thứ 2 (7-9) A.414, Võ Hoàng Quân
  { stt: 43, courseCode: "COMP1314", classCode: "COMP131401", courseName: "Trí tuệ nhân tạo", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 2, startPeriod: 7, endPeriod: 9, room: "A.414", lecturer: "Võ Hoàng Quân", weeks: "1-15" },

  // 44: COMP1314, COMP131402, Trí tuệ nhân tạo, 3 TC, Thứ 2 (10-12) A.414, Võ Hoàng Quân
  { stt: 44, courseCode: "COMP1314", classCode: "COMP131402", courseName: "Trí tuệ nhân tạo", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 2, startPeriod: 10, endPeriod: 12, room: "A.414", lecturer: "Võ Hoàng Quân", weeks: "1-15" },

  // 45: COMP1314, COMP131403, Trí tuệ nhân tạo, 3 TC, Thứ 6 (7-9) I.102, Võ Hoàng Quân
  { stt: 45, courseCode: "COMP1314", classCode: "COMP131403", courseName: "Trí tuệ nhân tạo", credits: 3, classType: "LT", group: "Lớp 03", dayOfWeek: 6, startPeriod: 7, endPeriod: 9, room: "I.102", lecturer: "Võ Hoàng Quân", weeks: "1-15" },

  // 46: COMP1314, COMP131404, Trí tuệ nhân tạo, 3 TC, Thứ 6 (4-6) I.102, Võ Hoàng Quân
  { stt: 46, courseCode: "COMP1314", classCode: "COMP131404", courseName: "Trí tuệ nhân tạo", credits: 3, classType: "LT", group: "Lớp 04", dayOfWeek: 6, startPeriod: 4, endPeriod: 6, room: "I.102", lecturer: "Võ Hoàng Quân", weeks: "1-15" },

  // 47: COMP1314, COMP131405, Trí tuệ nhân tạo, 3 TC, Thứ 6 (10-12) I.102, Võ Hoàng Quân
  { stt: 47, courseCode: "COMP1314", classCode: "COMP131405", courseName: "Trí tuệ nhân tạo", credits: 3, classType: "LT", group: "Lớp 05", dayOfWeek: 6, startPeriod: 10, endPeriod: 12, room: "I.102", lecturer: "Võ Hoàng Quân", weeks: "1-15" },

  // 48: COMP1046, COMP104601, Các hệ cơ sở tri thức, 3 TC, Thứ 3 (2-5) C.203, Nguyễn Đình Hiển
  { stt: 48, courseCode: "COMP1046", classCode: "COMP104601", courseName: "Các hệ cơ sở tri thức", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 3, startPeriod: 2, endPeriod: 5, room: "C.203", lecturer: "Nguyễn Đình Hiển", weeks: "1-15" },

  // 49: COMP1712, COMP171201, Học máy, 3 TC, Thứ 4 (1-3) B.114, Ngô Quốc Việt
  { stt: 49, courseCode: "COMP1712", classCode: "COMP171201", courseName: "Học máy", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 4, startPeriod: 1, endPeriod: 3, room: "B.114", lecturer: "Ngô Quốc Việt", weeks: "1-15" },

  // 50: COMP1712, COMP171202, Học máy, 3 TC, Thứ 5 (1-3) B.114, Ngô Quốc Việt
  { stt: 50, courseCode: "COMP1712", classCode: "COMP171202", courseName: "Học máy", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 5, startPeriod: 1, endPeriod: 3, room: "B.114", lecturer: "Ngô Quốc Việt", weeks: "1-15" },

  // 51: COMP1401, COMP140101, Phân tích và thiết kế giải thuật, 3 TC, Thứ 5 (4-6) C.201, Ngô Quốc Việt
  { stt: 51, courseCode: "COMP1401", classCode: "COMP140101", courseName: "Phân tích và thiết kế giải thuật", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 5, startPeriod: 4, endPeriod: 6, room: "C.201", lecturer: "Ngô Quốc Việt", weeks: "1-15" },

  // 52: COMP1050, COMP105001, Xử lý ảnh số, 3 TC, Thứ 4 (4-6) C.201, Thứ 5 (4-6) C.201, Ngô Quốc Việt
  { stt: 52, courseCode: "COMP1050", classCode: "COMP105001", courseName: "Xử lý ảnh số", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 4, startPeriod: 4, endPeriod: 6, room: "C.201", lecturer: "Ngô Quốc Việt", weeks: "1-15" },
  { stt: 52, courseCode: "COMP1050", classCode: "COMP105001", courseName: "Xử lý ảnh số", credits: 3, classType: "TH", group: "Lớp 01 (TH)", dayOfWeek: 5, startPeriod: 4, endPeriod: 6, room: "C.201", lecturer: "Ngô Quốc Việt", weeks: "1-15" },

  // 53: COMP1332, COMP133201, Hệ điều hành, 3 TC, Thứ 4 (1-4) D.207 LVS, Nguyễn Phương Nam
  { stt: 53, courseCode: "COMP1332", classCode: "COMP133201", courseName: "Hệ điều hành", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 4, startPeriod: 1, endPeriod: 4, room: "D.207 LVS", lecturer: "Nguyễn Phương Nam", weeks: "1-15" },

  // 54: COMP1332, COMP133202, Hệ điều hành, 3 TC, Thứ 6 (1-4) D.207 LVS, Nguyễn Phương Nam
  { stt: 54, courseCode: "COMP1332", classCode: "COMP133202", courseName: "Hệ điều hành", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 6, startPeriod: 1, endPeriod: 4, room: "D.207 LVS", lecturer: "Nguyễn Phương Nam", weeks: "1-15" },

  // 55: COMP1011, COMP101101, Kiến trúc máy tính và hợp ngữ, 3 TC, Thứ 3 (7-9) C.203, Trần Đức Tâm
  { stt: 55, courseCode: "COMP1011", classCode: "COMP101101", courseName: "Kiến trúc máy tính và hợp ngữ", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 3, startPeriod: 7, endPeriod: 9, room: "C.203", lecturer: "Trần Đức Tâm", weeks: "1-15" },

  // 55b: COMP1324, COMP132401, Phân tích dữ liệu, 3 TC, Thứ 4 (1-3) C.203, Nguyễn Tấn Trung
  { stt: 55, courseCode: "COMP1324", classCode: "COMP132401", courseName: "Phân tích dữ liệu", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 4, startPeriod: 1, endPeriod: 3, room: "C.203", lecturer: "Nguyễn Tấn Trung", weeks: "1-15" },

  // 56: COMP1502, COMP150201, Quy hoạch tuyến tính và ứng dụng, 3 TC, Thứ 7 (7-10) I.201, Trần Sơn Hải
  { stt: 56, courseCode: "COMP1502", classCode: "COMP150201", courseName: "Quy hoạch tuyến tính và ứng dụng", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 7, startPeriod: 7, endPeriod: 10, room: "I.201", lecturer: "Trần Sơn Hải", weeks: "1-15" },

  // 57: COMP1325, COMP132501, Máy học nâng cao, 3 TC, Thứ 2 (3-6) C.303, Nguyễn Quốc Trung
  { stt: 57, courseCode: "COMP1325", classCode: "COMP132501", courseName: "Máy học nâng cao", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 2, startPeriod: 3, endPeriod: 6, room: "C.303", lecturer: "Nguyễn Quốc Trung", weeks: "1-15" },

  // 58: COMP1015, 2611COMP1015GD01, Nhập môn mạng máy tính, 3 TC, Thứ 3 (4-6) I.202, Lê Minh Triết
  { stt: 58, courseCode: "COMP1015", classCode: "2611COMP1015GD01", courseName: "Nhập môn mạng máy tính", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 3, startPeriod: 4, endPeriod: 6, room: "I.202", lecturer: "Lê Minh Triết", weeks: "1-15" },

  // 59: COMP1015, 2611COMP1015GD02, Nhập môn mạng máy tính, 3 TC, Thứ 4 (4-6) I.202, Lê Minh Triết
  { stt: 59, courseCode: "COMP1015", classCode: "2611COMP1015GD02", courseName: "Nhập môn mạng máy tính", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 4, startPeriod: 4, endPeriod: 6, room: "I.202", lecturer: "Lê Minh Triết", weeks: "1-15" },

  // 60: COMP1015, 2611COMP1015GD03, Nhập môn mạng máy tính, 3 TC, Thứ 2 (7-9) C.301, Âu Bửu Long
  { stt: 60, courseCode: "COMP1015", classCode: "2611COMP1015GD03", courseName: "Nhập môn mạng máy tính", credits: 3, classType: "LT", group: "Lớp 03", dayOfWeek: 2, startPeriod: 7, endPeriod: 9, room: "C.301", lecturer: "Âu Bửu Long", weeks: "1-15" },

  // 61: COMP1018, 2611COMP1018GD01, Cơ sở dữ liệu, 3 TC, Thứ 6 (4-6) C.404, Văn Thế Thành
  { stt: 61, courseCode: "COMP1018", classCode: "2611COMP1018GD01", courseName: "Cơ sở dữ liệu", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 6, startPeriod: 4, endPeriod: 6, room: "C.404", lecturer: "Văn Thế Thành", weeks: "1-15" },

  // 62: COMP1018, 2611COMP1018GD02, Cơ sở dữ liệu, 3 TC, Thứ 7 (1-3) C.404, Văn Thế Thành
  { stt: 62, courseCode: "COMP1018", classCode: "2611COMP1018GD02", courseName: "Cơ sở dữ liệu", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 7, startPeriod: 1, endPeriod: 3, room: "C.404", lecturer: "Văn Thế Thành", weeks: "1-15" },

  // 63: COMP1018, 2611COMP1018GD03, Cơ sở dữ liệu, 3 TC, Thứ 2 (4-6) C.201, Lê Văn Nhân
  { stt: 63, courseCode: "COMP1018", classCode: "2611COMP1018GD03", courseName: "Cơ sở dữ liệu", credits: 3, classType: "LT", group: "Lớp 03", dayOfWeek: 2, startPeriod: 4, endPeriod: 6, room: "C.201", lecturer: "Lê Văn Nhân", weeks: "1-15" },

  // 64: COMP1018, 2611COMP1018GD04, Cơ sở dữ liệu, 3 TC, Thứ 4 (7-9) C.201, Lê Văn Nhân
  { stt: 64, courseCode: "COMP1018", classCode: "2611COMP1018GD04", courseName: "Cơ sở dữ liệu", credits: 3, classType: "LT", group: "Lớp 04", dayOfWeek: 4, startPeriod: 7, endPeriod: 9, room: "C.201", lecturer: "Lê Văn Nhân", weeks: "1-15" },

  // 65: COMP1019, 2611COMP1019GD01, Lập trình trên Windows, 3 TC, Thứ 3 (7-9) I.201, Thứ 5 (4-6) C.203, Lê Văn Nhân
  { stt: 65, courseCode: "COMP1019", classCode: "2611COMP1019GD01", courseName: "Lập trình trên Windows", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 3, startPeriod: 7, endPeriod: 9, room: "I.201", lecturer: "Lê Văn Nhân", weeks: "1-15" },
  { stt: 65, courseCode: "COMP1019", classCode: "2611COMP1019GD01", courseName: "Lập trình trên Windows", credits: 3, classType: "TH", group: "Lớp 01 (TH)", dayOfWeek: 5, startPeriod: 4, endPeriod: 6, room: "C.203", lecturer: "Lê Văn Nhân", weeks: "1-15" },

  // 66: COMP1019, 2611COMP1019GD02, Lập trình trên Windows, 3 TC, Thứ 2 (4-6) I.201, Thứ 4 (7-9) I.202, Lương Trần Ngọc Khiết
  { stt: 66, courseCode: "COMP1019", classCode: "2611COMP1019GD02", courseName: "Lập trình trên Windows", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 2, startPeriod: 4, endPeriod: 6, room: "I.201", lecturer: "Lương Trần Ngọc Khiết", weeks: "1-15" },
  { stt: 66, courseCode: "COMP1019", classCode: "2611COMP1019GD02", courseName: "Lập trình trên Windows", credits: 3, classType: "TH", group: "Lớp 02 (TH)", dayOfWeek: 4, startPeriod: 7, endPeriod: 9, room: "I.202", lecturer: "Lương Trần Ngọc Khiết", weeks: "1-15" },

  // 67: COMP1019, 2611COMP1019GD03, Lập trình trên Windows, 3 TC, Thứ 3 (4-6) I.201, Thứ 4 (10-12) I.202, Lương Trần Ngọc Khiết
  { stt: 67, courseCode: "COMP1019", classCode: "2611COMP1019GD03", courseName: "Lập trình trên Windows", credits: 3, classType: "LT", group: "Lớp 03", dayOfWeek: 3, startPeriod: 4, endPeriod: 6, room: "I.201", lecturer: "Lương Trần Ngọc Khiết", weeks: "1-15" },
  { stt: 67, courseCode: "COMP1019", classCode: "2611COMP1019GD03", courseName: "Lập trình trên Windows", credits: 3, classType: "TH", group: "Lớp 03 (TH)", dayOfWeek: 4, startPeriod: 10, endPeriod: 12, room: "I.202", lecturer: "Lương Trần Ngọc Khiết", weeks: "1-15" },

  // 68: COMP1019, 2611COMP1019GD04, Lập trình trên Windows, 3 TC, Thứ 2 (10-12) C.203, Thứ 4 (4-6) I.201, Lê Thanh Thoại
  { stt: 68, courseCode: "COMP1019", classCode: "2611COMP1019GD04", courseName: "Lập trình trên Windows", credits: 3, classType: "LT", group: "Lớp 04", dayOfWeek: 2, startPeriod: 10, endPeriod: 12, room: "C.203", lecturer: "Lê Thanh Thoại", weeks: "1-15" },
  { stt: 68, courseCode: "COMP1019", classCode: "2611COMP1019GD04", courseName: "Lập trình trên Windows", credits: 3, classType: "TH", group: "Lớp 04 (TH)", dayOfWeek: 4, startPeriod: 4, endPeriod: 6, room: "I.201", lecturer: "Lê Thanh Thoại", weeks: "1-15" },

  // 69: COMP1024, 2611COMP1024GD01, Các hệ cơ sở dữ liệu, 3 TC, Thứ 5 (2-5) I.202, Lê Minh Triết
  { stt: 69, courseCode: "COMP1024", classCode: "2611COMP1024GD01", courseName: "Các hệ cơ sở dữ liệu", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 5, startPeriod: 2, endPeriod: 5, room: "I.202", lecturer: "Lê Minh Triết", weeks: "1-15" },

  // 70: COMP1024, 2611COMP1024GD02, Các hệ cơ sở dữ liệu, 3 TC, Thứ 6 (2-5) I.202, Lê Minh Triết
  { stt: 70, courseCode: "COMP1024", classCode: "2611COMP1024GD02", courseName: "Các hệ cơ sở dữ liệu", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 6, startPeriod: 2, endPeriod: 5, room: "I.202", lecturer: "Lê Minh Triết", weeks: "1-15" },

  // 71: COMP1032, 2611COMP1032GD01, Phân tích và thiết kế hệ thống thông tin, 3 TC, Thứ 5 (4-6) C.404, Vy Vân
  { stt: 71, courseCode: "COMP1032", classCode: "2611COMP1032GD01", courseName: "Phân tích và thiết kế hệ thống thông tin", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 5, startPeriod: 4, endPeriod: 6, room: "C.404", lecturer: "Vy Vân", weeks: "1-15" },

  // 72: COMP1032, 2611COMP1032GD02, Phân tích và thiết kế hệ thống thông tin, 3 TC, Thứ 2 (4-6) C.404, Ma Ngân Giang
  { stt: 72, courseCode: "COMP1032", classCode: "2611COMP1032GD02", courseName: "Phân tích và thiết kế hệ thống thông tin", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 2, startPeriod: 4, endPeriod: 6, room: "C.404", lecturer: "Ma Ngân Giang", weeks: "1-15" },

  // 73: COMP1041, 2611COMP1041GD01, Cơ sở dữ liệu nâng cao, 3 TC, Thứ 6 (1-3) C.404, Văn Thế Thành
  { stt: 73, courseCode: "COMP1041", classCode: "2611COMP1041GD01", courseName: "Cơ sở dữ liệu nâng cao", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 6, startPeriod: 1, endPeriod: 3, room: "C.404", lecturer: "Văn Thế Thành", weeks: "1-15" },

  // 74: COMP1043, 2611COMP1043GD01, Hệ thống mã nguồn mở, 3 TC, Thứ 2 (10-12) C.301, Âu Bửu Long
  { stt: 74, courseCode: "COMP1043", classCode: "2611COMP1043GD01", courseName: "Hệ thống mã nguồn mở", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 2, startPeriod: 10, endPeriod: 12, room: "C.301", lecturer: "Âu Bửu Long", weeks: "1-15" },

  // 75: COMP1044, 2611COMP1044GD01, Nhập môn công nghệ phần mềm, 3 TC, Thứ 3 (7-9) C.201, Trần Thanh Nhã
  { stt: 75, courseCode: "COMP1044", classCode: "2611COMP1044GD01", courseName: "Nhập môn công nghệ phần mềm", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 3, startPeriod: 7, endPeriod: 9, room: "C.201", lecturer: "Trần Thanh Nhã", weeks: "1-15" },

  // 76: COMP1044, 2611COMP1044GD02, Nhập môn công nghệ phần mềm, 3 TC, Thứ 3 (10-12) C.201, Trần Thanh Nhã
  { stt: 76, courseCode: "COMP1044", classCode: "2611COMP1044GD02", courseName: "Nhập môn công nghệ phần mềm", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 3, startPeriod: 10, endPeriod: 12, room: "C.201", lecturer: "Trần Thanh Nhã", weeks: "1-15" },

  // 77: COMP1044, 2611COMP1044GD03, Nhập môn công nghệ phần mềm, 3 TC, Thứ 4 (1-3) C.201, Trần Thanh Nhã
  { stt: 77, courseCode: "COMP1044", classCode: "2611COMP1044GD03", courseName: "Nhập môn công nghệ phần mềm", credits: 3, classType: "LT", group: "Lớp 03", dayOfWeek: 4, startPeriod: 1, endPeriod: 3, room: "C.201", lecturer: "Trần Thanh Nhã", weeks: "1-15" },

  // 78: COMP1044, 2611COMP1044GD04, Nhập môn công nghệ phần mềm, 3 TC, Thứ 4 (4-6) C.201, Trần Thanh Nhã
  { stt: 78, courseCode: "COMP1044", classCode: "2611COMP1044GD04", courseName: "Nhập môn công nghệ phần mềm", credits: 3, classType: "LT", group: "Lớp 04", dayOfWeek: 4, startPeriod: 4, endPeriod: 6, room: "C.201", lecturer: "Trần Thanh Nhã", weeks: "1-15" },

  // 79: COMP1044, 2611COMP1044GD05, Nhập môn công nghệ phần mềm, 3 TC, Thứ 2 (4-6) C.203, Lê Thanh Thoại
  { stt: 79, courseCode: "COMP1044", classCode: "2611COMP1044GD05", courseName: "Nhập môn công nghệ phần mềm", credits: 3, classType: "LT", group: "Lớp 05", dayOfWeek: 2, startPeriod: 4, endPeriod: 6, room: "C.203", lecturer: "Lê Thanh Thoại", weeks: "1-15" },

  // 80: COMP1044, 2611COMP1044GD06, Nhập môn công nghệ phần mềm, 3 TC, Thứ 2 (7-9) C.203, Lê Thanh Thoại
  { stt: 80, courseCode: "COMP1044", classCode: "2611COMP1044GD06", courseName: "Nhập môn công nghệ phần mềm", credits: 3, classType: "LT", group: "Lớp 06", dayOfWeek: 2, startPeriod: 7, endPeriod: 9, room: "C.203", lecturer: "Lê Thanh Thoại", weeks: "1-15" },

  // 81: COMP1060, 2611COMP1060GD01, Phân tích thiết kế hướng đối tượng, 3 TC, Thứ 6 (10-12) A.414, Nguyễn Văn Thịnh
  { stt: 81, courseCode: "COMP1060", classCode: "2611COMP1060GD01", courseName: "Phân tích thiết kế hướng đối tượng", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 6, startPeriod: 10, endPeriod: 12, room: "A.414", lecturer: "Nguyễn Văn Thịnh", weeks: "1-15" },

  // 82: COMP1060, 2611COMP1060GD02, Phân tích thiết kế hướng đối tượng, 3 TC, Thứ 6 (7-9) A.414, Nguyễn Văn Thịnh
  { stt: 82, courseCode: "COMP1060", classCode: "2611COMP1060GD02", courseName: "Phân tích thiết kế hướng đối tượng", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 6, startPeriod: 7, endPeriod: 9, room: "A.414", lecturer: "Nguyễn Văn Thịnh", weeks: "1-15" },

  // 83: COMP1060, 2611COMP1060GD03, Phân tích thiết kế hướng đối tượng, 3 TC, Thứ 6 (4-6) A.414, Nguyễn Văn Thịnh
  { stt: 83, courseCode: "COMP1060", classCode: "2611COMP1060GD03", courseName: "Phân tích thiết kế hướng đối tượng", credits: 3, classType: "LT", group: "Lớp 03", dayOfWeek: 6, startPeriod: 4, endPeriod: 6, room: "A.414", lecturer: "Nguyễn Văn Thịnh", weeks: "1-15" },

  // 84: COMP1060, 2611COMP1060GD04, Phân tích thiết kế hướng đối tượng, 3 TC, Thứ 6 (1-3) A.414, Nguyễn Văn Thịnh
  { stt: 84, courseCode: "COMP1060", classCode: "2611COMP1060GD04", courseName: "Phân tích thiết kế hướng đối tượng", credits: 3, classType: "LT", group: "Lớp 04", dayOfWeek: 6, startPeriod: 1, endPeriod: 3, room: "A.414", lecturer: "Nguyễn Văn Thịnh", weeks: "1-15" },

  // 85: COMP1069, 2611COMP1069GD01, Công nghệ phần mềm nâng cao, 3 TC, Thứ 7 (4-6) I.201, Trần Sơn Hải
  { stt: 85, courseCode: "COMP1069", classCode: "2611COMP1069GD01", courseName: "Công nghệ phần mềm nâng cao", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 7, startPeriod: 4, endPeriod: 6, room: "I.201", lecturer: "Trần Sơn Hải", weeks: "1-15" },

  // 86: COMP1084, 2611COMP1084GD01, Thương mại điện tử, 3 TC, Thứ 4 (4-6) C.203, Vy Vân
  { stt: 86, courseCode: "COMP1084", classCode: "2611COMP1084GD01", courseName: "Thương mại điện tử", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 4, startPeriod: 4, endPeriod: 6, room: "C.203", lecturer: "Vy Vân", weeks: "1-15" },

  // 87: COMP1084, 2611COMP1084GD02, Thương mại điện tử, 3 TC, Thứ 4 (7-9) C.203, Vy Vân
  { stt: 87, courseCode: "COMP1084", classCode: "2611COMP1084GD02", courseName: "Thương mại điện tử", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 4, startPeriod: 7, endPeriod: 9, room: "C.203", lecturer: "Vy Vân", weeks: "1-15" },

  // 88: COMP1304, 2611COMP1304GD01, Phát triển ứng dụng trên thiết bị di động, 3 TC, Thứ 2 (2-5) I.202, Nguyễn Đỗ Thái Nguyên
  { stt: 88, courseCode: "COMP1304", classCode: "2611COMP1304GD01", courseName: "Phát triển ứng dụng trên thiết bị di động", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 2, startPeriod: 2, endPeriod: 5, room: "I.202", lecturer: "Nguyễn Đỗ Thái Nguyên", weeks: "1-15" },

  // 89: COMP1305, 2611COMP1305GD01, Quản lý dự án Công nghệ Thông tin, 3 TC, Thứ 7 (4-6) C.305, Nguyễn Văn Tuấn (P.CNTT)
  { stt: 89, courseCode: "COMP1305", classCode: "2611COMP1305GD01", courseName: "Quản lý dự án Công nghệ Thông tin", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 7, startPeriod: 4, endPeriod: 6, room: "C.305", lecturer: "Nguyễn Văn Tuấn (P.CNTT)", weeks: "1-15" },

  // 90: COMP1307, 2611COMP1307GD01, Kiểm thử phần mềm cơ bản, 3 TC, Thứ 4 (7-9) I.201, Lê Thanh Thoại
  { stt: 90, courseCode: "COMP1307", classCode: "2611COMP1307GD01", courseName: "Kiểm thử phần mềm cơ bản", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 4, startPeriod: 7, endPeriod: 9, room: "I.201", lecturer: "Lê Thanh Thoại", weeks: "1-15" },

  // 91: COMP1307, 2611COMP1307GD02, Kiểm thử phần mềm cơ bản, 3 TC, Thứ 4 (10-12) I.201, Lê Thanh Thoại
  { stt: 91, courseCode: "COMP1307", classCode: "2611COMP1307GD02", courseName: "Kiểm thử phần mềm cơ bản", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 4, startPeriod: 10, endPeriod: 12, room: "I.201", lecturer: "Lê Thanh Thoại", weeks: "1-15" },

  // 92: COMP1309, 2611COMP1309GD01, Kiểm thử phần mềm nâng cao, 3 TC, Thứ 7 (1-3) I.201, Trần Sơn Hải
  { stt: 92, courseCode: "COMP1309", classCode: "2611COMP1309GD01", courseName: "Kiểm thử phần mềm nâng cao", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 7, startPeriod: 1, endPeriod: 3, room: "I.201", lecturer: "Trần Sơn Hải", weeks: "1-15" },

  // 93: COMP1313, 2611COMP1313GD01, Điện toán đám mây, 3 TC, Thứ 3 (7-9) C.301, Âu Bửu Long
  { stt: 93, courseCode: "COMP1313", classCode: "2611COMP1313GD01", courseName: "Điện toán đám mây", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 3, startPeriod: 7, endPeriod: 9, room: "C.301", lecturer: "Âu Bửu Long", weeks: "1-15" },

  // 94: COMP1313, 2611COMP1313GD02, Điện toán đám mây, 3 TC, Thứ 3 (10-12) C.301, Âu Bửu Long
  { stt: 94, courseCode: "COMP1313", classCode: "2611COMP1313GD02", courseName: "Điện toán đám mây", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 3, startPeriod: 10, endPeriod: 12, room: "C.301", lecturer: "Âu Bửu Long", weeks: "1-15" },

  // 95: COMP1308, 2611COMP1308GD01, Phát triển ứng dụng trò chơi, 3 TC, Thứ 2 (7-10) I.202, Nguyễn Đỗ Thái Nguyên
  { stt: 95, courseCode: "COMP1308", classCode: "2611COMP1308GD01", courseName: "Phát triển ứng dụng trò chơi", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 2, startPeriod: 7, endPeriod: 10, room: "I.202", lecturer: "Nguyễn Đỗ Thái Nguyên", weeks: "1-15" },

  // 96: COMP1704, 2611COMP1704GD01, Nhập môn DevOps, 3 TC, Thứ 4 (1-3) C.305, Mai Vân Phương Vũ
  { stt: 96, courseCode: "COMP1704", classCode: "2611COMP1704GD01", courseName: "Nhập môn DevOps", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 4, startPeriod: 1, endPeriod: 3, room: "C.305", lecturer: "Mai Vân Phương Vũ", weeks: "1-15" },

  // 97: COMP1802, 2611COMP1802GD01, Thiết kế web, 2 TC, Thứ 2 (1-3) I.102, Lương Trần Hy Hiến
  { stt: 97, courseCode: "COMP1802", classCode: "2611COMP1802GD01", courseName: "Thiết kế web", credits: 2, classType: "LT", group: "Lớp 01", dayOfWeek: 2, startPeriod: 1, endPeriod: 3, room: "I.102", lecturer: "Lương Trần Hy Hiến", weeks: "1-15" },

  // 98: COMP1802, 2611COMP1802GD02, Thiết kế web, 2 TC, Thứ 2 (4-6) I.102, Lương Trần Hy Hiến
  { stt: 98, courseCode: "COMP1802", classCode: "2611COMP1802GD02", courseName: "Thiết kế web", credits: 2, classType: "LT", group: "Lớp 02", dayOfWeek: 2, startPeriod: 4, endPeriod: 6, room: "I.102", lecturer: "Lương Trần Hy Hiến", weeks: "1-15" },

  // 99: COMP1802, 2611COMP1802GD03, Thiết kế web, 2 TC, Thứ 2 (7-9) I.201, Lương Trần Hy Hiến
  { stt: 99, courseCode: "COMP1802", classCode: "2611COMP1802GD03", courseName: "Thiết kế web", credits: 2, classType: "LT", group: "Lớp 03", dayOfWeek: 2, startPeriod: 7, endPeriod: 9, room: "I.201", lecturer: "Lương Trần Hy Hiến", weeks: "1-15" },

  // 100: COMP1802, 2611COMP1802GD04, Thiết kế web, 2 TC, Thứ 7 (7-9) I.203, Nguyễn Quốc Trung
  { stt: 100, courseCode: "COMP1802", classCode: "2611COMP1802GD04", courseName: "Thiết kế web", credits: 2, classType: "LT", group: "Lớp 04", dayOfWeek: 7, startPeriod: 7, endPeriod: 9, room: "I.203", lecturer: "Nguyễn Quốc Trung", weeks: "1-15" },

  // 101: COMP1802, 2611COMP1802GD05, Thiết kế web, 2 TC, Thứ 7 (10-12) I.203, Nguyễn Quốc Trung
  { stt: 101, courseCode: "COMP1802", classCode: "2611COMP1802GD05", courseName: "Thiết kế web", credits: 2, classType: "LT", group: "Lớp 05", dayOfWeek: 7, startPeriod: 10, endPeriod: 12, room: "I.203", lecturer: "Nguyễn Quốc Trung", weeks: "1-15" },

  // 102: COMP1804, 2611COMP1804GD01, Lập trình Python, 3 TC, Thứ 3 (1-3) I.202, Lương Trần Hy Hiến
  { stt: 102, courseCode: "COMP1804", classCode: "2611COMP1804GD01", courseName: "Lập trình Python", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 3, startPeriod: 1, endPeriod: 3, room: "I.202", lecturer: "Lương Trần Hy Hiến", weeks: "1-15" },

  // 103: COMP1804, 2611COMP1804GD02, Lập trình Python, 3 TC, Thứ 4 (1-3) I.201, Lương Trần Hy Hiến
  { stt: 103, courseCode: "COMP1804", classCode: "2611COMP1804GD02", courseName: "Lập trình Python", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 4, startPeriod: 1, endPeriod: 3, room: "I.201", lecturer: "Lương Trần Hy Hiến", weeks: "1-15" },

  // 104: COMP1804, 2611COMP1804GD03, Lập trình Python, 3 TC, Thứ 5 (1-3) I.201, Lương Trần Hy Hiến
  { stt: 104, courseCode: "COMP1804", classCode: "2611COMP1804GD03", courseName: "Lập trình Python", credits: 3, classType: "LT", group: "Lớp 03", dayOfWeek: 5, startPeriod: 1, endPeriod: 3, room: "I.201", lecturer: "Lương Trần Hy Hiến", weeks: "1-15" },

  // 105: COMP1819, COMP181901, Phát triển chương trình môn Tin học, 3 TC, Thứ 5 (1-3) D.207 LVS, Nguyễn Trần Phi Phượng
  { stt: 105, courseCode: "COMP1819", classCode: "COMP181901", courseName: "Phát triển chương trình môn Tin học", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 5, startPeriod: 1, endPeriod: 3, room: "D.207 LVS", lecturer: "Nguyễn Trần Phi Phượng", weeks: "1-15" },

  // 106: COMP1819, COMP181902, Phát triển chương trình môn Tin học, 3 TC, Thứ 5 (4-6) D.207 LVS, Nguyễn Trần Phi Phượng
  { stt: 106, courseCode: "COMP1819", classCode: "COMP181902", courseName: "Phát triển chương trình môn Tin học", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 5, startPeriod: 4, endPeriod: 6, room: "D.207 LVS", lecturer: "Nguyễn Trần Phi Phượng", weeks: "1-15" },

  // 107: COMP1818, COMP181801, Phương pháp dạy học môn Tin học, 3 TC, Thứ 2 (1-3) C.301, Thứ 3 (1-3) C.301, Hồ Diệu Khuôn
  { stt: 107, courseCode: "COMP1818", classCode: "COMP181801", courseName: "Phương pháp dạy học môn Tin học", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 2, startPeriod: 1, endPeriod: 3, room: "C.301", lecturer: "Hồ Diệu Khuôn", weeks: "1-15" },
  { stt: 107, courseCode: "COMP1818", classCode: "COMP181801", courseName: "Phương pháp dạy học môn Tin học", credits: 3, classType: "TH", group: "Lớp 01 (TH)", dayOfWeek: 3, startPeriod: 1, endPeriod: 3, room: "C.301", lecturer: "Hồ Diệu Khuôn", weeks: "1-15" },

  // 108: COMP1818, COMP181802, Phương pháp dạy học môn Tin học, 3 TC, Thứ 2 (4-6) C.301, Thứ 3 (4-6) C.301, Hồ Diệu Khuôn
  { stt: 108, courseCode: "COMP1818", classCode: "COMP181802", courseName: "Phương pháp dạy học môn Tin học", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 2, startPeriod: 4, endPeriod: 6, room: "C.301", lecturer: "Hồ Diệu Khuôn", weeks: "1-15" },
  { stt: 108, courseCode: "COMP1818", classCode: "COMP181802", courseName: "Phương pháp dạy học môn Tin học", credits: 3, classType: "TH", group: "Lớp 02 (TH)", dayOfWeek: 3, startPeriod: 4, endPeriod: 6, room: "C.301", lecturer: "Hồ Diệu Khuôn", weeks: "1-15" },

  // 109: COMP1808, COMP180801, Thực hành dạy học môn Tin học, 3 TC, Thứ 5 (1-3) C.301, Thứ 4 (1-3) C.301, Hồ Diệu Khuôn
  { stt: 109, courseCode: "COMP1808", classCode: "COMP180801", courseName: "Thực hành dạy học môn Tin học", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 5, startPeriod: 1, endPeriod: 3, room: "C.301", lecturer: "Hồ Diệu Khuôn", weeks: "1-15" },
  { stt: 109, courseCode: "COMP1808", classCode: "COMP180801", courseName: "Thực hành dạy học môn Tin học", credits: 3, classType: "TH", group: "Lớp 01 (TH)", dayOfWeek: 4, startPeriod: 1, endPeriod: 3, room: "C.301", lecturer: "Hồ Diệu Khuôn", weeks: "1-15" },

  // 110: COMP1808, COMP180802, Thực hành dạy học môn Tin học, 3 TC, Thứ 5 (4-6) C.301, Thứ 4 (4-6) C.301, Hồ Diệu Khuôn
  { stt: 110, courseCode: "COMP1808", classCode: "COMP180802", courseName: "Thực hành dạy học môn Tin học", credits: 3, classType: "LT", group: "Lớp 02", dayOfWeek: 5, startPeriod: 4, endPeriod: 6, room: "C.301", lecturer: "Hồ Diệu Khuôn", weeks: "1-15" },
  { stt: 110, courseCode: "COMP1808", classCode: "COMP180802", courseName: "Thực hành dạy học môn Tin học", credits: 3, classType: "TH", group: "Lớp 02 (TH)", dayOfWeek: 4, startPeriod: 4, endPeriod: 6, room: "C.301", lecturer: "Hồ Diệu Khuôn", weeks: "1-15" },

  // 111: COMP1820, COMP182001, Đào tạo điện tử và ứng dụng, 2 TC, Thứ 3 (7-9) C.305, Thứ 4 (4-6) C.305, Nguyễn Thị Ngọc Hoa
  { stt: 111, courseCode: "COMP1820", classCode: "COMP182001", courseName: "Đào tạo điện tử và ứng dụng", credits: 2, classType: "LT", group: "Lớp 01", dayOfWeek: 3, startPeriod: 7, endPeriod: 9, room: "C.305", lecturer: "Nguyễn Thị Ngọc Hoa", weeks: "1-15" },
  { stt: 111, courseCode: "COMP1820", classCode: "COMP182001", courseName: "Đào tạo điện tử và ứng dụng", credits: 2, classType: "TH", group: "Lớp 01 (TH)", dayOfWeek: 4, startPeriod: 4, endPeriod: 6, room: "C.305", lecturer: "Nguyễn Thị Ngọc Hoa", weeks: "1-15" },

  // 112: COMP1820, COMP182002, Đào tạo điện tử và ứng dụng, 2 TC, Thứ 3 (10-12) C.305, Thứ 5 (10-12) C.305, Nguyễn Thị Ngọc Hoa
  { stt: 112, courseCode: "COMP1820", classCode: "COMP182002", courseName: "Đào tạo điện tử và ứng dụng", credits: 2, classType: "LT", group: "Lớp 02", dayOfWeek: 3, startPeriod: 10, endPeriod: 12, room: "C.305", lecturer: "Nguyễn Thị Ngọc Hoa", weeks: "1-15" },
  { stt: 112, courseCode: "COMP1820", classCode: "COMP182002", courseName: "Đào tạo điện tử và ứng dụng", credits: 2, classType: "TH", group: "Lớp 02 (TH)", dayOfWeek: 5, startPeriod: 10, endPeriod: 12, room: "C.305", lecturer: "Nguyễn Thị Ngọc Hoa", weeks: "1-15" },

  // 113: COMP1828, COMP182801, Kiểm tra, đánh giá trong môn Tin học, 2 TC, Thứ 2 (1-3) D.207 LVS, Thứ 3 (1-3) D.207 LVS, Nguyễn Trần Phi Phượng
  { stt: 113, courseCode: "COMP1828", classCode: "COMP182801", courseName: "Kiểm tra, đánh giá trong môn Tin học", credits: 2, classType: "LT", group: "Lớp 01", dayOfWeek: 2, startPeriod: 1, endPeriod: 3, room: "D.207 LVS", lecturer: "Nguyễn Trần Phi Phượng", weeks: "1-15" },
  { stt: 113, courseCode: "COMP1828", classCode: "COMP182801", courseName: "Kiểm tra, đánh giá trong môn Tin học", credits: 2, classType: "TH", group: "Lớp 01 (TH)", dayOfWeek: 3, startPeriod: 1, endPeriod: 3, room: "D.207 LVS", lecturer: "Nguyễn Trần Phi Phượng", weeks: "1-15" },

  // 114: COMP1828, COMP182802, Kiểm tra, đánh giá trong môn Tin học, 2 TC, Thứ 2 (4-6) D.207 LVS, Thứ 3 (4-6) D.207 LVS, Nguyễn Trần Phi Phượng
  { stt: 114, courseCode: "COMP1828", classCode: "COMP182802", courseName: "Kiểm tra, đánh giá trong môn Tin học", credits: 2, classType: "LT", group: "Lớp 02", dayOfWeek: 2, startPeriod: 4, endPeriod: 6, room: "D.207 LVS", lecturer: "Nguyễn Trần Phi Phượng", weeks: "1-15" },
  { stt: 114, courseCode: "COMP1828", classCode: "COMP182802", courseName: "Kiểm tra, đánh giá trong môn Tin học", credits: 2, classType: "TH", group: "Lớp 02 (TH)", dayOfWeek: 3, startPeriod: 4, endPeriod: 6, room: "D.207 LVS", lecturer: "Nguyễn Trần Phi Phượng", weeks: "1-15" },

  // 115: COMP1822, COMP182201, Dạy học chuyên đề học tập trong môn Tin học, 2 TC, Thứ 4 (7-9) C.305, Thứ 5 (7-9) C.305, Nguyễn Thị Ngọc Hoa
  { stt: 115, courseCode: "COMP1822", classCode: "COMP182201", courseName: "Dạy học chuyên đề học tập trong môn Tin học", credits: 2, classType: "LT", group: "Lớp 01", dayOfWeek: 4, startPeriod: 7, endPeriod: 9, room: "C.305", lecturer: "Nguyễn Thị Ngọc Hoa", weeks: "1-15" },
  { stt: 115, courseCode: "COMP1822", classCode: "COMP182201", courseName: "Dạy học chuyên đề học tập trong môn Tin học", credits: 2, classType: "TH", group: "Lớp 01 (TH)", dayOfWeek: 5, startPeriod: 7, endPeriod: 9, room: "C.305", lecturer: "Nguyễn Thị Ngọc Hoa", weeks: "1-15" },

  // 116: TECH1802, TECH180201, Cơ sở Vật lí, 3 TC, Thứ 3 (7-10) C.404, Nguyễn Thành Đạt
  { stt: 116, courseCode: "TECH1802", classCode: "TECH180201", courseName: "Cơ sở Vật lí", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 3, startPeriod: 7, endPeriod: 10, room: "C.404", lecturer: "Nguyễn Thành Đạt", weeks: "1-15" },

  // 117: EDTE1840, EDTE184001, Nhập môn Công nghệ giáo dục, 3 TC, Thứ 2 (1-3) C.404, Thứ 3 (1-3) C.303, Ma Ngân Giang
  { stt: 117, courseCode: "EDTE1840", classCode: "EDTE184001", courseName: "Nhập môn Công nghệ giáo dục", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 2, startPeriod: 1, endPeriod: 3, room: "C.404", lecturer: "Ma Ngân Giang", weeks: "1-15" },
  { stt: 117, courseCode: "EDTE1840", classCode: "EDTE184001", courseName: "Nhập môn Công nghệ giáo dục", credits: 3, classType: "TH", group: "Lớp 01 (TH)", dayOfWeek: 3, startPeriod: 1, endPeriod: 3, room: "C.303", lecturer: "Ma Ngân Giang", weeks: "1-15" },

  // 118: EDTE1844, EDTE184401, Lập trình cơ bản và thiết kế phần mềm, 4 TC, Thứ 2 (1-3) I.201, Thứ 3 (1-3) I.201, Lương Trần Ngọc Khiết
  { stt: 118, courseCode: "EDTE1844", classCode: "EDTE184401", courseName: "Lập trình cơ bản và thiết kế phần mềm", credits: 4, classType: "LT", group: "Lớp 01", dayOfWeek: 2, startPeriod: 1, endPeriod: 3, room: "I.201", lecturer: "Lương Trần Ngọc Khiết", weeks: "1-15" },
  { stt: 118, courseCode: "EDTE1844", classCode: "EDTE184401", courseName: "Lập trình cơ bản và thiết kế phần mềm", credits: 4, classType: "TH", group: "Lớp 01 (TH)", dayOfWeek: 3, startPeriod: 1, endPeriod: 3, room: "I.201", lecturer: "Lương Trần Ngọc Khiết", weeks: "1-15" },

  // 119: EDTE1843, EDTE184301, Phát triển chương trình Công nghệ giáo dục, 3 TC, Thứ 6 (7-9) C.301, Thứ 7 (7-9) C.301, Nguyễn Thị Kim Ánh
  { stt: 119, courseCode: "EDTE1843", classCode: "EDTE184301", courseName: "Phát triển chương trình Công nghệ giáo dục", credits: 3, classType: "LT", group: "Lớp 01", dayOfWeek: 6, startPeriod: 7, endPeriod: 9, room: "C.301", lecturer: "Nguyễn Thị Kim Ánh", weeks: "1-15" },
  { stt: 119, courseCode: "EDTE1843", classCode: "EDTE184301", courseName: "Phát triển chương trình Công nghệ giáo dục", credits: 3, classType: "TH", group: "Lớp 01 (TH)", dayOfWeek: 7, startPeriod: 7, endPeriod: 9, room: "C.301", lecturer: "Nguyễn Thị Kim Ánh", weeks: "1-15" },

  // 120: EDTE1845, EDTE184501, Khoa học dữ liệu và ứng dụng trong giáo dục, 4 TC, Thứ 3 (4-6) C.201, Thứ 5 (4-6) I.201, Trần Thanh Nhã
  { stt: 120, courseCode: "EDTE1845", classCode: "EDTE184501", courseName: "Khoa học dữ liệu và ứng dụng trong giáo dục", credits: 4, classType: "LT", group: "Lớp 01", dayOfWeek: 3, startPeriod: 4, endPeriod: 6, room: "C.201", lecturer: "Trần Thanh Nhã", weeks: "1-15" },
  { stt: 120, courseCode: "EDTE1845", classCode: "EDTE184501", courseName: "Khoa học dữ liệu và ứng dụng trong giáo dục", credits: 4, classType: "TH", group: "Lớp 01 (TH)", dayOfWeek: 5, startPeriod: 4, endPeriod: 6, room: "I.201", lecturer: "Trần Thanh Nhã", weeks: "1-15" },

  // 122: COMP1815, COMP181501, Ứng dụng CNTT trong môi trường làm việc, 2 TC, Thứ 7 (7-9) I.202, Võ Tuấn Hào
  { stt: 122, courseCode: "COMP1815", classCode: "COMP181501", courseName: "Ứng dụng CNTT trong môi trường làm việc", credits: 2, classType: "LT", group: "Lớp 01", dayOfWeek: 7, startPeriod: 7, endPeriod: 9, room: "I.202", lecturer: "Võ Tuấn Hào", weeks: "1-15" },

  // 123: COMP1815, COMP181502, Ứng dụng CNTT trong môi trường làm việc, 2 TC, Thứ 7 (10-12) I.202, Võ Tuấn Hào
  { stt: 123, courseCode: "COMP1815", classCode: "COMP181502", courseName: "Ứng dụng CNTT trong môi trường làm việc", credits: 2, classType: "LT", group: "Lớp 02", dayOfWeek: 7, startPeriod: 10, endPeriod: 12, room: "I.202", lecturer: "Võ Tuấn Hào", weeks: "1-15" },

  // 124: COMP1815, COMP181503, Ứng dụng CNTT trong môi trường làm việc, 2 TC, Thứ 7 (10-12) C.301, Nguyễn Thị Kim Ánh
  { stt: 124, courseCode: "COMP1815", classCode: "COMP181503", courseName: "Ứng dụng CNTT trong môi trường làm việc", credits: 2, classType: "LT", group: "Lớp 03", dayOfWeek: 7, startPeriod: 10, endPeriod: 12, room: "C.301", lecturer: "Nguyễn Thị Kim Ánh", weeks: "1-15" },

  // 125: COMP1815, COMP181504, Ứng dụng CNTT trong môi trường làm việc, 2 TC, Thứ 6 (10-12) C.301, Nguyễn Thị Kim Ánh
  { stt: 125, courseCode: "COMP1815", classCode: "COMP181504", courseName: "Ứng dụng CNTT trong môi trường làm việc", credits: 2, classType: "LT", group: "Lớp 04", dayOfWeek: 6, startPeriod: 10, endPeriod: 12, room: "C.301", lecturer: "Nguyễn Thị Kim Ánh", weeks: "1-15" },

  // 126: COMP1815, COMP181505, Ứng dụng CNTT trong môi trường làm việc, 2 TC, Thứ 7 (4-6) C.203, Phạm Văn Danh
  { stt: 126, courseCode: "COMP1815", classCode: "COMP181505", courseName: "Ứng dụng CNTT trong môi trường làm việc", credits: 2, classType: "LT", group: "Lớp 05", dayOfWeek: 7, startPeriod: 4, endPeriod: 6, room: "C.203", lecturer: "Phạm Văn Danh", weeks: "1-15" },

  // 127: COMP1815, COMP181506, Ứng dụng CNTT trong môi trường làm việc, 2 TC, Thứ 7 (7-9) C.305, Nguyễn Văn Tuấn
  { stt: 127, courseCode: "COMP1815", classCode: "COMP181506", courseName: "Ứng dụng CNTT trong môi trường làm việc", credits: 2, classType: "LT", group: "Lớp 06", dayOfWeek: 7, startPeriod: 7, endPeriod: 9, room: "C.305", lecturer: "Nguyễn Văn Tuấn", weeks: "1-15" },

  // 128: COMP1815, COMP181507, Ứng dụng CNTT trong môi trường làm việc, 2 TC, Thứ 7 (10-12) C.305, Nguyễn Văn Tuấn
  { stt: 128, courseCode: "COMP1815", classCode: "COMP181507", courseName: "Ứng dụng CNTT trong môi trường làm việc", credits: 2, classType: "LT", group: "Lớp 07", dayOfWeek: 7, startPeriod: 10, endPeriod: 12, room: "C.305", lecturer: "Nguyễn Văn Tuấn", weeks: "1-15" },

  // 129: COMP1810, COMP181001, Trí tuệ nhân tạo trong giáo dục, 2 TC, Thứ 3 (4-6) C.303, Ma Ngân Giang
  { stt: 129, courseCode: "COMP1810", classCode: "COMP181001", courseName: "Trí tuệ nhân tạo trong giáo dục", credits: 2, classType: "LT", group: "Lớp 01", dayOfWeek: 3, startPeriod: 4, endPeriod: 6, room: "C.303", lecturer: "Ma Ngân Giang", weeks: "1-15" },

  // 130: COMP1810, COMP181002, Trí tuệ nhân tạo trong giáo dục, 2 TC, Thứ 7 (1-3) C.301, Nguyễn Thị Kim Ánh
  { stt: 130, courseCode: "COMP1810", classCode: "COMP181002", courseName: "Trí tuệ nhân tạo trong giáo dục", credits: 2, classType: "LT", group: "Lớp 02", dayOfWeek: 7, startPeriod: 1, endPeriod: 3, room: "C.301", lecturer: "Nguyễn Thị Kim Ánh", weeks: "1-15" },

  // 131: COMP1810, COMP181003, Trí tuệ nhân tạo trong giáo dục, 2 TC, Thứ 7 (4-6) C.301, Nguyễn Thị Kim Ánh
  { stt: 131, courseCode: "COMP1810", classCode: "COMP181003", courseName: "Trí tuệ nhân tạo trong giáo dục", credits: 2, classType: "LT", group: "Lớp 03", dayOfWeek: 7, startPeriod: 4, endPeriod: 6, room: "C.301", lecturer: "Nguyễn Thị Kim Ánh", weeks: "1-15" },

  // 132: COMP1810, COMP181004, Trí tuệ nhân tạo trong giáo dục, 2 TC, Thứ 7 (1-3) C.201, Võ Phạm Trí Thiện
  { stt: 132, courseCode: "COMP1810", classCode: "COMP181004", courseName: "Trí tuệ nhân tạo trong giáo dục", credits: 2, classType: "LT", group: "Lớp 04", dayOfWeek: 7, startPeriod: 1, endPeriod: 3, room: "C.201", lecturer: "Võ Phạm Trí Thiện", weeks: "1-15" },

  // 133: COMP1810, COMP181005, Trí tuệ nhân tạo trong giáo dục, 2 TC, Thứ 7 (4-6) C.201, Võ Phạm Trí Thiện
  { stt: 133, courseCode: "COMP1810", classCode: "COMP181005", courseName: "Trí tuệ nhân tạo trong giáo dục", credits: 2, classType: "LT", group: "Lớp 05", dayOfWeek: 7, startPeriod: 4, endPeriod: 6, room: "C.201", lecturer: "Võ Phạm Trí Thiện", weeks: "1-15" },

  // 134: COMP1810, COMP181006, Trí tuệ nhân tạo trong giáo dục, 2 TC, Thứ 3 (4-6) C.305, Nguyễn Thị Ngọc Hoa
  { stt: 134, courseCode: "COMP1810", classCode: "COMP181006", courseName: "Trí tuệ nhân tạo trong giáo dục", credits: 2, classType: "LT", group: "Lớp 06", dayOfWeek: 3, startPeriod: 4, endPeriod: 6, room: "C.305", lecturer: "Nguyễn Thị Ngọc Hoa", weeks: "1-15" },

  // 135: COMP1812, COMP181201, Trí tuệ nhân tạo và định hướng ứng dụng, 2 TC, Thứ 7 (1-3) C.303, Nguyễn Quốc Trung
  { stt: 135, courseCode: "COMP1812", classCode: "COMP181201", courseName: "Trí tuệ nhân tạo và định hướng ứng dụng", credits: 2, classType: "LT", group: "Lớp 01", dayOfWeek: 7, startPeriod: 1, endPeriod: 3, room: "C.303", lecturer: "Nguyễn Quốc Trung", weeks: "1-15" },

  // 136: COMP1812, COMP181202, Trí tuệ nhân tạo và định hướng ứng dụng, 2 TC, Thứ 7 (4-6) C.303, Nguyễn Quốc Trung
  { stt: 136, courseCode: "COMP1812", classCode: "COMP181202", courseName: "Trí tuệ nhân tạo và định hướng ứng dụng", credits: 2, classType: "LT", group: "Lớp 02", dayOfWeek: 7, startPeriod: 4, endPeriod: 6, room: "C.303", lecturer: "Nguyễn Quốc Trung", weeks: "1-15" },

  // 137: COMP1812, COMP181203, Trí tuệ nhân tạo và định hướng ứng dụng, 2 TC, Thứ 2 (7-9) C.303, Nguyễn Quốc Trung
  { stt: 137, courseCode: "COMP1812", classCode: "COMP181203", courseName: "Trí tuệ nhân tạo và định hướng ứng dụng", credits: 2, classType: "LT", group: "Lớp 03", dayOfWeek: 2, startPeriod: 7, endPeriod: 9, room: "C.303", lecturer: "Nguyễn Quốc Trung", weeks: "1-15" },

  // 138: COMP1812, COMP181204, Trí tuệ nhân tạo và định hướng ứng dụng, 2 TC, Thứ 2 (10-12) C.303, Nguyễn Quốc Trung
  { stt: 138, courseCode: "COMP1812", classCode: "COMP181204", courseName: "Trí tuệ nhân tạo và định hướng ứng dụng", credits: 2, classType: "LT", group: "Lớp 04", dayOfWeek: 2, startPeriod: 10, endPeriod: 12, room: "C.303", lecturer: "Nguyễn Quốc Trung", weeks: "1-15" }
];

fs.writeFileSync('./src/data/masterScheduleSample.json', JSON.stringify(data, null, 2));
console.log(`Successfully generated ${data.length} schedule entries from all 35 pages of the HCMUE master schedule PDF!`);
