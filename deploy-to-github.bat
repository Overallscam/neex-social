@echo off
echo ====================================
echo   NEEX Social Media Platform
echo   Git Deployment Script
echo ====================================
echo.

:: Navigate to project directory
cd /d "c:\Users\akash\OneDrive - Amity University\Desktop\SM app"
echo Current directory: %cd%
echo.

:: Check if git is initialized
if not exist ".git" (
    echo Initializing git repository...
    git init
    echo.
)

:: Check current git status
echo Checking git status...
git status
echo.

:: Check if remote exists
echo Checking remote configuration...
git remote -v
echo.

:: Add remote if it doesn't exist
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo Adding GitHub remote...
    git remote add origin https://github.com/Overallscam/neex-social.git
    echo Remote added successfully!
    echo.
) else (
    echo Remote already exists, updating...
    git remote set-url origin https://github.com/Overallscam/neex-social.git
    echo.
)

:: Configure git user (if not already configured)
git config --global user.name >nul 2>&1
if errorlevel 1 (
    echo Please configure git user:
    set /p username="Enter your GitHub username: "
    set /p email="Enter your GitHub email: "
    git config --global user.name "%username%"
    git config --global user.email "%email%"
)

:: Add all files
echo Adding all files to git...
git add .
echo Files added successfully!
echo.

:: Commit with comprehensive message
echo Committing changes...
git commit -m "feat: Complete Social Media Platform with Advanced Features

✨ MAJOR FEATURES IMPLEMENTED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎬 CONTENT FEATURES:
• 📱 Stories System - 24h expiring stories with media support
• 🎥 Live Streaming - Real-time streaming with viewer interaction  
• 📸 Media Uploads - Image/video uploads with automatic optimization
• 🔄 Share/Repost - Content sharing with proper attribution
• 💭 Nested Comments - Threaded comment discussions
• ❤️ Reactions System - Like, love, laugh, angry reactions

💬 MESSAGING & SOCIAL:
• 💬 Enhanced Direct Messaging - Real-time DMs with typing indicators
• 🏷️ Hashtags & Mentions - Advanced tagging and user discovery
• 🔍 Advanced Search - Multi-faceted search with smart filters
• 👥 Follow System - Enhanced user connections and networking
• 🔔 Real-time Notifications - Live updates via Socket.IO
• 📧 Email Verification - Secure account verification system

🎨 UI/UX ENHANCEMENTS:
• 🌙 Dark Theme - Instagram-inspired modern interface
• 📱 Responsive Design - Mobile-first responsive layouts
• 🎭 Modal Authentication - Seamless login/register experience
• ⚡ Loading States - Professional loading indicators
• 🖼️ Media Galleries - Beautiful image/video presentations
• 💫 Animations - Smooth transitions and interactions

⚡ TECHNICAL ARCHITECTURE:
• 🔌 Socket.IO Integration - Real-time bidirectional communication
• 🔐 JWT Authentication - Secure token-based authentication
• 🛡️ Rate Limiting - Protection against abuse and spam
• 📊 Advanced Logging - Comprehensive system monitoring
• 🗂️ Organized Structure - Clean file organization and uploads
• ⚙️ Error Handling - Robust error management and recovery

🚀 DEPLOYMENT READY:
• 📦 Complete package dependencies
• 🔧 Production configurations
• 📝 Comprehensive documentation
• 🧪 Tested and validated features
• 🌐 Ready for production deployment

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Built with ❤️ - A complete social media platform
Date: September 1, 2025"

if errorlevel 1 (
    echo Error committing changes!
    pause
    exit /b 1
) else (
    echo Changes committed successfully!
    echo.
)

:: Push to GitHub
echo Pushing to GitHub...
echo This may take a moment for the initial push...
git push -u origin master

if errorlevel 1 (
    echo.
    echo ❌ Push failed! This might be due to:
    echo    1. Authentication required
    echo    2. Repository doesn't exist
    echo    3. Permission issues
    echo.
    echo Please check:
    echo • GitHub repository exists: https://github.com/Overallscam/neex-social
    echo • You have push access to the repository
    echo • Your GitHub credentials are configured
    echo.
    echo You can also try pushing manually with:
    echo git push -u origin master
    echo.
) else (
    echo.
    echo ✅ SUCCESS! Your NEEX Social Media Platform has been deployed!
    echo.
    echo 🌐 Repository: https://github.com/Overallscam/neex-social
    echo 🚀 All features have been successfully pushed to GitHub
    echo.
    echo Your platform includes:
    echo • Complete social media functionality
    echo • Real-time messaging and notifications
    echo • Stories, live streaming, and media uploads
    echo • Advanced search and user management
    echo • Professional UI with dark theme
    echo.
)

echo.
echo Press any key to close...
pause >nul
