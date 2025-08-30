const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Load environment variables
const { RealtimeDatabase } = require('./firebase-realtime-config'); // Firebase Realtime Database only
const app = express();
const PORT = process.env.PORT || 5001;

// Initialize Firebase Realtime Database (online only)
const database = new RealtimeDatabase();

// Enhanced CORS for global deployment
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-app.netlify.app', 'https://neex-social.netlify.app'] // Add your Netlify URL
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000', 'http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Serve static files (uploaded images)
app.use('/uploads', express.static(uploadsDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Remove in-memory arrays - now using persistent database
// let users = [...] - REMOVED
// let posts = [...] - REMOVED  
// let messages = [...] - REMOVED

let userIdCounter = 5;
let commentIdCounter = 1;
let comments = [];

// Root route
app.get('/', (req, res) => {
    const status = database.getStatus();
    res.json({ 
        message: 'NEEX Social Media API Server 🔥', 
        version: '2.0.0',
        database: status,
        endpoints: ['/posts', '/users', '/register', '/login', '/messages'],
        timestamp: new Date().toISOString()
    });
});

app.post('/register', async (req, res) => {
    const { username, password, name, email, bio } = req.body;
    
    // Validation
    if (!username || !password || !name || !email) {
        return res.status(400).json({ message: 'Username, password, name, and email are required' });
    }
    
    // Check if user already exists
    const existingUser = await database.getUserByUsername(username);
    if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Create avatar from name initials
    const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    
    // Create new user
    const newUser = {
        username,
        password, // In production, this should be hashed
        name,
        email,
        avatar,
        bio: bio || 'Hello, I\'m new to NEEX! 👋',
        verified: false,
        followers: 0,
        following: 0,
        joinDate: new Date().toISOString()
    };
    
    const savedUser = await database.addUser(newUser);
    
    if (savedUser) {
        // Return user data without password
        const { password: _, ...userResponse } = savedUser;
        res.json({ 
            message: 'Registration successful', 
            user: userResponse 
        });
    } else {
        res.status(500).json({ message: 'Failed to create user' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    
    const user = await database.getUserByUsername(username);
    if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Return user data without password
    const { password: _, ...userResponse } = user;
    res.json({ 
        message: 'Login successful', 
        user: userResponse 
    });
});

// Get user profile
app.get('/users/:username', async (req, res) => {
    const { username } = req.params;
    const user = await database.getUserByUsername(username);
    
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user data without password
    const { password: _, ...userResponse } = user;
    res.json(userResponse);
});

// Get all users (for user search/discovery)
app.get('/users', async (req, res) => {
    const users = await database.getUsers();
    const userList = users.map(({ password, ...user }) => user);
    res.json(userList);
});

// Authentication middleware
const requireAuth = async (req, res, next) => {
    const { username } = req.body;
    
    if (!username) {
        return res.status(401).json({ 
            message: 'Authentication required. Please login to post.', 
            requireLogin: true 
        });
    }
    
    // Verify user exists
    const user = await database.getUserByUsername(username);
    if (!user) {
        return res.status(401).json({ 
            message: 'Invalid user. Please login again.', 
            requireLogin: true 
        });
    }
    
    req.user = user;
    next();
};

app.post('/posts', upload.single('image'), async (req, res) => {
    const { username, content, isAnonymous } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;
    
    // Basic authentication check
    if (!username || username.trim() === '') {
        return res.status(401).json({ 
            message: '🔐 Authentication required. Please login to post.', 
            requireLogin: true 
        });
    }
    
    // Content validation
    if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Post content cannot be empty' });
    }
    
    if (content.length > 500) {
        return res.status(400).json({ message: 'Post content cannot exceed 500 characters' });
    }
    
    const newPost = {
        username: isAnonymous === 'true' ? 'Anonymous' : (username || 'Guest'),
        content: content.trim(),
        image,
        date: new Date().toISOString(),
        likes: [],
        reactions: { like: 0, heart: 0, laugh: 0 },
        isAnonymous: isAnonymous === 'true' || false,
        originalUser: isAnonymous === 'true' ? username : null // Keep track of original user for moderation
    };
    
    const savedPost = await database.addPost(newPost);
    
    if (savedPost) {
        console.log(`📝 New post created by ${isAnonymous === 'true' ? 'Anonymous' : (username || 'Guest')}: "${content.substring(0, 50)}..."`);
        res.json({ message: 'Post created successfully', post: savedPost });
    } else {
        res.status(500).json({ message: 'Failed to create post' });
    }
});

// Like/unlike post
app.post('/posts/:postId/like', (req, res) => {
    const { postId } = req.params;
    const { username } = req.body;
    
    const post = posts.find(p => p.id == postId);
    if (!post) {
        return res.status(404).json({ message: 'Post not found' });
    }
    
    const likeIndex = post.likes.indexOf(username);
    if (likeIndex > -1) {
        // Unlike
        post.likes.splice(likeIndex, 1);
        post.reactions.like--;
    } else {
        // Like
        post.likes.push(username);
        post.reactions.like++;
    }
    
    res.json({ 
        message: likeIndex > -1 ? 'Post unliked' : 'Post liked',
        likes: post.likes.length,
        reactions: post.reactions
    });
});

// Add reaction to post
app.post('/posts/:postId/react', (req, res) => {
    const { postId } = req.params;
    const { username, reaction } = req.body; // reaction: 'like', 'heart', 'laugh'
    
    const post = posts.find(p => p.id == postId);
    if (!post) {
        return res.status(404).json({ message: 'Post not found' });
    }
    
    if (!post.userReactions) {
        post.userReactions = {};
    }
    
    // Remove previous reaction if exists
    if (post.userReactions[username]) {
        const prevReaction = post.userReactions[username];
        post.reactions[prevReaction]--;
    }
    
    // Add new reaction
    post.userReactions[username] = reaction;
    post.reactions[reaction]++;
    
    res.json({ 
        message: 'Reaction added',
        reactions: post.reactions
    });
});

app.get('/posts', async (req, res) => {
    const posts = await database.getPosts();
    res.json(posts.slice(-20).reverse());
});

app.post('/messages', async (req, res) => {
    const { from, to, content } = req.body;
    const newMessage = { 
        from, 
        to, 
        content, 
        date: new Date().toISOString() 
    };
    
    const savedMessage = await database.addMessage(newMessage);
    
    if (savedMessage) {
        res.json({ message: 'Message sent', data: savedMessage });
    } else {
        res.status(500).json({ message: 'Failed to send message' });
    }
});

app.get('/messages/:user1/:user2', (req, res) => {
    const { user1, user2 } = req.params;
    const conversation = messages.filter(m => 
        (m.from === user1 && m.to === user2) || 
        (m.from === user2 && m.to === user1)
    ).slice(-50);
    res.json(conversation);
});

app.get('/users', (req, res) => {
    res.json(users.map(u => u.username));
});

// Friend request endpoints
app.post('/friend-request', (req, res) => {
    const { from, to } = req.body;
    
    // Check if already friends
    const alreadyFriends = friendships.some(f => 
        (f.user1 === from && f.user2 === to) || (f.user1 === to && f.user2 === from)
    );
    
    if (alreadyFriends) {
        return res.status(400).json({ message: 'Already friends' });
    }
    
    // Check if request already exists
    const existingRequest = friendRequests.find(r => 
        (r.from === from && r.to === to) || (r.from === to && r.to === from)
    );
    
    if (existingRequest) {
        return res.status(400).json({ message: 'Friend request already sent' });
    }
    
    friendRequests.push({ from, to, status: 'pending', date: new Date() });
    res.json({ message: 'Friend request sent' });
});

app.get('/friend-requests/:username', (req, res) => {
    const { username } = req.params;
    const requests = friendRequests.filter(r => r.to === username && r.status === 'pending');
    res.json(requests);
});

app.post('/friend-request/respond', (req, res) => {
    const { from, to, action } = req.body; // action: 'accept' or 'reject'
    
    const requestIndex = friendRequests.findIndex(r => r.from === from && r.to === to);
    
    if (requestIndex === -1) {
        return res.status(404).json({ message: 'Friend request not found' });
    }
    
    if (action === 'accept') {
        friendships.push({ user1: from, user2: to, date: new Date() });
        friendRequests[requestIndex].status = 'accepted';
        res.json({ message: 'Friend request accepted' });
    } else {
        friendRequests[requestIndex].status = 'rejected';
        res.json({ message: 'Friend request rejected' });
    }
});

// Upload avatar
app.post('/users/:username/avatar', upload.single('avatar'), (req, res) => {
    const { username } = req.params;
    const user = users.find(u => u.username === username);
    
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    
    user.avatar = `/uploads/${req.file.filename}`;
    res.json({ message: 'Avatar updated', avatar: user.avatar });
});

// Update user profile
app.put('/users/:username/profile', (req, res) => {
    const { username } = req.params;
    const { bio } = req.body;
    const user = users.find(u => u.username === username);
    
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    
    if (bio !== undefined) {
        user.bio = bio;
    }
    
    res.json({ message: 'Profile updated', user: { username: user.username, bio: user.bio, avatar: user.avatar } });
});

// Get user profile
app.get('/users/:username/profile', (req, res) => {
    const { username } = req.params;
    const user = users.find(u => u.username === username);
    
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ username: user.username, bio: user.bio, avatar: user.avatar });
});

app.get('/friends/:username', (req, res) => {
    const { username } = req.params;
    const friends = friendships
        .filter(f => f.user1 === username || f.user2 === username)
        .map(f => f.user1 === username ? f.user2 : f.user1);
    res.json(friends);
});

// Comments endpoints
app.post('/posts/:postId/comments', (req, res) => {
    const { postId } = req.params;
    const { username, content } = req.body;
    
    const post = posts.find(p => p.id == postId);
    if (!post) {
        return res.status(404).json({ message: 'Post not found' });
    }
    
    const newComment = {
        id: commentIdCounter++,
        postId: parseInt(postId),
        username,
        content,
        date: new Date(),
        likes: 0
    };
    
    comments.push(newComment);
    res.json({ message: 'Comment added', comment: newComment });
});

app.get('/posts/:postId/comments', (req, res) => {
    const { postId } = req.params;
    const postComments = comments.filter(c => c.postId == postId);
    res.json(postComments);
});

// Initialize database and start server
const startServer = async () => {
    try {
        // Initialize Firebase Realtime Database with sample data
        await database.initializeSampleData();
        
        app.listen(PORT, () => {
            console.log(`🚀 NEEX Backend running on port ${PORT}`);
            console.log(`🔥 Database: FIREBASE-REALTIME (Global Cloud)`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`� UI: Previous Interface Restored`);
            console.log(`📡 Real-time sync: ENABLED`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
