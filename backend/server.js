const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const socketIo = require('socket.io');
// const sharp = require('sharp'); // Optional for image processing
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const http = require('http');
const database = require('./database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:5001', 'http://localhost:8080', 'https://neex-57c2e.web.app', 'https://neex-57c2e.firebaseapp.com', 'https://neex.netlify.app'],
        methods: ['GET', 'POST']
    }
});
const PORT = process.env.PORT || 5001;

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);

// CORS Configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5001', 'http://localhost:8080', 'https://neex-57c2e.web.app', 'https://neex-57c2e.firebaseapp.com', 'https://neex.netlify.app'],
    credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Email configuration
const transporter = nodemailer.createTransport({
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

// Admin Middleware - Strict Administrator-only access
const isAdmin = async (req, res, next) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        
        // Only allow exact "Administrator" username
        if (username !== 'Administrator') {
            return res.status(403).json({ message: 'Administrator access required - Invalid user' });
        }
        
        const user = await database.getUserByUsername(username);
        if (!user || !user.isAdmin || user.username !== 'Administrator') {
            return res.status(403).json({ message: 'Administrator access denied - Invalid credentials' });
        }
        
        req.adminUser = user;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Administrator verification failed' });
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

// Enhanced Multer configuration for different media types
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = 'uploads';
        
        // Create different folders for different content types
        if (file.fieldname === 'story') {
            uploadPath = 'uploads/stories';
        } else if (file.fieldname === 'video') {
            uploadPath = 'uploads/videos';
        } else if (file.fieldname === 'avatar') {
            uploadPath = 'uploads/avatars';
        }
        
        cb(null, path.join(__dirname, uploadPath));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Image upload configuration
const imageUpload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Images only! Allowed: JPEG, JPG, PNG, GIF, WebP'));
        }
    }
});

// Video upload configuration
const videoUpload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for videos
    fileFilter: (req, file, cb) => {
        const allowedTypes = /mp4|avi|mov|wmv|flv|webm|mkv/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Videos only! Allowed: MP4, AVI, MOV, WMV, FLV, WebM, MKV'));
        }
    }
});

// Mixed media upload (for posts that can have both)
const mediaUpload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|avi|mov|wmv|flv|webm|mkv/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and videos allowed!'));
        }
    }
});

// Legacy upload for backward compatibility
const upload = imageUpload;

// In-memory storage for quick operations
let comments = [];
let messages = [];
let stories = [];
let liveStreams = [];
let hashtags = new Map();
let mentions = new Map();

// Registration Disabled - Accounts are pre-created only
app.post('/register', async (req, res) => {
    // Registration is disabled - users can only sign in with existing accounts
    return res.status(403).json({ 
        message: 'Registration is disabled. Only existing users can sign in.',
        registrationDisabled: true 
    });
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

// Initialize Administrator account on startup
const initializeAdminAccount = async () => {
    try {
        const adminUser = await database.getUserByUsername('Administrator');
        if (!adminUser) {
            // Create Administrator account if it doesn't exist
            const adminPassword = await bcrypt.hash('bi+jJZ9t', 10);
            const newAdmin = {
                username: 'Administrator',
                password: adminPassword,
                name: 'System Administrator',
                email: 'admin@neex.app',
                avatar: 'AD',
                bio: 'System Administrator - Full Access Control 🔧⚡',
                verified: true,
                isAdmin: true,
                role: 'admin',
                permissions: {
                    deleteAnyPost: true,
                    editAnyPost: true,
                    makePostAnonymous: true,
                    togglePostVisibility: true,
                    manageUsers: true,
                    viewAllData: true,
                    moderateContent: true
                },
                followers: 0,
                following: 0,
                joinDate: new Date().toISOString()
            };
            
            await database.addUser(newAdmin);
            console.log('✅ Administrator account created with password: bi+jJZ9t');
        } else {
            // Update Administrator password if it exists but password doesn't match
            const isValidPassword = await bcrypt.compare('bi+jJZ9t', adminUser.password);
            if (!isValidPassword) {
                const newPasswordHash = await bcrypt.hash('bi+jJZ9t', 10);
                await database.updateUser('Administrator', { password: newPasswordHash });
                console.log('✅ Administrator password updated to: bi+jJZ9t');
            } else {
                console.log('✅ Administrator account ready');
            }
        }
    } catch (error) {
        console.error('❌ Error initializing Administrator account:', error);
    }
};

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

// Enhanced Signup with JWT
app.post('/signup', async (req, res) => {
    const { username, password, email, name, bio } = req.body;
    
    if (!username || !password || !email) {
        return res.status(400).json({ message: 'Username, password, and email are required' });
    }
    
    if (password.length < 3) {
        return res.status(400).json({ message: 'Password must be at least 3 characters' });
    }
    
    try {
        // Check if username already exists
        const existingUser = await database.getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        
        // Check if email already exists
        const emailUser = await database.getUserByEmail(email);
        if (emailUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        const newUser = {
            username,
            password: hashedPassword,
            name: name || username.charAt(0).toUpperCase() + username.slice(1),
            email,
            avatar: username.substring(0, 2).toUpperCase(),
            bio: bio || `Hello! I'm ${username} 👋`,
            verified: false,
            isAdmin: false,
            role: "user",
            followers: 0,
            following: 0,
            joinDate: new Date().toISOString()
        };
        
        // Add user to database
        const savedUser = await database.addUser(newUser);
        
        console.log(`✅ New user registered: ${username}`);
        
        res.status(201).json({ 
            message: 'Account created successfully',
            user: { 
                id: savedUser.id, 
                username: savedUser.username, 
                name: savedUser.name, 
                email: savedUser.email,
                avatar: savedUser.avatar,
                bio: savedUser.bio,
                verified: savedUser.verified
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Account creation failed' });
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

// Helper Functions for Advanced Features

// Extract hashtags from text
const extractHashtags = (text) => {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    return text.match(hashtagRegex) || [];
};

// Extract mentions from text
const extractMentions = (text) => {
    const mentionRegex = /@[a-zA-Z0-9_]+/g;
    return text.match(mentionRegex) || [];
};

// Process and optimize images (optional - requires sharp)
const processImage = async (filePath) => {
    try {
        // Check if sharp is available
        const sharp = require('sharp');
        const outputPath = filePath.replace(/\.[^/.]+$/, '_optimized.webp');
        await sharp(filePath)
            .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(outputPath);
        return outputPath;
    } catch (error) {
        console.log('Image optimization unavailable (sharp not installed), using original image');
        return filePath; // Return original if processing fails or sharp not available
    }
};

// Search function for posts, users, hashtags
const searchContent = async (query, type = 'all') => {
    const results = { posts: [], users: [], hashtags: [] };
    
    if (type === 'all' || type === 'posts') {
        const posts = await database.getPosts();
        results.posts = posts.filter(post => 
            post.content.toLowerCase().includes(query.toLowerCase()) ||
            extractHashtags(post.content).some(tag => 
                tag.toLowerCase().includes(query.toLowerCase())
            )
        );
    }
    
    if (type === 'all' || type === 'users') {
        const users = await database.getUsers();
        results.users = users.filter(user => 
            user.username.toLowerCase().includes(query.toLowerCase()) ||
            user.name.toLowerCase().includes(query.toLowerCase()) ||
            (user.bio && user.bio.toLowerCase().includes(query.toLowerCase()))
        ).map(({ password, verificationToken, passwordResetToken, ...user }) => user);
    }
    
    if (type === 'all' || type === 'hashtags') {
        results.hashtags = Array.from(hashtags.entries())
            .filter(([tag, data]) => tag.toLowerCase().includes(query.toLowerCase()))
            .map(([tag, data]) => ({ tag, count: data.count, posts: data.posts }));
    }
    
    return results;
};

// Enhanced Posts endpoints with media support
app.post('/posts', mediaUpload.single('media'), async (req, res) => {
    const { username, content, isAnonymous, location, allowComments = true } = req.body;
    
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
    
    try {
        let mediaUrl = null;
        let mediaType = null;
        
        // Process uploaded media
        if (req.file) {
            mediaUrl = `/uploads/${req.file.filename}`;
            mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
            
            // Optimize images
            if (mediaType === 'image') {
                try {
                    const optimizedPath = await processImage(req.file.path);
                    mediaUrl = optimizedPath.replace(__dirname, '').replace(/\\/g, '/');
                } catch (error) {
                    console.log('Image optimization failed, using original');
                }
            }
        }
        
        // Extract hashtags and mentions
        const hashtagsFound = extractHashtags(content.trim());
        const mentionsFound = extractMentions(content.trim());
        
        const newPost = {
            id: uuidv4(),
            username: isAnonymous === 'true' ? 'Anonymous' : (username || 'Guest'),
            content: content.trim(),
            media: mediaUrl,
            mediaType,
            location: location || null,
            date: new Date().toISOString(),
            likes: [],
            shares: [],
            comments: [],
            reactions: { like: 0, heart: 0, laugh: 0, angry: 0, sad: 0 },
            hashtags: hashtagsFound,
            mentions: mentionsFound,
            isAnonymous: isAnonymous === 'true' || false,
            originalUser: isAnonymous === 'true' ? username : null,
            allowComments: allowComments === 'true' || allowComments === true,
            views: 0,
            shares: 0
        };
        
        // Store hashtags
        hashtagsFound.forEach(tag => {
            const tagLower = tag.toLowerCase();
            if (hashtags.has(tagLower)) {
                const existing = hashtags.get(tagLower);
                existing.count++;
                existing.posts.push(newPost.id);
            } else {
                hashtags.set(tagLower, { count: 1, posts: [newPost.id] });
            }
        });
        
        // Store mentions
        mentionsFound.forEach(mention => {
            const mentionUser = mention.substring(1); // Remove @ symbol
            if (mentions.has(mentionUser)) {
                mentions.get(mentionUser).push(newPost.id);
            } else {
                mentions.set(mentionUser, [newPost.id]);
            }
        });
        
        const savedPost = await database.addPost(newPost);
        
        if (savedPost) {
            // Emit to real-time listeners
            io.emit('new-post', savedPost);
            
            console.log(`📝 New post created by ${isAnonymous === 'true' ? 'Anonymous' : username}: "${content.substring(0, 50)}..."`);
            res.json({ message: 'Post created successfully', post: savedPost });
        } else {
            res.status(500).json({ message: 'Failed to create post' });
        }
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ message: 'Failed to create post' });
    }
});

app.get('/posts', async (req, res) => {
    const { page = 1, limit = 20, hashtag, user, search } = req.query;
    
    try {
        let posts = await database.getPosts();
        
        // Filter by hashtag
        if (hashtag) {
            posts = posts.filter(post => 
                post.hashtags && post.hashtags.includes(`#${hashtag}`)
            );
        }
        
        // Filter by user
        if (user) {
            posts = posts.filter(post => post.username === user);
        }
        
        // Search in content
        if (search) {
            posts = posts.filter(post => 
                post.content.toLowerCase().includes(search.toLowerCase())
            );
        }
        
        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        
        res.json({
            posts: posts.slice(startIndex, endIndex).reverse(),
            totalPosts: posts.length,
            currentPage: parseInt(page),
            totalPages: Math.ceil(posts.length / limit)
        });
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ message: 'Failed to get posts' });
    }
});

// Enhanced post reactions
app.post('/posts/:postId/react', async (req, res) => {
    const { postId } = req.params;
    const { username, reaction } = req.body; // like, heart, laugh, angry, sad
    
    if (!username || !reaction) {
        return res.status(400).json({ message: 'Username and reaction are required' });
    }
    
    try {
        const posts = await database.getPosts();
        const postIndex = posts.findIndex(p => p.id === postId);
        
        if (postIndex === -1) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        const post = posts[postIndex];
        
        if (!post.userReactions) {
            post.userReactions = {};
        }
        
        // Remove previous reaction if exists
        if (post.userReactions[username]) {
            const prevReaction = post.userReactions[username];
            post.reactions[prevReaction] = Math.max(0, post.reactions[prevReaction] - 1);
        }
        
        // Add new reaction
        post.userReactions[username] = reaction;
        post.reactions[reaction] = (post.reactions[reaction] || 0) + 1;
        
        // Update in database (simplified - you'd need proper database update)
        
        // Emit real-time update
        io.emit('post-reaction', { postId, reactions: post.reactions });
        
        res.json({ 
            message: 'Reaction added',
            reactions: post.reactions
        });
    } catch (error) {
        console.error('React to post error:', error);
        res.status(500).json({ message: 'Failed to react to post' });
    }
});

// Share/Repost functionality
app.post('/posts/:postId/share', async (req, res) => {
    const { postId } = req.params;
    const { username, comment } = req.body;
    
    if (!username) {
        return res.status(400).json({ message: 'Username is required' });
    }
    
    try {
        const posts = await database.getPosts();
        const originalPost = posts.find(p => p.id === postId);
        
        if (!originalPost) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Create shared post
        const sharedPost = {
            id: uuidv4(),
            username,
            content: comment || '',
            sharedPost: {
                id: originalPost.id,
                username: originalPost.username,
                content: originalPost.content,
                media: originalPost.media,
                mediaType: originalPost.mediaType,
                date: originalPost.date
            },
            date: new Date().toISOString(),
            likes: [],
            shares: [],
            comments: [],
            reactions: { like: 0, heart: 0, laugh: 0, angry: 0, sad: 0 },
            hashtags: extractHashtags(comment || ''),
            mentions: extractMentions(comment || ''),
            isShared: true,
            allowComments: true,
            views: 0
        };
        
        // Increment share count on original post
        originalPost.shares = (originalPost.shares || 0) + 1;
        
        const savedPost = await database.addPost(sharedPost);
        
        if (savedPost) {
            // Emit real-time updates
            io.emit('new-post', savedPost);
            io.emit('post-shared', { postId, shares: originalPost.shares });
            
            res.json({ message: 'Post shared successfully', post: savedPost });
        } else {
            res.status(500).json({ message: 'Failed to share post' });
        }
    } catch (error) {
        console.error('Share post error:', error);
        res.status(500).json({ message: 'Failed to share post' });
    }
});

// =============================================================================
// ADMIN ENDPOINTS - Full Control for Administrator
// =============================================================================

// Admin: Delete any post
app.delete('/admin/posts/:postId', isAdmin, async (req, res) => {
    const { postId } = req.params;
    
    try {
        const posts = await database.getPosts();
        const postIndex = posts.findIndex(p => p.id === parseInt(postId));
        
        if (postIndex === -1) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Remove post (in a real app, you'd call database.deletePost)
        const deletedPost = posts.splice(postIndex, 1)[0];
        
        // Emit real-time update
        io.emit('post-deleted', { postId: parseInt(postId), adminUser: req.adminUser.username });
        
        res.json({ 
            message: 'Post deleted successfully',
            deletedPost,
            adminAction: true
        });
    } catch (error) {
        console.error('Admin delete post error:', error);
        res.status(500).json({ message: 'Failed to delete post' });
    }
});

// Admin: Edit any post
app.put('/admin/posts/:postId', isAdmin, async (req, res) => {
    const { postId } = req.params;
    const { content, isAnonymous, visible } = req.body;
    
    try {
        const posts = await database.getPosts();
        const postIndex = posts.findIndex(p => p.id === parseInt(postId));
        
        if (postIndex === -1) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        const post = posts[postIndex];
        
        // Update post properties
        if (content !== undefined) post.content = content;
        if (isAnonymous !== undefined) {
            post.isAnonymous = isAnonymous;
            if (isAnonymous) {
                post.originalUser = post.username;
                post.username = 'Anonymous';
            } else if (post.originalUser) {
                post.username = post.originalUser;
                delete post.originalUser;
            }
        }
        if (visible !== undefined) post.visible = visible;
        
        // Add admin edit marker
        post.editedByAdmin = {
            adminUser: req.adminUser.username,
            editDate: new Date().toISOString()
        };
        
        // Emit real-time update
        io.emit('post-updated', { 
            postId: parseInt(postId), 
            post, 
            adminUser: req.adminUser.username 
        });
        
        res.json({ 
            message: 'Post updated successfully',
            post,
            adminAction: true
        });
    } catch (error) {
        console.error('Admin edit post error:', error);
        res.status(500).json({ message: 'Failed to edit post' });
    }
});

// Admin: Toggle post anonymity
app.patch('/admin/posts/:postId/anonymity', isAdmin, async (req, res) => {
    const { postId } = req.params;
    const { makeAnonymous } = req.body;
    
    try {
        const posts = await database.getPosts();
        const postIndex = posts.findIndex(p => p.id === parseInt(postId));
        
        if (postIndex === -1) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        const post = posts[postIndex];
        
        if (makeAnonymous) {
            post.originalUser = post.username;
            post.username = 'Anonymous';
            post.isAnonymous = true;
        } else {
            if (post.originalUser) {
                post.username = post.originalUser;
                delete post.originalUser;
            }
            post.isAnonymous = false;
        }
        
        // Add admin action marker
        post.adminActions = post.adminActions || [];
        post.adminActions.push({
            action: makeAnonymous ? 'made_anonymous' : 'revealed_identity',
            adminUser: req.adminUser.username,
            timestamp: new Date().toISOString()
        });
        
        // Emit real-time update
        io.emit('post-anonymity-changed', { 
            postId: parseInt(postId), 
            post,
            adminUser: req.adminUser.username 
        });
        
        res.json({ 
            message: `Post ${makeAnonymous ? 'made anonymous' : 'identity revealed'}`,
            post,
            adminAction: true
        });
    } catch (error) {
        console.error('Admin anonymity toggle error:', error);
        res.status(500).json({ message: 'Failed to toggle anonymity' });
    }
});

// Admin: Toggle post visibility
app.patch('/admin/posts/:postId/visibility', isAdmin, async (req, res) => {
    const { postId } = req.params;
    const { visible } = req.body;
    
    try {
        const posts = await database.getPosts();
        const postIndex = posts.findIndex(p => p.id === parseInt(postId));
        
        if (postIndex === -1) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        const post = posts[postIndex];
        post.visible = visible;
        post.hiddenByAdmin = !visible ? {
            adminUser: req.adminUser.username,
            hiddenDate: new Date().toISOString()
        } : null;
        
        // Emit real-time update
        io.emit('post-visibility-changed', { 
            postId: parseInt(postId), 
            visible,
            adminUser: req.adminUser.username 
        });
        
        res.json({ 
            message: `Post ${visible ? 'made visible' : 'hidden'}`,
            post,
            adminAction: true
        });
    } catch (error) {
        console.error('Admin visibility toggle error:', error);
        res.status(500).json({ message: 'Failed to toggle visibility' });
    }
});

// Admin: Get all posts (including hidden ones)
app.get('/admin/posts', isAdmin, async (req, res) => {
    try {
        const posts = await database.getPosts();
        res.json({ 
            posts,
            totalPosts: posts.length,
            adminUser: req.adminUser.username,
            adminAction: true
        });
    } catch (error) {
        console.error('Admin get posts error:', error);
        res.status(500).json({ message: 'Failed to get posts' });
    }
});

// Admin: Get user management data
app.get('/admin/users', isAdmin, async (req, res) => {
    try {
        const users = await database.getUsers();
        const sanitizedUsers = users.map(user => {
            const { password, ...safeUser } = user;
            return safeUser;
        });
        
        res.json({ 
            users: sanitizedUsers,
            totalUsers: sanitizedUsers.length,
            adminUser: req.adminUser.username,
            adminAction: true
        });
    } catch (error) {
        console.error('Admin get users error:', error);
        res.status(500).json({ message: 'Failed to get users' });
    }
});

// Enhanced Comments system
app.post('/posts/:postId/comments', async (req, res) => {
    const { postId } = req.params;
    const { username, content, parentCommentId } = req.body;
    
    if (!username || !content) {
        return res.status(400).json({ message: 'Username and content are required' });
    }
    
    try {
        const posts = await database.getPosts();
        const post = posts.find(p => p.id === postId);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        if (!post.allowComments) {
            return res.status(403).json({ message: 'Comments are disabled for this post' });
        }
        
        const newComment = {
            id: uuidv4(),
            postId,
            username,
            content: content.trim(),
            parentCommentId: parentCommentId || null,
            date: new Date().toISOString(),
            likes: [],
            replies: [],
            hashtags: extractHashtags(content),
            mentions: extractMentions(content)
        };
        
        comments.push(newComment);
        
        // If it's a reply, add to parent comment
        if (parentCommentId) {
            const parentComment = comments.find(c => c.id === parentCommentId);
            if (parentComment) {
                parentComment.replies.push(newComment.id);
            }
        }
        
        // Emit real-time update
        io.emit('new-comment', { postId, comment: newComment });
        
        res.json({ message: 'Comment added', comment: newComment });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ message: 'Failed to add comment' });
    }
});

app.get('/posts/:postId/comments', (req, res) => {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    try {
        const postComments = comments
            .filter(c => c.postId === postId && !c.parentCommentId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Add replies to comments
        const commentsWithReplies = postComments.map(comment => ({
            ...comment,
            replies: comments
                .filter(c => c.parentCommentId === comment.id)
                .sort((a, b) => new Date(a.date) - new Date(b.date))
        }));
        
        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        
        res.json({
            comments: commentsWithReplies.slice(startIndex, endIndex),
            totalComments: postComments.length,
            currentPage: parseInt(page),
            totalPages: Math.ceil(postComments.length / limit)
        });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ message: 'Failed to get comments' });
    }
});

// Stories Feature
app.post('/stories', mediaUpload.single('story'), async (req, res) => {
    const { username, content, duration = 24 } = req.body; // duration in hours
    
    if (!username) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!req.file) {
        return res.status(400).json({ message: 'Story media is required' });
    }
    
    try {
        let mediaUrl = `/uploads/stories/${req.file.filename}`;
        const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
        
        // Process image if needed
        if (mediaType === 'image') {
            try {
                const optimizedPath = await processImage(req.file.path);
                mediaUrl = optimizedPath.replace(__dirname, '').replace(/\\/g, '/');
            } catch (error) {
                console.log('Story image optimization failed, using original');
            }
        }
        
        const newStory = {
            id: uuidv4(),
            username,
            content: content || '',
            media: mediaUrl,
            mediaType,
            date: new Date().toISOString(),
            expiresAt: new Date(Date.now() + duration * 60 * 60 * 1000).toISOString(),
            viewers: [],
            isActive: true
        };
        
        stories.push(newStory);
        
        // Emit real-time update
        io.emit('new-story', newStory);
        
        res.json({ message: 'Story created successfully', story: newStory });
    } catch (error) {
        console.error('Create story error:', error);
        res.status(500).json({ message: 'Failed to create story' });
    }
});

app.get('/stories', async (req, res) => {
    const { username } = req.query;
    
    try {
        const now = new Date();
        
        // Remove expired stories
        stories = stories.filter(story => new Date(story.expiresAt) > now);
        
        let activeStories = stories.filter(story => story.isActive);
        
        if (username) {
            activeStories = activeStories.filter(story => story.username === username);
        }
        
        // Group stories by user
        const storiesByUser = activeStories.reduce((acc, story) => {
            if (!acc[story.username]) {
                acc[story.username] = [];
            }
            acc[story.username].push(story);
            return acc;
        }, {});
        
        res.json(storiesByUser);
    } catch (error) {
        console.error('Get stories error:', error);
        res.status(500).json({ message: 'Failed to get stories' });
    }
});

app.post('/stories/:storyId/view', (req, res) => {
    const { storyId } = req.params;
    const { username } = req.body;
    
    if (!username) {
        return res.status(400).json({ message: 'Username is required' });
    }
    
    const story = stories.find(s => s.id === storyId);
    if (!story) {
        return res.status(404).json({ message: 'Story not found' });
    }
    
    if (!story.viewers.includes(username)) {
        story.viewers.push(username);
    }
    
    res.json({ message: 'Story viewed', viewers: story.viewers.length });
});

// Search Functionality
app.get('/search', async (req, res) => {
    const { q, type = 'all', page = 1, limit = 20 } = req.query;
    
    if (!q || q.length < 2) {
        return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }
    
    try {
        const results = await searchContent(q, type);
        
        // Pagination for each type
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        
        if (type !== 'all') {
            results[type] = results[type].slice(startIndex, endIndex);
        }
        
        res.json({
            query: q,
            results,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Search failed' });
    }
});

// Hashtag endpoints
app.get('/hashtags/trending', (req, res) => {
    try {
        const trending = Array.from(hashtags.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 20)
            .map(([tag, data]) => ({
                hashtag: tag,
                count: data.count,
                posts: data.posts.length
            }));
        
        res.json(trending);
    } catch (error) {
        console.error('Get trending hashtags error:', error);
        res.status(500).json({ message: 'Failed to get trending hashtags' });
    }
});

app.get('/hashtags/:hashtag/posts', async (req, res) => {
    const { hashtag } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    try {
        const posts = await database.getPosts();
        const hashtagPosts = posts.filter(post => 
            post.hashtags && post.hashtags.includes(`#${hashtag}`)
        );
        
        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        
        res.json({
            hashtag: `#${hashtag}`,
            posts: hashtagPosts.slice(startIndex, endIndex).reverse(),
            totalPosts: hashtagPosts.length,
            currentPage: parseInt(page),
            totalPages: Math.ceil(hashtagPosts.length / limit)
        });
    } catch (error) {
        console.error('Get hashtag posts error:', error);
        res.status(500).json({ message: 'Failed to get hashtag posts' });
    }
});

// Live Streaming Feature
app.post('/live/start', (req, res) => {
    const { username, title, description } = req.body;
    
    if (!username) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    
    const streamId = uuidv4();
    const liveStream = {
        id: streamId,
        username,
        title: title || `${username}'s Live Stream`,
        description: description || '',
        startTime: new Date().toISOString(),
        viewers: [],
        isActive: true,
        streamKey: crypto.randomBytes(16).toString('hex')
    };
    
    liveStreams.push(liveStream);
    
    // Emit to followers
    io.emit('live-stream-started', {
        streamId,
        username,
        title: liveStream.title
    });
    
    res.json({
        message: 'Live stream started',
        streamId,
        streamKey: liveStream.streamKey
    });
});

app.get('/live', (req, res) => {
    const activeLiveStreams = liveStreams.filter(stream => stream.isActive);
    res.json(activeLiveStreams);
});

app.post('/live/:streamId/join', (req, res) => {
    const { streamId } = req.params;
    const { username } = req.body;
    
    const stream = liveStreams.find(s => s.id === streamId);
    if (!stream) {
        return res.status(404).json({ message: 'Live stream not found' });
    }
    
    if (!stream.viewers.includes(username)) {
        stream.viewers.push(username);
    }
    
    res.json({
        message: 'Joined live stream',
        stream: {
            id: stream.id,
            title: stream.title,
            username: stream.username,
            viewers: stream.viewers.length
        }
    });
});

app.post('/live/:streamId/end', (req, res) => {
    const { streamId } = req.params;
    const { username } = req.body;
    
    const streamIndex = liveStreams.findIndex(s => s.id === streamId);
    if (streamIndex === -1) {
        return res.status(404).json({ message: 'Live stream not found' });
    }
    
    const stream = liveStreams[streamIndex];
    if (stream.username !== username) {
        return res.status(403).json({ message: 'Only the stream owner can end the stream' });
    }
    
    stream.isActive = false;
    stream.endTime = new Date().toISOString();
    
    // Emit to viewers
    io.emit('live-stream-ended', { streamId });
    
    res.json({ message: 'Live stream ended' });
});

// Enhanced Messages with media support
app.post('/messages', mediaUpload.single('media'), async (req, res) => {
    const { from, to, content, messageType = 'text' } = req.body;
    
    if (!from || !to) {
        return res.status(400).json({ message: 'Sender and recipient are required' });
    }
    
    if (!content && !req.file) {
        return res.status(400).json({ message: 'Message content or media is required' });
    }
    
    try {
        let mediaUrl = null;
        let mediaType = null;
        
        if (req.file) {
            mediaUrl = `/uploads/${req.file.filename}`;
            mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
        }
        
        const newMessage = {
            id: uuidv4(),
            from,
            to,
            content: content || '',
            media: mediaUrl,
            mediaType,
            messageType, // text, image, video, voice, file
            date: new Date().toISOString(),
            isRead: false,
            isDelivered: false,
            reactions: [],
            replyTo: req.body.replyTo || null
        };
        
        messages.push(newMessage);
        
        // Emit real-time message
        io.to(to).emit('new-message', newMessage);
        io.to(from).emit('message-sent', newMessage);
        
        res.json({ message: 'Message sent', data: newMessage });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Failed to send message' });
    }
});

app.get('/messages/:user1/:user2', (req, res) => {
    const { user1, user2 } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    try {
        const conversation = messages
            .filter(m => 
                (m.from === user1 && m.to === user2) || 
                (m.from === user2 && m.to === user1)
            )
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        
        res.json({
            messages: conversation.slice(startIndex, endIndex).reverse(),
            totalMessages: conversation.length,
            currentPage: parseInt(page),
            totalPages: Math.ceil(conversation.length / limit)
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Failed to get messages' });
    }
});

// Get user's conversations list
app.get('/conversations/:username', (req, res) => {
    const { username } = req.params;
    
    try {
        const userMessages = messages.filter(m => m.from === username || m.to === username);
        
        // Group by conversation partner
        const conversations = {};
        
        userMessages.forEach(message => {
            const partner = message.from === username ? message.to : message.from;
            
            if (!conversations[partner]) {
                conversations[partner] = {
                    partner,
                    lastMessage: message,
                    unreadCount: 0,
                    messages: []
                };
            }
            
            if (new Date(message.date) > new Date(conversations[partner].lastMessage.date)) {
                conversations[partner].lastMessage = message;
            }
            
            if (!message.isRead && message.to === username) {
                conversations[partner].unreadCount++;
            }
        });
        
        res.json(Object.values(conversations));
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ message: 'Failed to get conversations' });
    }
});

// Mark messages as read
app.put('/messages/read', (req, res) => {
    const { messageIds, username } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds)) {
        return res.status(400).json({ message: 'Message IDs array is required' });
    }
    
    try {
        messageIds.forEach(messageId => {
            const message = messages.find(m => m.id === messageId && m.to === username);
            if (message) {
                message.isRead = true;
            }
        });
        
        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        console.error('Mark messages read error:', error);
        res.status(500).json({ message: 'Failed to mark messages as read' });
    }
});

// React to message
app.post('/messages/:messageId/react', (req, res) => {
    const { messageId } = req.params;
    const { username, reaction } = req.body; // like, heart, laugh, etc.
    
    try {
        const message = messages.find(m => m.id === messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }
        
        if (!message.reactions) {
            message.reactions = [];
        }
        
        // Remove existing reaction from this user
        message.reactions = message.reactions.filter(r => r.username !== username);
        
        // Add new reaction
        if (reaction) {
            message.reactions.push({ username, reaction, date: new Date().toISOString() });
        }
        
        // Emit real-time update
        io.to(message.from).emit('message-reaction', { messageId, reactions: message.reactions });
        io.to(message.to).emit('message-reaction', { messageId, reactions: message.reactions });
        
        res.json({ message: 'Reaction updated', reactions: message.reactions });
    } catch (error) {
        console.error('React to message error:', error);
        res.status(500).json({ message: 'Failed to react to message' });
    }
});

// Socket.IO Real-time functionality
io.on('connection', (socket) => {
    console.log(`👤 User connected: ${socket.id}`);
    
    // Join user to their personal room
    socket.on('join-user-room', (username) => {
        socket.join(username);
        socket.username = username;
        console.log(`📱 ${username} joined their room`);
    });
    
    // Join live stream room
    socket.on('join-stream', (streamId) => {
        socket.join(`stream-${streamId}`);
        console.log(`🔴 User joined stream: ${streamId}`);
    });
    
    // Live stream chat
    socket.on('stream-message', (data) => {
        const { streamId, username, message } = data;
        io.to(`stream-${streamId}`).emit('stream-chat', {
            username,
            message,
            timestamp: new Date().toISOString()
        });
    });
    
    // Real-time direct messaging
    socket.on('send-dm', (data) => {
        const { to, from, content, messageType = 'text' } = data;
        
        const newMessage = {
            id: uuidv4(),
            from,
            to,
            content,
            messageType,
            date: new Date().toISOString(),
            isRead: false,
            isDelivered: true
        };
        
        messages.push(newMessage);
        
        // Send to recipient
        io.to(to).emit('receive-dm', newMessage);
        
        // Confirm to sender
        socket.emit('dm-sent', newMessage);
    });
    
    // Typing indicators
    socket.on('typing-start', (data) => {
        const { to, from } = data;
        socket.to(to).emit('user-typing', { username: from });
    });
    
    socket.on('typing-stop', (data) => {
        const { to, from } = data;
        socket.to(to).emit('user-stopped-typing', { username: from });
    });
    
    // Online status
    socket.on('set-online', (username) => {
        socket.username = username;
        socket.broadcast.emit('user-online', { username });
    });
    
    // Real-time notifications
    socket.on('notify', (data) => {
        const { targetUser, type, message, postId } = data;
        io.to(targetUser).emit('notification', {
            type, // like, comment, follow, mention
            message,
            postId,
            timestamp: new Date().toISOString()
        });
    });
    
    socket.on('disconnect', () => {
        if (socket.username) {
            socket.broadcast.emit('user-offline', { username: socket.username });
            console.log(`👋 ${socket.username} disconnected`);
        } else {
            console.log(`👋 User disconnected: ${socket.id}`);
        }
    });
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database and start server
const startServer = async () => {
    try {
        // Initialize Administrator account
        await initializeAdminAccount();
        
        server.listen(PORT, () => {
            console.log(`🚀 NEEX Backend running on port ${PORT}`);
            console.log(`🔥 Database: FIREBASE-REALTIME (Global Cloud)`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🎨 UI: Enhanced Social Media Platform`);
            console.log(`📡 Real-time sync: ENABLED`);
            console.log(`✨ Features: Posts, Stories, Live Streaming, Enhanced Messaging`);
            console.log(`🎯 Advanced: Video/Image uploads, Hashtags, Search, Comments`);
            console.log(`🔗 Socket.IO: Real-time messaging and notifications`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
