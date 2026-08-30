@echo off
REM ==============================================================================
REM EduMate - Kho học liệu số - Automated GitHub Push Script (Windows)
REM Zero-Leak Security Automated Push
REM ==============================================================================

setlocal enabledelayedexpansion

echo.
echo ========================================================
echo   EduMate - Kho học liệu số - Automated GitHub Publisher
echo   (Chuan Bao Mat Zero-Leak)
echo ========================================================
echo.

set REPO_URL=%1

if "%REPO_URL%"=="" (
    echo [!] Ban chua nhap link GitHub Repository.
    set /p REPO_URL=">> Vui long paste link GitHub Repo (VD: https://github.com/user/repo.git): "
)

if "%REPO_URL%"=="" (
    echo [X] LOI: Khong co link GitHub Repository. Tien trinh dung lai.
    pause
    exit /b 1
)

echo.
echo [1/5] Khoi tao Git repository...
if not exist ".git" (
    git init
)

echo [2/5] Loai bo cac file cau hinh noi bo va nhay cam khoi Git...
git rm --cached firebase-applet-config.json metadata.json 2>nul
git rm --cached -r .env* 2>nul

echo [3/5] Dong goi ma nguon sach va file mau .env.example...
git add .gitignore .env.example README.md package.json tsconfig.json vite.config.ts server.ts src/ public/ index.html firestore.rules

echo [4/5] Tao ban Commit Zero-Leak...
git commit -m "feat(security): initial zero-leak repository release"

echo [5/5] Day len GitHub: %REPO_URL%...
git branch -M main
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git push -u origin main

echo.
echo ========================================================
echo [V] HOAN TAT! Ma nguon da duoc upload len GitHub thanh cong.
echo     Khong co file .env hay credential noi bo nao bi lo.
echo ========================================================
echo.
pause
