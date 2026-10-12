@echo off
chcp 65001 >nul
setlocal

echo ========================================
echo Build APK
echo ========================================

set "SCORER=E:\others\Mini-Program\Scorer"
set "CORDOVA=E:\others\Mini-Program\Score"
set "WWW=%CORDOVA%\www"
set "NODEPROJ=%WWW%\nodejs-project"
set "PLATFORM_WWW=%CORDOVA%\platforms\android\platform_www"
set "ANDROID_BUILD_DIR=%CORDOVA%\platforms\android\app\build"

cd /d "%SCORER%"

echo.
echo [1/7] Build H5...
call npm run build:h5
if errorlevel 1 (
  echo [ERROR] H5 build failed
  pause
  exit /b 1
)

echo.
echo [2/7] Clean Cordova www app output...
if exist "%WWW%\assets" rmdir /s /q "%WWW%\assets"
if exist "%WWW%\build" rmdir /s /q "%WWW%\build"
if exist "%WWW%\index.html" del /f /q "%WWW%\index.html"
if exist "%WWW%\start-nodejs.js" del /f /q "%WWW%\start-nodejs.js"
if exist "%NODEPROJ%" rmdir /s /q "%NODEPROJ%"

echo.
echo [3/7] Copy dist to Cordova www...
xcopy /E /I /Y "%SCORER%\dist\*" "%WWW%\"

echo.
echo [4/7] Prepare embedded Node project...
mkdir "%NODEPROJ%"
copy /Y "%SCORER%\server\embedded-server.js" "%NODEPROJ%\embedded-server.js"
xcopy /E /I /Y "%SCORER%\dist\*" "%NODEPROJ%\dist\"

echo const EmbeddedServer = require^('./embedded-server.js'^);> "%NODEPROJ%\main.js"
echo const server = new EmbeddedServer^(^);>> "%NODEPROJ%\main.js"
echo server.start^(^);>> "%NODEPROJ%\main.js"
echo process.on^('SIGTERM', ^(^) =^> { server.stop^(^); process.exit^(0^); }^);>> "%NODEPROJ%\main.js"

(
echo {
echo   "name": "scorer-embedded-server",
echo   "version": "1.0.0",
echo   "description": "Embedded Node.js server for Scorer app",
echo   "main": "main.js",
echo   "dependencies": {
echo     "ws": "^8.19.0"
echo   }
echo }
) > "%NODEPROJ%\package.json"

echo.
echo [4/7] Copy ws dependency...
if not exist "%NODEPROJ%\node_modules" mkdir "%NODEPROJ%\node_modules"
xcopy /E /I /Y "%SCORER%\server\node_modules\ws\*" "%NODEPROJ%\node_modules\ws\"

(
echo window.__SCORER_EMBEDDED_RUNTIME__ = true;
echo window.nodejsStarting = false;
echo window.nodejsReady = false;
echo window.nodejsServerReady = false;
echo window.nodejsServerInfo = null;
echo window.nodejsLastError = null;
echo window.nodejsLastErrorMessage = '';
echo document.addEventListener^('deviceready', function^(^) {
echo   window.nodejsStarting = true;
echo   window.nodejsServerReady = false;
echo   window.nodejsLastError = null;
echo   window.nodejsLastErrorMessage = '';
echo   if ^(typeof nodejs === 'undefined'^) {
echo     window.nodejsStarting = false;
echo     window.nodejsLastErrorMessage = 'nodejs-mobile-cordova plugin not found';
echo     document.dispatchEvent^(new CustomEvent^('nodejs-unavailable'^, { detail: { message: window.nodejsLastErrorMessage } }^)^);
echo     console.error^('nodejs-mobile-cordova plugin not found'^);
echo     return;
echo   }
echo   if ^(nodejs.channel ^&^& typeof nodejs.channel.on === 'function'^) {
echo     nodejs.channel.on^('server-started', function^(msg^) {
echo       window.nodejsServerReady = true;
echo       window.nodejsServerInfo = msg;
echo       document.dispatchEvent^(new CustomEvent^('nodejs-server-ready'^, { detail: msg }^)^);
echo       console.log^('Embedded server reported ready', msg^);
echo     }^);
echo   }
echo   nodejs.start^('main.js', function^(err^) {
echo     window.nodejsStarting = false;
echo     if ^(err^) {
echo       window.nodejsLastError = err;
echo       window.nodejsLastErrorMessage = err ^&^& err.message ? err.message : String^(err^);
echo       console.error^('Failed to start Node.js:', err^);
echo       document.dispatchEvent^(new CustomEvent^('nodejs-error'^, { detail: { message: window.nodejsLastErrorMessage } }^)^);
echo       return;
echo     }
echo     window.nodejsReady = true;
echo     window.nodejsLastError = null;
echo     window.nodejsLastErrorMessage = '';
echo     document.dispatchEvent^(new CustomEvent^('nodejs-ready'^)^);
echo     console.log^('Node.js server started'^);
echo   }^);
echo } , false^);
) > "%WWW%\start-nodejs.js"

echo Inject scripts into index.html...
node "%SCORER%\scripts\inject-cordova-head.js" "%WWW%\index.html"
if errorlevel 1 (
  echo [ERROR] inject-cordova-head.js failed
  pause
  exit /b 1
)
echo Ensure Android platform has nodejs-mobile-cordova native binding...
node "%SCORER%\scripts\ensure-cordova-nodejs-plugin.js" "%CORDOVA%"
if errorlevel 1 (
  echo [ERROR] ensure-cordova-nodejs-plugin.js failed
  pause
  exit /b 1
)

echo.
echo [5/7] Clean stale Android platform web assets...
if exist "%PLATFORM_WWW%\assets" rmdir /s /q "%PLATFORM_WWW%\assets"
if exist "%PLATFORM_WWW%\build" rmdir /s /q "%PLATFORM_WWW%\build"
if exist "%PLATFORM_WWW%\nodejs-project" rmdir /s /q "%PLATFORM_WWW%\nodejs-project"
if exist "%PLATFORM_WWW%\static" rmdir /s /q "%PLATFORM_WWW%\static"
if exist "%PLATFORM_WWW%\index.html" del /f /q "%PLATFORM_WWW%\index.html"
if exist "%PLATFORM_WWW%\start-nodejs.js" del /f /q "%PLATFORM_WWW%\start-nodejs.js"
if exist "%PLATFORM_WWW%\test.html" del /f /q "%PLATFORM_WWW%\test.html"
if exist "%ANDROID_BUILD_DIR%" rmdir /s /q "%ANDROID_BUILD_DIR%"

echo.
echo [6/7] Cordova prepare android...
cd /d "%CORDOVA%"
echo Patch Cordova config for status bar...
"C:\Program Files\PowerShell\7\pwsh.exe" -ExecutionPolicy Bypass -File "%SCORER%\scripts\patch-cordova-config.ps1" "%CORDOVA%\config.xml"
call cordova prepare android
if errorlevel 1 (
  echo [ERROR] cordova prepare android failed
  pause
  exit /b 1
)

echo Re-apply Android platform repairs after prepare...
node "%SCORER%\scripts\ensure-cordova-nodejs-plugin.js" "%CORDOVA%"
if errorlevel 1 (
  echo [ERROR] post-prepare ensure-cordova-nodejs-plugin.js failed
  pause
  exit /b 1
)

echo Patch Android activity system bar styling...
"C:\Program Files\PowerShell\7\pwsh.exe" -ExecutionPolicy Bypass -File "%SCORER%\scripts\patch-android-ui.ps1" "%CORDOVA%\platforms\android\app\src\main\java\com\example\scorer\MainActivity.java"
if errorlevel 1 (
  echo [ERROR] patch-android-ui.ps1 failed
  pause
  exit /b 1
)

echo Apply Android branding assets...
"C:\Program Files\PowerShell\7\pwsh.exe" -ExecutionPolicy Bypass -File "%SCORER%\scripts\apply-android-branding.ps1" "%SCORER%\qipai.png" "%CORDOVA%\platforms\android\app\src\main\res"
if errorlevel 1 (
  echo [ERROR] apply-android-branding.ps1 failed
  pause
  exit /b 1
)
echo Apply Android template branding assets...
"C:\Program Files\PowerShell\7\pwsh.exe" -ExecutionPolicy Bypass -File "%SCORER%\scripts\apply-android-branding.ps1" "%SCORER%\qipai.png" "%CORDOVA%\node_modules\cordova-android\templates\project\res"
if errorlevel 1 (
  echo [ERROR] apply-android-branding.ps1 failed on cordova template
  pause
  exit /b 1
)
echo Write Android themes...
"C:\Program Files\PowerShell\7\pwsh.exe" -ExecutionPolicy Bypass -File "%SCORER%\scripts\write-android-themes.ps1" "%CORDOVA%\platforms\android\app\src\main\res\values\themes.xml"
if errorlevel 1 (
  echo [ERROR] write-android-themes.ps1 failed on platform themes
  pause
  exit /b 1
)
"C:\Program Files\PowerShell\7\pwsh.exe" -ExecutionPolicy Bypass -File "%SCORER%\scripts\write-android-themes.ps1" "%CORDOVA%\node_modules\cordova-android\templates\project\res\values\themes.xml"
if errorlevel 1 (
  echo [ERROR] write-android-themes.ps1 failed on template themes
  pause
  exit /b 1
)

echo.
echo [7/7] Build Android APK...
call cordova build android
if errorlevel 1 (
  echo [ERROR] cordova build android failed
  pause
  exit /b 1
)

if exist "platforms\android\app\build\outputs\apk\debug\app-debug.apk" (
  echo.
  echo ========================================
  echo Build finished.
  echo APK: %CORDOVA%\platforms\android\app\build\outputs\apk\debug\app-debug.apk
  echo ========================================
) else (
  echo [ERROR] APK not found after build
)
pause
