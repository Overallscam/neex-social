@echo off
echo Starting Neex Social Platform...
echo.

echo Starting local backend server (required for admin functionality)...
start cmd /k "cd backend && npm start"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo Starting frontend server...
start cmd /k "cd frontend && python -m http.server 8080"

echo.
echo ✅ Neex Social is starting up!
echo Frontend: http://localhost:8080
echo Backend: http://localhost:5001 (Local - Admin Functions Enabled)
echo Admin Panel: http://localhost:8080/admin.html
echo.
echo Note: Admin functionality requires local backend
echo Railway backend is used only for regular user features
echo.
pause
