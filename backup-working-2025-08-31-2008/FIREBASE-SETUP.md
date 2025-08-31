# 🔥 Firebase Setup Guide for NEEX Social Media App

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name your project: **neex-social**
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Setup Firestore Database

1. In your Firebase project, go to **Build** → **Firestore Database**
2. Click "Create database"
3. Choose **Start in test mode** (for now)
4. Select your preferred location
5. Click "Done"

## Step 3: Setup Authentication (Optional)

1. Go to **Build** → **Authentication**
2. Click "Get started"
3. Go to **Sign-in method** tab
4. Enable **Email/Password** authentication
5. Click "Save"

## Step 4: Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" → Web app icon (</>)
4. Register app name: **neex-social-web**
5. Copy the configuration object

## Step 5: Update Firebase Config

Replace the configuration in `backend/firebase-config.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "neex-social-12345.firebaseapp.com",
  projectId: "neex-social-12345",
  storageBucket: "neex-social-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

## Step 6: Set Environment Variable

Create a `.env` file in your backend folder:

```env
FIREBASE_PROJECT_ID=neex-social-12345
NODE_ENV=production
```

## Step 7: Setup Firestore Security Rules

In Firebase Console, go to **Firestore Database** → **Rules** and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Step 8: Start Your Server

```bash
cd backend
npm start
```

You should see:
```
🚀 NEEX Backend running on port 5001
🔥 Database: FIREBASE
📊 Status: 🔥 Active
```

## Firebase Features You Get:

### ✅ **Real-time Database**
- Instant data synchronization
- No server restarts needed
- Data persists forever

### ✅ **Automatic Scaling**
- Handles unlimited users
- Global CDN
- 99.99% uptime

### ✅ **Built-in Security**
- Authentication system
- Security rules
- Data validation

### ✅ **Analytics & Monitoring**
- Real-time usage stats
- Performance monitoring
- Error tracking

## Database Structure:

```
neex-social (Firebase Project)
├── users/
│   ├── {userId}/
│   │   ├── username: "john"
│   │   ├── name: "John Doe"
│   │   ├── email: "john@example.com"
│   │   └── ...
├── posts/
│   ├── {postId}/
│   │   ├── username: "john"
│   │   ├── content: "Hello world!"
│   │   ├── likes: ["alice", "bob"]
│   │   └── ...
└── messages/
    ├── {messageId}/
    │   ├── from: "alice"
    │   ├── to: "bob"
    │   └── content: "Hey there!"
```

## Troubleshooting:

### Problem: "Firebase not configured"
**Solution**: Make sure you've updated the `firebaseConfig` object with your actual Firebase credentials.

### Problem: "Permission denied"
**Solution**: Check your Firestore security rules. For development, use the permissive rules above.

### Problem: "Project not found"
**Solution**: Verify your `FIREBASE_PROJECT_ID` environment variable matches your actual Firebase project ID.

## Next Steps:

1. **Deploy to Vercel/Netlify** - Firebase works perfectly with static hosting
2. **Add real-time features** - Use Firebase's real-time listeners
3. **Implement push notifications** - Firebase Cloud Messaging
4. **Add file storage** - Firebase Storage for images/videos

## Cost:

- **Spark Plan (Free)**: Perfect for development and small apps
- **Blaze Plan (Pay-as-you-go)**: Only pay for what you use
- **Generous free tier**: 50K reads/day, 20K writes/day

Your NEEX app is now ready for Firebase! 🚀
