
const fs = require('fs');
const path = require('path');

const admin = require('firebase-admin');
let firebaseInitialized = false;
try {
    if (!admin.apps.length) {
        let serviceAccount;
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        } else {
            serviceAccount = require('./firebase-service-account.json'); // fallback for local dev
        }
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://neex-57c2e-default-rtdb.firebaseio.com'
        });
        firebaseInitialized = true;
        console.log('✅ Firebase Admin initialized');
    }
} catch (err) {
    console.warn('⚠️ Firebase Admin not initialized:', err.message);
}



// Database file paths (for local/dev fallback)
const DATA_DIR = path.join(__dirname, 'data');
const USERS_DB = path.join(DATA_DIR, 'users.json');
const POSTS_DB = path.join(DATA_DIR, 'posts.json');
const MESSAGES_DB = path.join(DATA_DIR, 'messages.json');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Initialize database files if they don't exist
const initializeDatabase = () => {
    // Initialize users database
    if (!fs.existsSync(USERS_DB)) {
        const initialUsers = [
            { 
                id: 1,
                username: 'john', 
                password: '123', 
                name: 'John Doe',
                email: 'john@example.com',
                avatar: 'JD', 
                bio: 'Hello! I\'m John 👋',
                verified: true,
                followers: 1234,
                following: 567,
                joinDate: new Date('2025-08-20').toISOString()
            },
            { 
                id: 2,
                username: 'alice', 
                password: '123', 
                name: 'Alice Johnson',
                email: 'alice@example.com',
                avatar: 'AJ', 
                bio: 'Love coffee and books ☕📚',
                verified: true,
                followers: 987,
                following: 432,
                joinDate: new Date('2025-08-21').toISOString()
            },
            { 
                id: 3,
                username: 'bob', 
                password: '123', 
                name: 'Bob Chen',
                email: 'bob@example.com',
                avatar: 'BC', 
                bio: 'Tech enthusiast 💻',
                verified: false,
                followers: 543,
                following: 789,
                joinDate: new Date('2025-08-22').toISOString()
            },
            { 
                id: 4,
                username: 'sarah', 
                password: '123', 
                name: 'Sarah Garcia',
                email: 'sarah@example.com',
                avatar: 'SG', 
                bio: 'Designer & creator 🎨',
                verified: true,
                followers: 2156,
                following: 234,
                joinDate: new Date('2025-08-23').toISOString()
            }
        ];
        fs.writeFileSync(USERS_DB, JSON.stringify(initialUsers, null, 2));
    }

    // Initialize posts database
    if (!fs.existsSync(POSTS_DB)) {
        const initialPosts = [
            { 
                id: 1, 
                username: 'john', 
                content: 'Hello everyone! This is my first post 👋', 
                date: new Date('2025-08-25T10:00:00').toISOString(), 
                image: null, 
                likes: ['alice'], 
                reactions: { like: 1, heart: 0, laugh: 0 },
                isAnonymous: false
            },
            { 
                id: 2, 
                username: 'alice', 
                content: 'Beautiful day today! ☀️', 
                date: new Date('2025-08-25T11:30:00').toISOString(), 
                image: null, 
                likes: ['john', 'bob'], 
                reactions: { like: 2, heart: 0, laugh: 0 },
                isAnonymous: false
            },
            { 
                id: 3, 
                username: 'bob', 
                content: 'Just finished reading a great book 📚', 
                date: new Date('2025-08-25T12:15:00').toISOString(), 
                image: null, 
                likes: ['sarah'], 
                reactions: { like: 1, heart: 0, laugh: 0 },
                isAnonymous: false
            }
        ];
        fs.writeFileSync(POSTS_DB, JSON.stringify(initialPosts, null, 2));
    }

    // Initialize messages database
    if (!fs.existsSync(MESSAGES_DB)) {
        const initialMessages = [
            { from: 'john', to: 'alice', content: 'Hey Alice, how are you?', date: new Date('2025-08-25T09:00:00').toISOString() },
            { from: 'alice', to: 'john', content: 'Hi John! I\'m doing great, thanks for asking!', date: new Date('2025-08-25T09:05:00').toISOString() }
        ];
        fs.writeFileSync(MESSAGES_DB, JSON.stringify(initialMessages, null, 2));
    }
};


// Database operations
const db = {
    // Users operations
    users: {
        getAll: async () => {
            if (firebaseInitialized) {
                const snap = await admin.database().ref('users').once('value');
                const users = snap.val() || {};
                return Object.values(users);
            } else {
                try {
                    const data = fs.readFileSync(USERS_DB, 'utf8');
                    return JSON.parse(data);
                } catch (error) {
                    console.error('Error reading users database:', error);
                    return [];
                }
            }
        },
        save: async (users) => {
            if (firebaseInitialized) {
                // Overwrite all users (not recommended for prod, but matches local logic)
                await admin.database().ref('users').set(users.reduce((acc, u) => { acc[u.username] = u; return acc; }, {}));
                return true;
            } else {
                try {
                    fs.writeFileSync(USERS_DB, JSON.stringify(users, null, 2));
                    return true;
                } catch (error) {
                    console.error('Error saving users database:', error);
                    return false;
                }
            }
        },
        findByUsername: async (username) => {
            if (firebaseInitialized) {
                const snap = await admin.database().ref('users/' + username).once('value');
                return snap.val();
            } else {
                const users = db.users.getAll();
                return users.find(user => user.username === username);
            }
        },
        findByEmail: async (email) => {
            if (firebaseInitialized) {
                const snap = await admin.database().ref('users').orderByChild('email').equalTo(email).once('value');
                const users = snap.val() || {};
                return Object.values(users)[0];
            } else {
                const users = db.users.getAll();
                return users.find(user => user.email === email);
            }
        },
        update: async (username, updatedUser) => {
            if (firebaseInitialized) {
                await admin.database().ref('users/' + username).update(updatedUser);
                const snap = await admin.database().ref('users/' + username).once('value');
                return snap.val();
            } else {
                const users = db.users.getAll();
                const index = users.findIndex(user => user.username === username);
                if (index !== -1) {
                    users[index] = { ...users[index], ...updatedUser };
                    return db.users.save(users) ? users[index] : null;
                }
                return null;
            }
        },
        delete: async (username) => {
            if (firebaseInitialized) {
                await admin.database().ref('users/' + username).remove();
                return true;
            } else {
                const users = db.users.getAll();
                const filteredUsers = users.filter(user => user.username !== username);
                return db.users.save(filteredUsers);
            }
        },
        add: async (user) => {
            if (firebaseInitialized) {
                await admin.database().ref('users/' + user.username).set(user);
                return user;
            } else {
                const users = db.users.getAll();
                const maxId = users.length > 0 ? Math.max(...users.map(u => u.id)) : 0;
                user.id = maxId + 1;
                users.push(user);
                return db.users.save(users) ? user : null;
            }
        }
    },
    // Posts operations
    posts: {
        getAll: async () => {
            if (firebaseInitialized) {
                const snap = await admin.database().ref('posts').once('value');
                const posts = snap.val() || {};
                return Object.values(posts);
            } else {
                try {
                    const data = fs.readFileSync(POSTS_DB, 'utf8');
                    return JSON.parse(data);
                } catch (error) {
                    console.error('Error reading posts database:', error);
                    return [];
                }
            }
        },
        save: async (posts) => {
            if (firebaseInitialized) {
                // Overwrite all posts (not recommended for prod, but matches local logic)
                await admin.database().ref('posts').set(posts.reduce((acc, p) => { acc[p.id] = p; return acc; }, {}));
                return true;
            } else {
                try {
                    fs.writeFileSync(POSTS_DB, JSON.stringify(posts, null, 2));
                    return true;
                } catch (error) {
                    console.error('Error saving posts database:', error);
                    return false;
                }
            }
        },
        add: async (post) => {
            if (firebaseInitialized) {
                // Get max id
                const snap = await admin.database().ref('posts').once('value');
                const posts = snap.val() || {};
                const maxId = Object.values(posts).length > 0 ? Math.max(...Object.values(posts).map(p => p.id)) : 0;
                post.id = maxId + 1;
                await admin.database().ref('posts/' + post.id).set(post);
                return post;
            } else {
                const posts = db.posts.getAll();
                const maxId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) : 0;
                post.id = maxId + 1;
                posts.unshift(post);
                return db.posts.save(posts) ? post : null;
            }
        },
        update: async (postId, updatedPost) => {
            if (firebaseInitialized) {
                await admin.database().ref('posts/' + postId).update(updatedPost);
                const snap = await admin.database().ref('posts/' + postId).once('value');
                return snap.val();
            } else {
                const posts = db.posts.getAll();
                const index = posts.findIndex(p => p.id === postId);
                if (index !== -1) {
                    posts[index] = { ...posts[index], ...updatedPost };
                    return db.posts.save(posts) ? posts[index] : null;
                }
                return null;
            }
        },
        delete: async (postId) => {
            if (firebaseInitialized) {
                await admin.database().ref('posts/' + postId).remove();
                return true;
            } else {
                const posts = db.posts.getAll();
                const index = posts.findIndex(p => p.id === parseInt(postId));
                if (index === -1) {
                    return false;
                }
                posts.splice(index, 1);
                return db.posts.save(posts);
            }
        }
    }
};

// Initialize database on startup
initializeDatabase();


// Enhanced async wrapper functions for user management
const getUserByUsername = async (username) => db.users.findByUsername(username);
const updateUser = async (username, updatedUser) => db.users.update(username, updatedUser);
const deleteUser = async (username) => {
  const success = await db.users.delete(username);
  return { success, message: success ? 'User deleted' : 'User not found' };
};
const getUsers = async () => db.users.getAll();
const getUserByEmail = async (email) => db.users.findByEmail(email);
const addUser = async (user) => db.users.add(user);

// Enhanced async wrapper functions for posts management
const getPosts = async () => db.posts.getAll();
const addPost = async (post) => db.posts.add(post);
const updatePost = async (postId, updatedPost) => db.posts.update(postId, updatedPost);
const deletePost = async (postId) => {
  const success = await db.posts.delete(postId);
  return { success, message: success ? 'Post deleted successfully' : 'Failed to delete post' };
};

// (Messages and other functions remain file-based for now)

module.exports = {
  ...db,
  getUserByUsername,
  updateUser,
  deleteUser,
  getUsers,
  getUserByEmail,
  addUser,
  getPosts,
  addPost,
  deletePost,
  updatePost
};
