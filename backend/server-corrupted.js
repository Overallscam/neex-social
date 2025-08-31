const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Load environment variables
const { RealtimeDatabase } = require('./firebase-realtime-config'); // Firebase Realtime Database only
const app = express();
const PORT = process.env.PORT || 5001;

// Initialize Firebase Realtime Database (online only)
const database = new RealtimeDatabase();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Email configuration
const emailTransporter = nodemailer.createTransporter({
  service: 'gmail', // You can change this to your preferred service
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Helper Functions
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const generateJWT = (user) => {
  return jwt.sign(
    { 
      id: user.id || user.username, 
      username: user.username, 
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const sendVerificationEmail = async (email, username, token) => {
  const verificationUrl = `http://localhost:5001/verify-email?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@neex.com',
    to: email,
    subject: '🚀 Welcome to NEEX - Verify Your Email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1d9bf0 0%, #8b5cf6 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to NEEX! 🚀</h1>
        </div>
        <div style="padding: 20px; background: #f5f5f5;">
          <h2>Hi ${username}!</h2>
          <p>Thanks for joining NEEX Social! To complete your registration, please verify your email address.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: linear-gradient(135deg, #1d9bf0 0%, #8b5cf6 100%); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link in your browser:<br>
            <a href="${verificationUrl}">${verificationUrl}</a>
          </p>
        </div>
      </div>
    `
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

const sendPasswordResetEmail = async (email, username, token) => {
  const resetUrl = `http://localhost:8080/reset-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@neex.com',
    to: email,
    subject: '🔒 NEEX Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1d9bf0 0%, #8b5cf6 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset 🔒</h1>
        </div>
        <div style="padding: 20px; background: #f5f5f5;">
          <h2>Hi ${username}!</h2>
          <p>We received a request to reset your password. Click the button below to create a new password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(135deg, #1d9bf0 0%, #8b5cf6 100%); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
          </p>
        </div>
      </div>
    `
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

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
    
    // Password strength validation
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    
    // Check if user already exists
    const existingUser = await database.getUserByUsername(username);
    if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Check if email already exists
    const existingEmail = await database.getUserByEmail?.(email);
    if (existingEmail) {
        return res.status(400).json({ message: 'Email already registered' });
    }
    
    try {
        // Hash password
        const hashedPassword = await hashPassword(password);
        
        // Generate verification token
        const verificationToken = generateVerificationToken();
        
        // Create avatar from name initials
        const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        
        // Create new user
        const newUser = {
            username,
            password: hashedPassword,
            name,
            email,
            avatar,
            bio: bio || `Hello, I'm ${name}! New to NEEX! 👋`,
            verified: false,
            emailVerified: false,
            verificationToken,
            followers: [],
            following: [],
            blockedUsers: [],
            privacySettings: {
                profileVisibility: 'public', // public, private, friends
                postsVisibility: 'public',
                followersVisible: true,
                emailVisible: false
            },
            joinDate: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            postCount: 0,
            followerCount: 0,
            followingCount: 0
        };
        
        const savedUser = await database.addUser(newUser);
        
        if (savedUser) {
            // Send verification email
            const emailSent = await sendVerificationEmail(email, name, verificationToken);
            
            // Return user data without password
            const { password: _, verificationToken: __, ...userResponse } = savedUser;
            
            res.json({ 
                message: emailSent 
                    ? 'Registration successful! Please check your email to verify your account.' 
                    : 'Registration successful! Email verification is temporarily unavailable.',
                user: userResponse,
                requiresVerification: true
            });
        } else {
            res.status(500).json({ message: 'Failed to create user' });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
});

// Email verification endpoint
app.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    
    if (!token) {
        return res.status(400).json({ message: 'Verification token is required' });
    }
    
    try {
        // Find user by verification token
        const users = await database.getUsers();
        const user = users.find(u => u.verificationToken === token);
        
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }
        
        if (user.emailVerified) {
            return res.status(400).json({ message: 'Email already verified' });
        }
        
        // Update user verification status
        const updatedUser = {
            ...user,
            emailVerified: true,
            verified: true,
            verificationToken: null
        };
        
        await database.updateUser(user.username, updatedUser);
        
        // Redirect to success page or return success response
        res.json({ 
            message: 'Email verified successfully! You can now log in.',
            verified: true
        });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ message: 'Email verification failed' });
    }
});

// Resend verification email
app.post('/resend-verification', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    
    try {
        const users = await database.getUsers();
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (user.emailVerified) {
            return res.status(400).json({ message: 'Email already verified' });
        }
        
        // Generate new verification token
        const verificationToken = generateVerificationToken();
        const updatedUser = { ...user, verificationToken };
        await database.updateUser(user.username, updatedUser);
        
        // Send verification email
        const emailSent = await sendVerificationEmail(user.email, user.name, verificationToken);
        
        if (emailSent) {
            res.json({ message: 'Verification email sent successfully' });
        } else {
            res.status(500).json({ message: 'Failed to send verification email' });
        }
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ message: 'Failed to resend verification email' });
    }
});

// Password reset request
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    
    try {
        const users = await database.getUsers();
        const user = users.find(u => u.email === email);
        
        if (!user) {
            // Don't reveal if email exists or not for security
            return res.json({ message: 'If the email exists, a password reset link has been sent.' });
        }
        
        // Generate reset token
        const resetToken = generateResetToken();
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
        
        const updatedUser = {
            ...user,
            passwordResetToken: resetToken,
            passwordResetExpiry: resetTokenExpiry.toISOString()
        };
        
        await database.updateUser(user.username, updatedUser);
        
        // Send reset email
        const emailSent = await sendPasswordResetEmail(user.email, user.name, resetToken);
        
        res.json({ 
            message: 'If the email exists, a password reset link has been sent.',
            emailSent 
        });
    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ message: 'Failed to process password reset request' });
    }
});

// Password reset
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
        const user = users.find(u => u.passwordResetToken === token);
        
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }
        
        // Check if token is expired
        const now = new Date();
        const expiryDate = new Date(user.passwordResetExpiry);
        
        if (now > expiryDate) {
            return res.status(400).json({ message: 'Reset token has expired' });
        }
        
        // Hash new password
        const hashedPassword = await hashPassword(newPassword);
        
        // Update user password and clear reset token
        const updatedUser = {
            ...user,
            password: hashedPassword,
            passwordResetToken: null,
            passwordResetExpiry: null
        };
        
        await database.updateUser(user.username, updatedUser);
        
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ message: 'Failed to reset password' });
    }
});

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
        
        // Check password (handle both hashed and non-hashed for backward compatibility)
        let passwordValid = false;
        if (user.password.startsWith('$2')) {
            // Hashed password
            passwordValid = await comparePassword(password, user.password);
        } else {
            // Plain text password (backward compatibility)
            passwordValid = user.password === password;
            
            // Update to hashed password
            const hashedPassword = await hashPassword(password);
            await database.updateUser(username, { ...user, password: hashedPassword });
        }
        
        if (!passwordValid) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        
        // Check if email is verified (optional enforcement)
        if (!user.emailVerified && user.verificationToken) {
            return res.status(403).json({ 
                message: 'Please verify your email address before logging in',
                requiresVerification: true,
                email: user.email
            });
        }
        
        // Update last active time
        const updatedUser = {
            ...user,
            lastActive: new Date().toISOString()
        };
        await database.updateUser(username, updatedUser);
        
        // Generate JWT token
        const token = generateJWT(user);
        
        // Return user data without password
        const { password: _, verificationToken: __, passwordResetToken: ___, ...userResponse } = updatedUser;
        
        res.json({ 
            message: 'Login successful', 
            user: userResponse,
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed. Please try again.' });
    }
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

// Block/Unblock Users
app.post('/users/:username/block', async (req, res) => {
    const { username } = req.params;
    const { blockerUsername } = req.body;
    
    if (!blockerUsername) {
        return res.status(400).json({ message: 'Blocker username is required' });
    }
    
    if (username === blockerUsername) {
        return res.status(400).json({ message: 'Cannot block yourself' });
    }
    
    try {
        const blocker = await database.getUserByUsername(blockerUsername);
        if (!blocker) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const blockedUsers = blocker.blockedUsers || [];
        if (blockedUsers.includes(username)) {
            return res.status(400).json({ message: 'User already blocked' });
        }
        
        const updatedBlocker = {
            ...blocker,
            blockedUsers: [...blockedUsers, username],
            // Remove from following/followers if blocking
            following: (blocker.following || []).filter(u => u !== username),
            followers: (blocker.followers || []).filter(u => u !== username)
        };
        
        await database.updateUser(blockerUsername, updatedBlocker);
        
app.post('/users/:username/unblock', async (req, res) => {
    const { username } = req.params;
    const { blockerUsername } = req.body;
    
    if (!blockerUsername) {
        return res.status(400).json({ message: 'Blocker username is required' });
    }
    
    try {
        const blocker = await database.getUserByUsername(blockerUsername);
        if (!blocker) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const blockedUsers = blocker.blockedUsers || [];
        if (!blockedUsers.includes(username)) {
            return res.status(400).json({ message: 'User is not blocked' });
        }
        
        const updatedBlocker = {
            ...blocker,
            blockedUsers: blockedUsers.filter(u => u !== username)
        };
        
        await database.updateUser(blockerUsername, updatedBlocker);
        
        res.json({ message: 'User unblocked successfully' });
    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({ message: 'Failed to unblock user' });
    }
});

// Get blocked users
app.get('/users/:username/blocked', async (req, res) => {
    const { username } = req.params;
    
    try {
        const user = await database.getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const blockedUsers = user.blockedUsers || [];
        res.json({ blockedUsers });
    } catch (error) {
        console.error('Get blocked users error:', error);
        res.status(500).json({ message: 'Failed to get blocked users' });
    }
});

// Search users
app.get('/search/users', async (req, res) => {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
        return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }
    
    try {
        const users = await database.getUsers();
        const searchResults = users
            .filter(user => 
                user.name.toLowerCase().includes(q.toLowerCase()) ||
                user.username.toLowerCase().includes(q.toLowerCase()) ||
                (user.bio && user.bio.toLowerCase().includes(q.toLowerCase()))
            )
            .map(({ password, verificationToken, passwordResetToken, ...user }) => user)
            .slice(0, 20); // Limit to 20 results
        
        res.json(searchResults);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ message: 'Failed to search users' });
    }
});

// Check follow status between users
app.get('/users/:username/follow-status/:otherUsername', async (req, res) => {
    const { username, otherUsername } = req.params;
    
    try {
        const user = await database.getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const isFollowing = (user.following || []).includes(otherUsername);
        const isFollowedBy = (user.followers || []).includes(otherUsername);
        const isBlocked = (user.blockedUsers || []).includes(otherUsername);
        
        res.json({
            isFollowing,
            isFollowedBy,
            isBlocked
        });
    } catch (error) {
        console.error('Follow status error:', error);
        res.status(500).json({ message: 'Failed to get follow status' });
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

// Delete user account
app.delete('/users/:username', async (req, res) => {
    const { username } = req.params;
    const { password } = req.body;
    
    if (!password) {
        return res.status(400).json({ message: 'Password confirmation required' });
    }
    
    try {
        const user = await database.getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid password' });
        }
        
        // Remove user from all followers/following lists
        const allUsers = await database.getUsers();
        for (const otherUser of allUsers) {
            if (otherUser.username !== username) {
                const needsUpdate = 
                    (otherUser.following && otherUser.following.includes(username)) ||
                    (otherUser.followers && otherUser.followers.includes(username)) ||
                    (otherUser.blockedUsers && otherUser.blockedUsers.includes(username));
                
                if (needsUpdate) {
                    const updatedOtherUser = {
                        ...otherUser,
                        following: (otherUser.following || []).filter(u => u !== username),
                        followers: (otherUser.followers || []).filter(u => u !== username),
                        blockedUsers: (otherUser.blockedUsers || []).filter(u => u !== username),
                        followingCount: Math.max(0, (otherUser.followingCount || 0) - (otherUser.following?.includes(username) ? 1 : 0)),
                        followerCount: Math.max(0, (otherUser.followerCount || 0) - (otherUser.followers?.includes(username) ? 1 : 0))
                    };
                    await database.updateUser(otherUser.username, updatedOtherUser);
                }
            }
        }
        
        // Delete user account
        await database.deleteUser(username);
        
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ message: 'Failed to delete account' });
    }
});

// Add user endpoint (alias for register)
app.post('/users', async (req, res) => {
    const { username, password, email, name, bio } = req.body;
    
    // Validation
    if (!username || !password || !email) {
        return res.status(400).json({ message: 'Username, password, and email are required' });
    }
    
    // Check if user already exists
    const existingUser = await database.getUserByUsername(username);
    if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Create avatar from username initials
    const avatar = username.substring(0, 2).toUpperCase();
    
    // Create new user
    const newUser = {
        username,
        password, // In production, this should be hashed
        name: name || username.charAt(0).toUpperCase() + username.slice(1),
        email,
        avatar,
        bio: bio || 'New to Neex Social! 🌟',
        verified: false,
        followers: 0,
        following: 0,
        posts: 0,
        joinDate: new Date().toISOString()
    };
    
    const savedUser = await database.addUser(newUser);
    
    if (savedUser) {
        // Return user data without password
        const { password: _, ...userResponse } = savedUser;
        res.json({ 
            message: 'User created successfully', 
            user: userResponse 
        });
    } else {
        res.status(500).json({ message: 'Failed to create user' });
    }
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

// Comments system
app.post('/posts/:postId/comments', (req, res) => {
    const { postId } = req.params;
    const { username, content } = req.body;
    
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
