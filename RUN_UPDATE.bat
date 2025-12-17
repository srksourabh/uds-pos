@echo off
echo ========================================
echo   UDS-POS Responsive Update
echo ========================================
echo.
echo This will update all 39 pages with responsive classes
echo.
pause

cd /d "%~dp0"

echo Running Python script...
python bulk_update_responsive.py

echo.
echo ========================================
echo   UPDATE COMPLETE!
echo ========================================
echo.
echo Next steps:
echo 1. Test: npm run dev
echo 2. Commit: git add src/pages/
echo 3. Commit: git commit -m "feat: Make all pages responsive"
echo 4. Push: git push origin main
echo.
pause
