@echo off
echo Installing dependencies with fixed versions...
echo.

echo Cleaning up previous installation...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json

echo.
echo Running npm install...
call npm install

echo.
echo Dependencies installation completed!
echo.
pause
