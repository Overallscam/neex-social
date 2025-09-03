@echo off
echo Starting Neex Social Platform...
echo.

echo Starting backend server...
start cmd /k "cd backend && npm install && node server.js"

echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo Starting frontend server...
start cmd /k "cd frontend && python -m http.server 8080"

echo.
echo ✅ Neex Social is starting up!
echo Frontend: http://localhost:8080
echo Backend: http://localhost:5001
echo.
pause
