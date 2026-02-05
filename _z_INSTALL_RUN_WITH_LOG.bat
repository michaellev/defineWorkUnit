@echo off
setlocal

:: =========================================================
:: 1. הגדרות - כאן אתה קובע את שם הקובץ פעם אחת בלבד
:: =========================================================
set LOG_FILE=Z1_INSTALL_RUN_WITH_LOG.txt
set INSTALL_SCRIPT=Z1_INSTALL_KERNEL_1_19.bat

:: =========================================================
:: 2. ביצוע (אל תיגע בחלק זה)
:: =========================================================

echo Starting installation... 
echo Output will be displayed on screen and saved to: %LOG_FILE%
echo.

:: בדיקה שקובץ ההתקנה קיים
if not exist "%INSTALL_SCRIPT%" (
    echo Error: The script "%INSTALL_SCRIPT%" was not found.
    pause
    exit /b
)

:: הרצת הפקודה עם שילוב המשתנים שהגדרת למעלה
powershell -Command ".\%INSTALL_SCRIPT% | Tee-Object -FilePath '%LOG_FILE%'"

:: התיקון: שימוש ב-cmd /c וב-2>&1 כדי ללכוד גם את ה-verbose
::powershell -Command "cmd /c .\%INSTALL_SCRIPT% 2>&1 | Tee-Object -FilePath '%LOG_FILE%'"

echo.
echo ---------------------------------------------------
echo Process finished. Log saved to: %LOG_FILE%
echo ---------------------------------------------------
pause