const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
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

let users = [
    { username: 'john', password: '123', avatar: null, bio: 'Hello! I\'m John 👋' },
    { username: 'alice', password: '123', avatar: null, bio: 'Love coffee and books ☕📚' },
    { username: 'bob', password: '123', avatar: null, bio: 'Tech enthusiast 💻' },
    { username: 'sarah', password: '123', avatar: null, bio: 'Designer & creator 🎨' }
];
let posts = [
    { 
        id: 1, username: 'john', content: 'Hello everyone! This is my first post 👋', 
        date: new Date('2025-08-25T10:00:00'), image: null, likes: ['alice'], reactions: { like: 1, heart: 0, laugh: 0 }
    },
    { 
        id: 2, username: 'alice', content: 'Beautiful day today! ☀️', 
        date: new Date('2025-08-25T11:30:00'), image: null, likes: ['john', 'bob'], reactions: { like: 2, heart: 0, laugh: 0 }
    },
    { 
        id: 3, username: 'bob', content: 'Just finished reading a great book 📚', 
        date: new Date('2025-08-25T12:15:00'), image: null, likes: ['sarah'], reactions: { like: 1, heart: 0, laugh: 0 }
    },
    { 
        id: 4, username: 'sarah', content: 'Working on an exciting new project! 💻', 
        date: new Date('2025-08-25T13:45:00'), image: null, likes: [], reactions: { like: 0, heart: 0, laugh: 0 }
    },
    { 
        id: 5, username: 'john', content: 'Anyone want to grab coffee later? ☕', 
        date: new Date('2025-08-25T14:20:00'), image: null, likes: ['alice'], reactions: { like: 1, heart: 0, laugh: 0 }
    }
];
let messages = [
    { from: 'john', to: 'alice', content: 'Hey Alice, how are you?', date: new Date('2025-08-25T09:00:00') },
    { from: 'alice', to: 'john', content: 'Hi John! I\'m doing great, thanks for asking!', date: new Date('2025-08-25T09:05:00') },
    { from: 'bob', to: 'sarah', content: 'Did you see the latest project updates?', date: new Date('2025-08-25T10:30:00') },
    { from: 'sarah', to: 'bob', content: 'Yes! They look amazing. Great work!', date: new Date('2025-08-25T10:35:00') }
];
let friendRequests = [
    { from: 'bob', to: 'john', status: 'pending', date: new Date('2025-08-25T08:00:00') }
];
let friendships = [
    { user1: 'john', user2: 'alice', date: new Date('2025-08-24T12:00:00') },
    { user1: 'bob', user2: 'sarah', date: new Date('2025-08-24T15:30:00') }
];

let postIdCounter = 6;
let commentIdCounter = 1;
let comments = [];

// Root route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Neex Social Backend API is running!', 
        version: '1.0.0',
        endpoints: ['/posts', '/users', '/register', '/login', '/messages']
    });
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ message: 'User already exists' });
    }
    users.push({ username, password });
    res.json({ message: 'Registered successfully' });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json({ message: 'Login successful' });
});

app.post('/posts', upload.single('image'), (req, res) => {
    const { username, content, isAnonymous } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;
    
    const newPost = {
        id: postIdCounter++,
        username: isAnonymous ? 'Anonymous' : username,
        content,
        image,
        date: new Date(),
        likes: [],
        reactions: { like: 0, heart: 0, laugh: 0 },
        isAnonymous: isAnonymous || false,
        originalUser: isAnonymous ? username : null // Keep track of original user for moderation
    };
    
    posts.push(newPost);
    res.json({ message: 'Post created', post: newPost });
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

app.get('/posts', (req, res) => {
    res.json(posts.slice(-20).reverse());
});

app.post('/messages', (req, res) => {
    const { from, to, content } = req.body;
    messages.push({ from, to, content, date: new Date() });
    res.json({ message: 'Message sent' });
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



app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
