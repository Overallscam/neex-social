@echo off
echo ====================================
echo NEEX Social - Railway Deployment
echo ====================================
echo.

REM Check if Railway CLI is installed
railway --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Railway CLI not found. Please install it first:
    echo    npm install -g @railway/cli
    echo    Then login: railway login
    pause
    exit /b 1
)

echo 🚀 Starting Railway deployment...
echo.

REM Navigate to backend directory
cd /d "%~dp0backend"

REM Check if logged into Railway
echo 🔐 Checking Railway authentication...
railway whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Not logged into Railway. Please run: railway login
    pause
    exit /b 1
)

echo ✅ Railway CLI authenticated
echo.

REM Deploy to Railway
echo 📤 Deploying backend to Railway...
echo    This will update the live backend with admin functionality
echo.

railway up --detach

if %errorlevel% eq 0 (
    echo.
    echo ✅ Deployment successful!
    echo 🌐 Your backend is now live with admin functionality
    echo 📋 Admin endpoints now available:
    echo    - POST /admin/login - Admin login
    echo    - DELETE /admin/posts/:id - Delete post
    echo    - PUT /admin/posts/:id - Edit post  
    echo    - DELETE /admin/posts - Delete all posts
    echo.
    echo 🔧 Admin panel will now work on live deployment!
    echo.
    echo 💡 Test your admin panel at:
    echo    https://neex-social.netlify.app/admin.html
) else (
    echo.
    echo ❌ Deployment failed!
    echo Please check the Railway dashboard for details
)

echo.
pause