const fs = require('fs');
const path = require('path');

// Database file paths
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
        getAll: () => {
            try {
                const data = fs.readFileSync(USERS_DB, 'utf8');
                return JSON.parse(data);
            } catch (error) {
                console.error('Error reading users database:', error);
                return [];
            }
        },
        
        save: (users) => {
            try {
                fs.writeFileSync(USERS_DB, JSON.stringify(users, null, 2));
                return true;
            } catch (error) {
                console.error('Error saving users database:', error);
                return false;
            }
        },
        
        findByUsername: (username) => {
            const users = db.users.getAll();
            return users.find(user => user.username === username);
        },
        
        findByEmail: (email) => {
            const users = db.users.getAll();
            return users.find(user => user.email === email);
        },
        
        findByUsername: (username) => {
            const users = db.users.getAll();
            return users.find(user => user.username === username);
        },
        
        update: (username, updatedUser) => {
            const users = db.users.getAll();
            const index = users.findIndex(user => user.username === username);
            if (index !== -1) {
                users[index] = { ...users[index], ...updatedUser };
                return db.users.save(users) ? users[index] : null;
            }
            return null;
        },
        
        delete: (username) => {
            const users = db.users.getAll();
            const filteredUsers = users.filter(user => user.username !== username);
            return db.users.save(filteredUsers);
        },
        
        add: (user) => {
            const users = db.users.getAll();
            const maxId = users.length > 0 ? Math.max(...users.map(u => u.id)) : 0;
            user.id = maxId + 1;
            users.push(user);
            return db.users.save(users) ? user : null;
        }
    },
    
    // Posts operations
    posts: {
        getAll: () => {
            try {
                const data = fs.readFileSync(POSTS_DB, 'utf8');
                return JSON.parse(data);
            } catch (error) {
                console.error('Error reading posts database:', error);
                return [];
            }
        },
        
        save: (posts) => {
            try {
                fs.writeFileSync(POSTS_DB, JSON.stringify(posts, null, 2));
                return true;
            } catch (error) {
                console.error('Error saving posts database:', error);
                return false;
            }
        },
        
        add: (post) => {
            const posts = db.posts.getAll();
            const maxId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) : 0;
            post.id = maxId + 1;
            posts.unshift(post); // Add to beginning for chronological order
            return db.posts.save(posts) ? post : null;
        }
    },
    
    // Messages operations
    messages: {
        getAll: () => {
            try {
                const data = fs.readFileSync(MESSAGES_DB, 'utf8');
                return JSON.parse(data);
            } catch (error) {
                console.error('Error reading messages database:', error);
                return [];
            }
        },
        
        save: (messages) => {
            try {
                fs.writeFileSync(MESSAGES_DB, JSON.stringify(messages, null, 2));
                return true;
            } catch (error) {
                console.error('Error saving messages database:', error);
                return false;
            }
        },
        
        add: (message) => {
            const messages = db.messages.getAll();
            messages.push(message);
            return db.messages.save(messages);
        }
    }
};

// Initialize database on startup
initializeDatabase();

// Enhanced async wrapper functions for user management
const getUserByUsername = async (username) => {
    return db.users.findByUsername(username);
};

const updateUser = async (username, updatedUser) => {
    return db.users.update(username, updatedUser);
};

const deleteUser = async (username) => {
    const success = db.users.delete(username);
    return { success, message: success ? 'User deleted' : 'User not found' };
};

const updatePost = async (postId, updatedPost) => {
    const posts = db.posts.getAll();
    const index = posts.findIndex(p => p.id === postId);
    if (index !== -1) {
        posts[index] = { ...posts[index], ...updatedPost };
        return db.posts.save(posts) ? posts[index] : null;
    }
    return null;
};

const getUsers = async () => {
    return db.users.getAll();
};

const getUserByEmail = async (email) => {
    return db.users.findByEmail(email);
};

const addUser = async (user) => {
    return db.users.add(user);
};

// Enhanced async wrapper functions for posts management
const getPosts = async () => {
    return db.posts.getAll();
};

const addPost = async (post) => {
    return db.posts.add(post);
};

// Enhanced async wrapper functions for messages management
const getMessages = async () => {
    return db.messages.getAll();
};

const addMessage = async (message) => {
    return db.messages.add(message);
};

const deleteAllPosts = async () => {
    try {
        const posts = [];
        fs.writeFileSync(POSTS_DB, JSON.stringify(posts, null, 2));
        return { success: true, message: 'All posts deleted' };
    } catch (error) {
        console.error('Error deleting all posts:', error);
        return { success: false, error: error.message };
    }
};

const makeAllPostsAnonymous = async () => {
    try {
        const posts = JSON.parse(fs.readFileSync(POSTS_DB, 'utf8'));
        const anonymousPosts = posts.map(post => ({
            ...post,
            username: 'Anonymous',
            name: 'Anonymous',
            avatar: 'AN'
        }));
        fs.writeFileSync(POSTS_DB, JSON.stringify(anonymousPosts, null, 2));
        return { success: true, message: 'All posts made anonymous' };
    } catch (error) {
        console.error('Error making posts anonymous:', error);
        return { success: false, error: error.message };
    }
};

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
    updatePost,
    getMessages,
    addMessage,
    deleteAllPosts,
    makeAllPostsAnonymous
};
