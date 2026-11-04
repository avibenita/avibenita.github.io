@echo off
setlocal
cd /d "%~dp0"
echo Independent Means automatic video workflow
echo Working directory: %CD%
echo.
call npm run video:auto -- --module independent-means
set ERR=%ERRORLEVEL%
echo.
echo Exit code: %ERR%
echo The window stays open so the result or the setup message can be read.
pause
endlocal & exit /b %ERR%
