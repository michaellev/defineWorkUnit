@echo off
setlocal

:: ====================================================
:: CONFIGURATION
:: ====================================================
:: Change this version to match your ExB version needs
:: EXB 1.14 - nodeje 18.20.2 , EXB 1.17 or 1.19 - nodeje 22.2.0
set NODE_VERSION=22.2.0

:: ====================================================
:: PATHS (Do not edit)
:: ====================================================
set NVM_ROOT=C:\Users\michaell\DevTools\nvm
set GIT_BASH="C:\Program Files\Git\git-bash.exe"
set TARGET_NODE=%NVM_ROOT%\v%NODE_VERSION%

:: ====================================================
:: EXECUTION LOGIC
:: ====================================================

:: 1. Check if Git Bash exists
if not exist %GIT_BASH% (
    echo [ERROR] Git Bash not found at: %GIT_BASH%
    pause
    exit /b
)

:: 2. Check if Node version exists
if not exist "%TARGET_NODE%" (
    echo [ERROR] Node version %NODE_VERSION% not found in %NVM_ROOT%
    pause
    exit /b
)

:: 3. Inject Node to PATH
set PATH=%TARGET_NODE%;%PATH%

echo.
echo Starting CLIENT on Node v%NODE_VERSION%
echo.

:: 4. Launch Git Bash -> Go to 'client' folder -> Run npm start -> Keep window open
start "" %GIT_BASH% -c "cd client && npm start; exec bash"