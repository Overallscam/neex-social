const fs = require('fs');
const path = require('path');

// PostgreSQL support for Railway
let pool = null;
const isProduction = process.env.NODE_ENV === 'production';
const hasDatabase = process.env.DATABASE_URL;

if (hasDatabase) {
  try {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction ? { rejectUnauthorized: false } : false
    });
    console.log('🐘 PostgreSQL connected for production');
  } catch (error) {
    console.log('📁 PostgreSQL not available, using JSON files');
  }
}

// Fallback to JSON files for local development
const DATA_DIR = path.join(__dirname, 'data');
const USERS_DB = path.join(DATA_DIR, 'users.json');
const POSTS_DB = path.join(DATA_DIR, 'posts.json');
const MESSAGES_DB = path.join(DATA_DIR, 'messages.json');

// Create data directory if it doesn't exist (local only)
if (!hasDatabase && !fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Initialize PostgreSQL tables
const initializePostgreSQL = async () => {
  if (!pool) return;
  
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        avatar VARCHAR(10) NOT NULL,
        bio TEXT,
        verified BOOLEAN DEFAULT FALSE,
        followers INTEGER DEFAULT 0,
        following INTEGER DEFAULT 0,
        join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create posts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        image VARCHAR(255),
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        likes TEXT[] DEFAULT '{}',
        reactions JSONB DEFAULT '{"like": 0, "heart": 0, "laugh": 0}',
        is_anonymous BOOLEAN DEFAULT FALSE,
        original_user VARCHAR(50)
      )
    `);

    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        from_user VARCHAR(50) NOT NULL,
        to_user VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if we need to insert initial data
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      // Insert initial users
      const initialUsers = [
        ['john', '123', 'John Doe', 'john@example.com', 'JD', "Hello! I'm John 👋", true, 1234, 567],
        ['alice', '123', 'Alice Johnson', 'alice@example.com', 'AJ', 'Love coffee and books ☕📚', true, 987, 432],
        ['bob', '123', 'Bob Chen', 'bob@example.com', 'BC', 'Tech enthusiast 💻', false, 543, 789],
        ['sarah', '123', 'Sarah Garcia', 'sarah@example.com', 'SG', 'Designer & creator 🎨', true, 2156, 234]
      ];

      for (const user of initialUsers) {
        await pool.query(
          'INSERT INTO users (username, password, name, email, avatar, bio, verified, followers, following) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          user
        );
      }

      // Insert initial posts
      const initialPosts = [
        ['john', 'Hello everyone! This is my first post 👋', null, false, null],
        ['alice', 'Beautiful day today! ☀️', null, false, null],
        ['bob', 'Just finished reading a great book 📚', null, false, null]
      ];

      for (const post of initialPosts) {
        await pool.query(
          'INSERT INTO posts (username, content, image, is_anonymous, original_user) VALUES ($1, $2, $3, $4, $5)',
          post
        );
      }
    }

    console.log('✅ PostgreSQL tables initialized');
  } catch (error) {
    console.error('❌ PostgreSQL initialization error:', error);
  }
};

// Initialize JSON files for local development
const initializeJSONFiles = () => {
  if (hasDatabase) return; // Skip if using PostgreSQL
  
  // Initialize users database
  if (!fs.existsSync(USERS_DB)) {
    const initialUsers = [
      { 
        id: 1, username: 'john', password: '123', name: 'John Doe',
        email: 'john@example.com', avatar: 'JD', bio: 'Hello! I\'m John 👋',
        verified: true, followers: 1234, following: 567, joinDate: new Date('2025-08-20').toISOString()
      },
      { 
        id: 2, username: 'alice', password: '123', name: 'Alice Johnson',
        email: 'alice@example.com', avatar: 'AJ', bio: 'Love coffee and books ☕📚',
        verified: true, followers: 987, following: 432, joinDate: new Date('2025-08-21').toISOString()
      },
      { 
        id: 3, username: 'bob', password: '123', name: 'Bob Chen',
        email: 'bob@example.com', avatar: 'BC', bio: 'Tech enthusiast 💻',
        verified: false, followers: 543, following: 789, joinDate: new Date('2025-08-22').toISOString()
      },
      { 
        id: 4, username: 'sarah', password: '123', name: 'Sarah Garcia',
        email: 'sarah@example.com', avatar: 'SG', bio: 'Designer & creator 🎨',
        verified: true, followers: 2156, following: 234, joinDate: new Date('2025-08-23').toISOString()
      }
    ];
    fs.writeFileSync(USERS_DB, JSON.stringify(initialUsers, null, 2));
  }

  // Initialize posts database
  if (!fs.existsSync(POSTS_DB)) {
    const initialPosts = [
      { 
        id: 1, username: 'john', content: 'Hello everyone! This is my first post 👋', 
        date: new Date('2025-08-25T10:00:00').toISOString(), image: null, likes: ['alice'], 
        reactions: { like: 1, heart: 0, laugh: 0 }, isAnonymous: false
      },
      { 
        id: 2, username: 'alice', content: 'Beautiful day today! ☀️', 
        date: new Date('2025-08-25T11:30:00').toISOString(), image: null, likes: ['john', 'bob'], 
        reactions: { like: 2, heart: 0, laugh: 0 }, isAnonymous: false
      },
      { 
        id: 3, username: 'bob', content: 'Just finished reading a great book 📚', 
        date: new Date('2025-08-25T12:15:00').toISOString(), image: null, likes: ['sarah'], 
        reactions: { like: 1, heart: 0, laugh: 0 }, isAnonymous: false
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

// Hybrid database operations
const db = {
  // Users operations
  users: {
    getAll: async () => {
      if (pool) {
        try {
          const result = await pool.query('SELECT * FROM users ORDER BY id');
          return result.rows.map(row => ({
            id: row.id,
            username: row.username,
            password: row.password,
            name: row.name,
            email: row.email,
            avatar: row.avatar,
            bio: row.bio,
            verified: row.verified,
            followers: row.followers,
            following: row.following,
            joinDate: row.join_date
          }));
        } catch (error) {
          console.error('PostgreSQL error:', error);
          return [];
        }
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
      if (pool) {
        // PostgreSQL doesn't need bulk save - handled by individual operations
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
      if (pool) {
        try {
          const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
          if (result.rows.length > 0) {
            const row = result.rows[0];
            return {
              id: row.id,
              username: row.username,
              password: row.password,
              name: row.name,
              email: row.email,
              avatar: row.avatar,
              bio: row.bio,
              verified: row.verified,
              followers: row.followers,
              following: row.following,
              joinDate: row.join_date
            };
          }
          return null;
        } catch (error) {
          console.error('PostgreSQL error:', error);
          return null;
        }
      } else {
        const users = await db.users.getAll();
        return users.find(user => user.username === username) || null;
      }
    },
    
    findByEmail: async (email) => {
      if (pool) {
        try {
          const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
          return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
          console.error('PostgreSQL error:', error);
          return null;
        }
      } else {
        const users = await db.users.getAll();
        return users.find(user => user.email === email) || null;
      }
    },
    
    add: async (user) => {
      if (pool) {
        try {
          const result = await pool.query(
            'INSERT INTO users (username, password, name, email, avatar, bio, verified, followers, following) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [user.username, user.password, user.name, user.email, user.avatar, user.bio || 'Hello, I\'m new to NEEX! 👋', false, 0, 0]
          );
          const row = result.rows[0];
          return {
            id: row.id,
            username: row.username,
            password: row.password,
            name: row.name,
            email: row.email,
            avatar: row.avatar,
            bio: row.bio,
            verified: row.verified,
            followers: row.followers,
            following: row.following,
            joinDate: row.join_date
          };
        } catch (error) {
          console.error('PostgreSQL error:', error);
          return null;
        }
      } else {
        const users = await db.users.getAll();
        const maxId = users.length > 0 ? Math.max(...users.map(u => u.id)) : 0;
        user.id = maxId + 1;
        users.push(user);
        return (await db.users.save(users)) ? user : null;
      }
    }
  },
  
  // Posts operations
  posts: {
    getAll: async () => {
      if (pool) {
        try {
          const result = await pool.query('SELECT * FROM posts ORDER BY date DESC');
          return result.rows.map(row => ({
            id: row.id,
            username: row.username,
            content: row.content,
            image: row.image,
            date: row.date,
            likes: row.likes || [],
            reactions: row.reactions || { like: 0, heart: 0, laugh: 0 },
            isAnonymous: row.is_anonymous,
            originalUser: row.original_user
          }));
        } catch (error) {
          console.error('PostgreSQL error:', error);
          return [];
        }
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
      if (pool) {
        return true; // PostgreSQL handles this automatically
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
      if (pool) {
        try {
          const result = await pool.query(
            'INSERT INTO posts (username, content, image, is_anonymous, original_user, likes, reactions) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [post.username, post.content, post.image, post.isAnonymous, post.originalUser, post.likes || [], JSON.stringify(post.reactions || { like: 0, heart: 0, laugh: 0 })]
          );
          const row = result.rows[0];
          return {
            id: row.id,
            username: row.username,
            content: row.content,
            image: row.image,
            date: row.date,
            likes: row.likes || [],
            reactions: row.reactions || { like: 0, heart: 0, laugh: 0 },
            isAnonymous: row.is_anonymous,
            originalUser: row.original_user
          };
        } catch (error) {
          console.error('PostgreSQL error:', error);
          return null;
        }
      } else {
        const posts = await db.posts.getAll();
        const maxId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) : 0;
        post.id = maxId + 1;
        posts.unshift(post);
        return (await db.posts.save(posts)) ? post : null;
      }
    }
  },
  
  // Messages operations (similar hybrid approach)
  messages: {
    getAll: async () => {
      if (pool) {
        try {
          const result = await pool.query('SELECT * FROM messages ORDER BY date DESC');
          return result.rows.map(row => ({
            id: row.id,
            from: row.from_user,
            to: row.to_user,
            content: row.content,
            date: row.date
          }));
        } catch (error) {
          console.error('PostgreSQL error:', error);
          return [];
        }
      } else {
        try {
          const data = fs.readFileSync(MESSAGES_DB, 'utf8');
          return JSON.parse(data);
        } catch (error) {
          console.error('Error reading messages database:', error);
          return [];
        }
      }
    },
    
    add: async (message) => {
      if (pool) {
        try {
          const result = await pool.query(
            'INSERT INTO messages (from_user, to_user, content) VALUES ($1, $2, $3) RETURNING *',
            [message.from, message.to, message.content]
          );
          return result.rows[0];
        } catch (error) {
          console.error('PostgreSQL error:', error);
          return null;
        }
      } else {
        const messages = await db.messages.getAll();
        messages.push(message);
        try {
          fs.writeFileSync(MESSAGES_DB, JSON.stringify(messages, null, 2));
          return true;
        } catch (error) {
          console.error('Error saving messages database:', error);
          return false;
        }
      }
    }
  }
};

// Initialize database based on environment
const initializeDatabase = async () => {
  if (hasDatabase) {
    await initializePostgreSQL();
  } else {
    initializeJSONFiles();
  }
};

// Export for use in server.js
module.exports = { db, initializeDatabase, isProduction: !!hasDatabase };
