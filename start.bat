@echo off
echo Starting Neex Social Platform...
echo.

echo Backend: Using Railway Production Server
echo https://neex-social-fresh-production.up.railway.app

echo Starting frontend server...
start cmd /k "cd frontend && python -m http.server 8080"

echo.
echo ✅ Neex Social is starting up!
echo Frontend: http://localhost:8080
echo Backend: https://neex-social-fresh-production.up.railway.app
echo.
pause
