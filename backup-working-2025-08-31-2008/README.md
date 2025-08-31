# 🚀 Neex Social - Advanced Social Media Platform

A modern, feature-rich social media platform built with React and Express.js, deployable as both a web app and mobile APK.

![Neex Social](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Mobile-orange)

## ✨ Features

### 🎯 Core Features
- **User Authentication** - Secure login/registration system
- **Post Creation** - Text, images, and multimedia posts
- **Real-time Interactions** - Like, comment, and share functionality
- **Dark/Light Themes** - Toggle between modern themes
- **Progressive Web App** - Install like a native app

### 🚀 Advanced Features
- **Rich Text Editor** - Bold, italic, and link formatting
- **Voice Messages** - Audio recording and playback
- **Image Uploads** - Drag & drop image sharing
- **Emoji Picker** - Express yourself with emojis
- **User Mentions** - @username autocompletion
- **Hashtag Support** - #trending topics
- **Stories Feature** - 24-hour temporary posts
- **Direct Messages** - Private messaging system
- **Push Notifications** - Real-time alerts
- **Advanced Filters** - Sort by date, type, popularity
- **User Verification** - Blue checkmark badges
- **Responsive Design** - Mobile-first approach

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **HTML5/CSS3** - Semantic markup and styling
- **Service Worker** - Offline functionality
- **PWA Manifest** - App-like experience

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **Multer** - File upload handling
- **CORS** - Cross-origin requests

### Mobile
- **Cordova/PhoneGap** - Hybrid mobile app framework
- **PWA** - Progressive Web App capabilities

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- Python 3.x (for development server)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/neex-social.git
   cd neex-social
   ```

2. **Start the backend server**
   ```bash
   cd backend
   npm install
   node server.js
   ```

3. **Start the frontend**
   ```bash
   cd frontend
   python -m http.server 8080
   ```

4. **Access the app**
   - Open http://localhost:8080
   - Backend API: http://localhost:5001

## 📱 Mobile App Setup

### PWA Installation (Recommended)
1. Open the web app on your mobile device
2. Tap the browser menu (⋮)
3. Select "Add to Home Screen" or "Install App"
4. Enjoy the native app experience!

### APK Build (Android)
```bash
# Install Cordova
npm install -g cordova

# Navigate to mobile app
cd mobile-app

# Add Android platform
cordova platform add android

# Build APK
cordova build android
```

## 🌐 Deployment

### Free Hosting Options

#### **Netlify** (Recommended for Frontend)
1. Drag & drop the `frontend` folder to [netlify.com](https://netlify.com)
2. Your app is live instantly!
3. Custom domain: `yourapp.netlify.app`

#### **Railway** (Recommended for Backend)
1. Push your code to GitHub
2. Connect to [railway.app](https://railway.app)
3. Auto-deploy on every commit

#### **Other Options**
- **Vercel** - Frontend hosting
- **Heroku** - Full-stack hosting
- **GitHub Pages** - Static site hosting
- **Firebase Hosting** - Google's hosting platform

### Environment Variables
Create a `.env` file in the backend directory:
```env
PORT=5001
NODE_ENV=production
```

## 🏗️ Project Structure

```
neex-social/
├── 📱 frontend/              # React web application
│   ├── index.html           # Main application file
│   ├── manifest.json        # PWA manifest
│   ├── sw.js               # Service worker
│   └── ICONS-NEEDED.md     # Icon setup guide
├── 🔧 backend/              # Express.js API server
│   ├── server.js           # Main server file
│   ├── package.json        # Node.js dependencies
│   └── uploads/            # File upload directory
├── 📱 mobile-app/           # Cordova mobile setup
│   ├── config.xml          # Mobile app configuration
│   ├── package.json        # Build dependencies
│   └── www/                # Mobile app files
├── 📋 DEPLOYMENT.md         # Detailed deployment guide
├── 🚀 deploy.bat           # Quick deployment script
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## 🎨 Sample Login Credentials

For testing, you can use any username and password. The app includes demo data:

| Username | Password |
|----------|----------|
| demo_user | any      |
| test_user | any      |

## 🔧 Development

### Adding New Features
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### API Endpoints
- `GET /api/posts` - Fetch all posts
- `POST /api/posts` - Create new post
- `POST /api/upload` - Upload media files
- `GET /api/users` - Get user list

## 🐛 Known Issues
- Voice recording requires HTTPS in production
- File uploads limited to 10MB
- PWA requires icons for full functionality

## 🤝 Contributing

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- React team for the amazing UI library
- Font Awesome for beautiful icons
- All contributors and testers

---

**Built with ❤️**

⭐ **Star this repo if you found it helpful!**
