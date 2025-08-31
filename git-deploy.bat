@echo off
echo Starting Git deployment...

cd /d "c:\Users\akash\OneDrive - Amity University\Desktop\SM app"

echo Adding all files to git...
git add .

echo Committing changes...
git commit -m "feat: Enhanced social media platform with comprehensive features

✨ Major Features Implemented:
- 📱 Stories System: 24-hour expiring stories with media support
- 🎥 Live Streaming: Real-time streaming with viewer interaction
- 💬 Enhanced Messaging: Real-time DMs with typing indicators
- 🏷️ Hashtags & Mentions: Advanced tagging and user discovery
- 🔍 Advanced Search: Multi-faceted search with filters
- 🔄 Share/Repost: Content sharing with attribution
- 💭 Nested Comments: Threaded comment discussions
- 📤 Media Uploads: Image/video uploads with optimization
- 🔔 Real-time Notifications: Live updates via Socket.IO
- 👥 Enhanced User System: Profiles, following, verification

🎨 UI/UX Enhancements:
- Dark theme Instagram-inspired interface
- Modal authentication system
- Responsive media galleries
- Real-time status indicators
- Professional loading states

⚡ Technical Features:
- Socket.IO real-time communication
- JWT authentication & security
- Rate limiting & input validation
- Organized media upload system
- Advanced error handling
- Comprehensive logging

🚀 Complete social media platform ready for production!"

echo Pushing to GitHub...
git push

echo Deployment completed!
pause
