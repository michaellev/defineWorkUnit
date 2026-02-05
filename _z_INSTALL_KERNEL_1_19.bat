@echo off
setlocal

:: ====================================================
:: CONFIGURATION
:: ====================================================
:: Change this version to match your ExB version needs
:: EXB 1.14 - nodeje 18.20.2 , EXB 1.17 or 1.19 - nodeje 22.2.0
set NODE_VERSION=22.2.0

:: ====================================================
:: SYSTEM PATHS
:: ====================================================
set NVM_ROOT=C:\Users\michaell\DevTools\nvm
set TARGET_NODE=%NVM_ROOT%\v%NODE_VERSION%

:: Check if Node version exists
if not exist "%TARGET_NODE%" (
    echo.
    echo [CRITICAL ERROR]
    echo Node version %NODE_VERSION% was not found in:
    echo %TARGET_NODE%
    echo.
    echo SOLUTION:
    echo Please open a terminal and run: nvm install %NODE_VERSION%
    echo.
    pause
    exit /b
)

:: Inject Node into PATH
echo Setting Node version to %NODE_VERSION%...
set PATH=%TARGET_NODE%;%PATH%

:: Verify Node Version
echo.
echo Current Node Version:
node -v
echo.

:: ====================================================
:: *** TIKUN: DISABLE SSL STRICTNESS ***
:: ====================================================
echo.
echo Configuring NPM to work behind Corporate Proxy...
call npm config set strict-ssl false
echo SSL Strictness disabled.
echo.

echo ==========================================
echo [1/2] Installing SERVER dependencies...
echo (This will still take time, but errors should be gone)
echo ==========================================
cd server
call npm ci --verbose
if %ERRORLEVEL% NEQ 0 (
    echo Error installing server deps!
    pause
    exit /b
)
cd ..

echo.
echo ==========================================
echo [2/2] Installing CLIENT dependencies...
echo (This will still take time, but errors should be gone)
echo ==========================================
cd client
call npm ci --verbose
if %ERRORLEVEL% NEQ 0 (
    echo Error installing client deps!
    pause
    exit /b
)
cd ..

echo.
echo DONE! All dependencies installed successfully.
:: pause