const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
app.use(cors({
    origin: ['http://localhost:3000', 'https://neex-57c2e.web.app', 'https://neex-57c2e.firebaseapp.com'],
    credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Email configuration
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// Email helper functions
const sendEmail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER || 'your-email@gmail.com',
            to,
            subject,
            html
        });
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
};

const generateEmailTemplate = (title, message, actionUrl, actionText) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌟 NEEX Social</h1>
                <h2>${title}</h2>
            </div>
            <div class="content">
                <p>${message}</p>
                ${actionUrl ? `<a href="${actionUrl}" class="button">${actionText}</a>` : ''}
                <p>If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 NEEX Social. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Images only!'));
        }
    }
});

// In-memory storage for quick operations
let comments = [];
let messages = [];

// Enhanced User Registration with Email Verification
app.post('/register', async (req, res) => {
    const { username, password, email, name } = req.body;
    
    // Validation
    if (!username || !password || !email) {
        return res.status(400).json({ message: 'Username, password, and email are required' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    
    try {
        // Check if user already exists
        const existingUser = await database.getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        
        const existingEmail = await database.getUserByEmail(email);
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        // Create user
        const newUser = {
            username,
            password: hashedPassword,
            name: name || username.charAt(0).toUpperCase() + username.slice(1),
            email,
            avatar: username.substring(0, 2).toUpperCase(),
            bio: 'New to Neex Social! 🌟',
            verified: false,
            emailVerified: false,
            verificationToken,
            followers: [],
            following: [],
            followerCount: 0,
            followingCount: 0,
            posts: 0,
            privacySettings: {
                profileVisibility: 'public',
                followersVisible: true,
                emailVisible: false
            },
            joinDate: new Date().toISOString()
        };
        
        const savedUser = await database.addUser(newUser);
        
        if (savedUser) {
            // Send verification email
            const verificationUrl = `http://localhost:3000/verify-email?token=${verificationToken}`;
            const emailSent = await sendEmail(
                email,
                'Verify Your NEEX Account',
                generateEmailTemplate(
                    'Email Verification',
                    `Welcome to NEEX Social, ${name || username}! Please verify your email address to complete your registration.`,
                    verificationUrl,
                    'Verify Email'
                )
            );
            
            const { password: _, verificationToken: __, ...userResponse } = savedUser;
            res.json({ 
                message: 'Registration successful! Please check your email to verify your account.',
                user: userResponse,
                emailSent
            });
        } else {
            res.status(500).json({ message: 'Failed to create user' });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed' });
    }
});

// Email Verification
app.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    
    if (!token) {
        return res.status(400).json({ message: 'Verification token is required' });
    }
    
    try {
        const users = await database.getUsers();
        const user = users.find(u => u.verificationToken === token);
        
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }
        
        const updatedUser = {
            ...user,
            emailVerified: true,
            verificationToken: null
        };
        
        await database.updateUser(user.username, updatedUser);
        
        res.json({ message: 'Email verified successfully!' });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ message: 'Email verification failed' });
    }
});

// Password Reset Request
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    
    try {
        const user = await database.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email address' });
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
        
        const updatedUser = {
            ...user,
            passwordResetToken: resetToken,
            passwordResetExpiry: resetTokenExpiry.toISOString()
        };
        
        await database.updateUser(user.username, updatedUser);
        
        // Send reset email
        const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
        const emailSent = await sendEmail(
            email,
            'Password Reset Request',
            generateEmailTemplate(
                'Password Reset',
                `Hello ${user.name}, you requested to reset your password. Click the button below to reset it. This link will expire in 1 hour.`,
                resetUrl,
                'Reset Password'
            )
        );
        
        res.json({ message: 'Password reset email sent successfully', emailSent });
    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ message: 'Failed to process password reset request' });
    }
});

// Password Reset
app.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    try {
        const users = await database.getUsers();
        const user = users.find(u => 
            u.passwordResetToken === token && 
            new Date(u.passwordResetExpiry) > new Date()
        );
        
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const updatedUser = {
            ...user,
            password: hashedPassword,
            passwordResetToken: null,
            passwordResetExpiry: null
        };
        
        await database.updateUser(user.username, updatedUser);
        
        res.json({ message: 'Password reset successfully!' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ message: 'Password reset failed' });
    }
});

// Enhanced Login with JWT
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    
    try {
        const user = await database.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        
        if (!user.emailVerified) {
            return res.status(401).json({ 
                message: 'Please verify your email address before logging in',
                requireEmailVerification: true
            });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        const { password: _, verificationToken, passwordResetToken, ...safeUser } = user;
        res.json({ 
            message: 'Login successful',
            user: safeUser,
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed' });
    }
});

// Get user profile
app.get('/users/:username', async (req, res) => {
    const { username } = req.params;
    
    try {
        const user = await database.getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check privacy settings
        if (user.privacySettings?.profileVisibility === 'private') {
            const { password, verificationToken, passwordResetToken, email, ...limitedUser } = user;
            return res.json(limitedUser);
        }
        
        const { password, verificationToken, passwordResetToken, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Failed to get user' });
    }
});

// Update user profile
app.put('/users/:username', async (req, res) => {
    const { username } = req.params;
    const { name, bio, email } = req.body;
    
    try {
        const user = await database.getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const updatedUser = {
            ...user,
            ...(name && { name }),
            ...(bio && { bio }),
            ...(email && { email })
        };
        
        await database.updateUser(username, updatedUser);
        
        const { password, verificationToken, passwordResetToken, ...safeUser } = updatedUser;
        res.json({ 
            message: 'Profile updated successfully',
            user: safeUser
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});

// Get all users (for user search/discovery)
app.get('/users', async (req, res) => {
    const users = await database.getUsers();
    const userList = users.map(({ password, verificationToken, passwordResetToken, ...user }) => user);
    res.json(userList);
});

// Follow/Unfollow System
app.post('/users/:username/follow', async (req, res) => {
    const { username } = req.params;
    const { followerUsername } = req.body;
    
    if (!followerUsername) {
        return res.status(400).json({ message: 'Follower username is required' });
    }
    
    if (username === followerUsername) {
        return res.status(400).json({ message: 'Cannot follow yourself' });
    }
    
    try {
        const userToFollow = await database.getUserByUsername(username);
        const follower = await database.getUserByUsername(followerUsername);
        
        if (!userToFollow || !follower) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check privacy settings
        if (userToFollow.privacySettings?.profileVisibility === 'private') {
            return res.status(403).json({ message: 'This user has a private profile' });
        }
        
        // Check if already following
        const isAlreadyFollowing = userToFollow.followers?.includes(followerUsername);
        if (isAlreadyFollowing) {
            return res.status(400).json({ message: 'Already following this user' });
        }
        
        // Update follower's following list
        const updatedFollower = {
            ...follower,
            following: [...(follower.following || []), username],
            followingCount: (follower.followingCount || 0) + 1
        };
        
        // Update user's followers list
        const updatedUser = {
            ...userToFollow,
            followers: [...(userToFollow.followers || []), followerUsername],
            followerCount: (userToFollow.followerCount || 0) + 1
        };
        
        await database.updateUser(followerUsername, updatedFollower);
        await database.updateUser(username, updatedUser);
        
        res.json({ 
            message: `Now following ${userToFollow.name}`,
            following: true
        });
    } catch (error) {
        console.error('Follow error:', error);
        res.status(500).json({ message: 'Failed to follow user' });
    }
});

app.post('/users/:username/unfollow', async (req, res) => {
    const { username } = req.params;
    const { followerUsername } = req.body;
    
    if (!followerUsername) {
        return res.status(400).json({ message: 'Follower username is required' });
    }
    
    try {
        const userToUnfollow = await database.getUserByUsername(username);
        const follower = await database.getUserByUsername(followerUsername);
        
        if (!userToUnfollow || !follower) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check if currently following
        const isFollowing = userToUnfollow.followers?.includes(followerUsername);
        if (!isFollowing) {
            return res.status(400).json({ message: 'Not following this user' });
        }
        
        // Update follower's following list
        const updatedFollower = {
            ...follower,
            following: (follower.following || []).filter(u => u !== username),
            followingCount: Math.max(0, (follower.followingCount || 0) - 1)
        };
        
        // Update user's followers list
        const updatedUser = {
            ...userToUnfollow,
            followers: (userToUnfollow.followers || []).filter(u => u !== followerUsername),
            followerCount: Math.max(0, (userToUnfollow.followerCount || 0) - 1)
        };
        
        await database.updateUser(followerUsername, updatedFollower);
        await database.updateUser(username, updatedUser);
        
        res.json({ 
            message: `Unfollowed ${userToUnfollow.name}`,
            following: false
        });
    } catch (error) {
        console.error('Unfollow error:', error);
        res.status(500).json({ message: 'Failed to unfollow user' });
    }
});

// Get user's followers
app.get('/users/:username/followers', async (req, res) => {
    const { username } = req.params;
    
    try {
        const user = await database.getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check privacy settings
        if (user.privacySettings?.followersVisible === false) {
            return res.status(403).json({ message: 'Followers list is private' });
        }
        
        const followers = user.followers || [];
        const followerDetails = [];
        
        for (const followerUsername of followers) {
            const followerUser = await database.getUserByUsername(followerUsername);
            if (followerUser) {
                const { password, verificationToken, passwordResetToken, ...safeUser } = followerUser;
                followerDetails.push(safeUser);
            }
        }
        
        res.json({
            count: followers.length,
            followers: followerDetails
        });
    } catch (error) {
        console.error('Get followers error:', error);
        res.status(500).json({ message: 'Failed to get followers' });
    }
});

// Get user's following
app.get('/users/:username/following', async (req, res) => {
    const { username } = req.params;
    
    try {
        const user = await database.getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const following = user.following || [];
        const followingDetails = [];
        
        for (const followingUsername of following) {
            const followingUser = await database.getUserByUsername(followingUsername);
            if (followingUser) {
                const { password, verificationToken, passwordResetToken, ...safeUser } = followingUser;
                followingDetails.push(safeUser);
            }
        }
        
        res.json({
            count: following.length,
            following: followingDetails
        });
    } catch (error) {
        console.error('Get following error:', error);
        res.status(500).json({ message: 'Failed to get following' });
    }
});

// Privacy Settings
app.put('/users/:username/privacy', async (req, res) => {
    const { username } = req.params;
    const { privacySettings } = req.body;
    
    if (!privacySettings) {
        return res.status(400).json({ message: 'Privacy settings are required' });
    }
    
    try {
        const user = await database.getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const updatedUser = {
            ...user,
            privacySettings: {
                ...user.privacySettings,
                ...privacySettings
            }
        };
        
        await database.updateUser(username, updatedUser);
        
        const { password, verificationToken, passwordResetToken, ...safeUser } = updatedUser;
        res.json({ 
            message: 'Privacy settings updated',
            user: safeUser
        });
    } catch (error) {
        console.error('Privacy settings error:', error);
        res.status(500).json({ message: 'Failed to update privacy settings' });
    }
});

// Update user avatar
app.put('/users/:username/avatar', upload.single('avatar'), async (req, res) => {
    const { username } = req.params;
    
    try {
        const user = await database.getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: 'No avatar file provided' });
        }
        
        const avatarUrl = `/uploads/${req.file.filename}`;
        
        const updatedUser = {
            ...user,
            avatar: avatarUrl
        };
        
        await database.updateUser(username, updatedUser);
        
        const { password, verificationToken, passwordResetToken, ...safeUser } = updatedUser;
        res.json({ 
            message: 'Avatar updated successfully',
            user: safeUser
        });
    } catch (error) {
        console.error('Avatar update error:', error);
        res.status(500).json({ message: 'Failed to update avatar' });
    }
});

// Posts endpoints
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
        originalUser: isAnonymous === 'true' ? username : null
    };
    
    const savedPost = await database.addPost(newPost);
    
    if (savedPost) {
        console.log(`📝 New post created by ${isAnonymous === 'true' ? 'Anonymous' : (username || 'Guest')}: "${content.substring(0, 50)}..."`);
        res.json({ message: 'Post created successfully', post: savedPost });
    } else {
        res.status(500).json({ message: 'Failed to create post' });
    }
});

app.get('/posts', async (req, res) => {
    const posts = await database.getPosts();
    res.json(posts.slice(-20).reverse());
});

// Like/unlike post
app.post('/posts/:postId/like', (req, res) => {
    const { postId } = req.params;
    const { username } = req.body;
    
    // This would need to be connected to database
    res.json({ message: 'Like functionality needs database integration' });
});

// Comments system
app.post('/posts/:postId/comments', (req, res) => {
    const { postId } = req.params;
    const { username, content } = req.body;
    
    if (!username || !content) {
        return res.status(400).json({ message: 'Username and content are required' });
    }
    
    const newComment = {
        id: Date.now(),
        postId: parseInt(postId),
        username,
        content,
        date: new Date().toISOString()
    };
    
    comments.push(newComment);
    res.json({ message: 'Comment added', comment: newComment });
});

app.get('/posts/:postId/comments', (req, res) => {
    const { postId } = req.params;
    const postComments = comments.filter(c => c.postId == postId);
    res.json(postComments);
});

// Messages
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

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database and start server
const startServer = async () => {
    try {
        // Initialize Firebase Realtime Database with sample data
        await database.initializeSampleData();
        
        app.listen(PORT, () => {
            console.log(`🚀 NEEX Backend running on port ${PORT}`);
            console.log(`🔥 Database: FIREBASE-REALTIME (Global Cloud)`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🎨 UI: Enhanced User Management System`);
            console.log(`📡 Real-time sync: ENABLED`);
            console.log(`✨ Features: Registration, Email Verification, Password Reset, Follow System`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
