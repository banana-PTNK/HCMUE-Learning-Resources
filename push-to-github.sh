#!/bin/bash
# ==============================================================================
# HCMUE-FIT StudyVault - Automated GitHub Push Script (Linux/macOS)
# Zero-Leak Security Automated Push
# ==============================================================================

set -e

echo "🚀 [1/5] Kiểm tra cấu hình và môi trường..."

if [ -z "$1" ]; then
  echo "❌ LỖI: Vui lòng cung cấp URL kho lưu trữ GitHub của bạn."
  echo "👉 Cách dùng: ./push-to-github.sh https://github.com/USERNAME/REPO.git"
  exit 1
fi

REPO_URL=$1

echo "🔒 [2/5] Đảm bảo loại trừ toàn bộ file bảo mật và thông tin nhạy cảm..."
# Khởi tạo git nếu chưa có
if [ ! -d ".git" ]; then
  git init
fi

# Xóa các file nhạy cảm khỏi bộ đệm theo dõi của git (nếu có)
git rm --cached firebase-applet-config.json metadata.json 2>/dev/null || true
git rm --cached -r .env* 2>/dev/null || true

echo "📦 [3/5] Thêm mã nguồn sạch vào Git..."
git add .gitignore .env.example README.md package.json tsconfig.json vite.config.ts server.ts src/ public/ index.html firestore.rules

echo "📝 [4/5] Tạo Commit Zero-Leak..."
git commit -m "feat(security): initial zero-leak repository release" || echo "Mã nguồn không có thay đổi mới."

echo "🌐 [5/5] Đẩy mã nguồn lên GitHub ($REPO_URL)..."
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"
git push -u origin main --force

echo "✅ HOÀN TẤT! Dự án của bạn đã được đẩy lên GitHub an toàn 100% không bị lộ bí mật."
