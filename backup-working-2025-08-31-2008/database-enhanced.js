// Enhanced Database System: Firebase + PostgreSQL + JSON Fallback
const fs = require('fs');
const path = require('path');

// Database adapters
let FirebaseDatabase = null;
let PostgreSQLDatabase = null;

// Try to load Firebase
try {
  const { RealtimeDatabase } = require('./firebase-realtime-config');
  FirebaseDatabase = RealtimeDatabase;
} catch (error) {
  console.log('📝 Firebase not configured, will use fallback');
}

// Try to load PostgreSQL
try {
  const { Pool } = require('pg');
  PostgreSQLDatabase = Pool;
} catch (error) {
  console.log('📝 PostgreSQL not available, will use fallback');
}

class EnhancedDatabase {
  constructor() {
    this.dataDir = path.join(__dirname, 'data');
    this.dbType = this.detectDatabaseType();
    this.initialize();
  }

  detectDatabaseType() {
    // Priority: Firebase > PostgreSQL > JSON Files
    if (process.env.FIREBASE_PROJECT_ID && FirebaseDatabase) {
      return 'firebase-realtime';
    } else if (process.env.DATABASE_URL && PostgreSQLDatabase) {
      return 'postgresql';
    } else {
      return 'json';
    }
  }

  async initialize() {
    console.log(`🔥 Database Type: ${this.dbType.toUpperCase()}`);
    
    switch (this.dbType) {
      case 'firebase-realtime':
        this.db = new FirebaseDatabase();
        await this.db.initializeSampleData();
        break;
      case 'postgresql':
        await this.initializePostgreSQL();
        break;
      case 'json':
        this.initializeJSONFiles();
        break;
    }
  }

  async initializePostgreSQL() {
    this.pool = new PostgreSQLDatabase({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Create tables
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        avatar VARCHAR(10),
        bio TEXT,
        verified BOOLEAN DEFAULT false,
        followers INTEGER DEFAULT 0,
        following INTEGER DEFAULT 0,
        join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        image VARCHAR(255),
        likes TEXT DEFAULT '[]',
        reactions JSONB DEFAULT '{"like": 0, "heart": 0, "laugh": 0}',
        is_anonymous BOOLEAN DEFAULT false
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        from_user VARCHAR(50) NOT NULL,
        to_user VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read BOOLEAN DEFAULT false
      )
    `);
  }

  initializeJSONFiles() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const files = ['users.json', 'posts.json', 'messages.json'];
    files.forEach(file => {
      const filePath = path.join(this.dataDir, file);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]');
      }
    });
  }

  // User operations
  async getUsers() {
    switch (this.dbType) {
      case 'firebase-realtime':
        return await this.db.getUsers();
      case 'postgresql':
        const result = await this.pool.query('SELECT * FROM users ORDER BY id');
        return result.rows;
      case 'json':
        const data = fs.readFileSync(path.join(this.dataDir, 'users.json'));
        return JSON.parse(data);
    }
  }

  async addUser(userData) {
    switch (this.dbType) {
      case 'firebase-realtime':
        return await this.db.addUser(userData);
      case 'postgresql':
        const result = await this.pool.query(
          'INSERT INTO users (username, password, name, email, avatar, bio, verified, followers, following) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
          [userData.username, userData.password, userData.name, userData.email, userData.avatar, userData.bio, userData.verified || false, userData.followers || 0, userData.following || 0]
        );
        return result.rows[0];
      case 'json':
        const users = await this.getUsers();
        const newUser = { id: Date.now(), ...userData, joinDate: new Date().toISOString() };
        users.push(newUser);
        fs.writeFileSync(path.join(this.dataDir, 'users.json'), JSON.stringify(users, null, 2));
        return newUser;
    }
  }

  async getUserByUsername(username) {
    switch (this.dbType) {
      case 'firebase-realtime':
        return await this.db.getUserByUsername(username);
      case 'postgresql':
        const result = await this.pool.query('SELECT * FROM users WHERE username = $1', [username]);
        return result.rows[0] || null;
      case 'json':
        const users = await this.getUsers();
        return users.find(user => user.username === username) || null;
    }
  }

  // Post operations
  async getPosts() {
    switch (this.dbType) {
      case 'firebase-realtime':
        return await this.db.getPosts();
      case 'postgresql':
        const result = await this.pool.query('SELECT * FROM posts ORDER BY date DESC');
        return result.rows.map(row => ({
          ...row,
          likes: JSON.parse(row.likes || '[]'),
          reactions: row.reactions || { like: 0, heart: 0, laugh: 0 }
        }));
      case 'json':
        const data = fs.readFileSync(path.join(this.dataDir, 'posts.json'));
        return JSON.parse(data);
    }
  }

  async addPost(postData) {
    switch (this.dbType) {
      case 'firebase-realtime':
        return await this.db.addPost(postData);
      case 'postgresql':
        const result = await this.pool.query(
          'INSERT INTO posts (username, content, image, likes, reactions, is_anonymous) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [postData.username, postData.content, postData.image, JSON.stringify(postData.likes || []), postData.reactions || { like: 0, heart: 0, laugh: 0 }, postData.isAnonymous || false]
        );
        return result.rows[0];
      case 'json':
        const posts = await this.getPosts();
        const newPost = { 
          id: Date.now(), 
          ...postData, 
          date: new Date().toISOString(),
          likes: postData.likes || [],
          reactions: postData.reactions || { like: 0, heart: 0, laugh: 0 }
        };
        posts.unshift(newPost);
        fs.writeFileSync(path.join(this.dataDir, 'posts.json'), JSON.stringify(posts, null, 2));
        return newPost;
    }
  }

  async updatePost(postId, updates) {
    switch (this.dbType) {
      case 'firebase-realtime':
        return await this.db.updatePost(postId, updates);
      case 'postgresql':
        const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
        const values = [postId, ...Object.values(updates)];
        const result = await this.pool.query(
          `UPDATE posts SET ${setClause} WHERE id = $1 RETURNING *`,
          values
        );
        return result.rows[0];
      case 'json':
        const posts = await this.getPosts();
        const index = posts.findIndex(post => post.id.toString() === postId.toString());
        if (index !== -1) {
          posts[index] = { ...posts[index], ...updates };
          fs.writeFileSync(path.join(this.dataDir, 'posts.json'), JSON.stringify(posts, null, 2));
          return posts[index];
        }
        return null;
    }
  }

  // Message operations
  async getMessages() {
    switch (this.dbType) {
      case 'firebase-realtime':
        return await this.db.getMessages();
      case 'postgresql':
        const result = await this.pool.query('SELECT * FROM messages ORDER BY timestamp');
        return result.rows;
      case 'json':
        const data = fs.readFileSync(path.join(this.dataDir, 'messages.json'));
        return JSON.parse(data);
    }
  }

  async addMessage(messageData) {
    switch (this.dbType) {
      case 'firebase-realtime':
        return await this.db.addMessage(messageData);
      case 'postgresql':
        const result = await this.pool.query(
          'INSERT INTO messages (from_user, to_user, message, read) VALUES ($1, $2, $3, $4) RETURNING *',
          [messageData.from, messageData.to, messageData.message, messageData.read || false]
        );
        return result.rows[0];
      case 'json':
        const messages = await this.getMessages();
        const newMessage = { id: Date.now(), ...messageData, timestamp: new Date().toISOString() };
        messages.push(newMessage);
        fs.writeFileSync(path.join(this.dataDir, 'messages.json'), JSON.stringify(messages, null, 2));
        return newMessage;
    }
  }

  getStatus() {
    const status = {
      'firebase-realtime': this.dbType === 'firebase-realtime' ? '🔥 Active' : '⚪ Available',
      postgresql: this.dbType === 'postgresql' ? '🐘 Active' : '⚪ Available', 
      json: this.dbType === 'json' ? '📄 Active' : '⚪ Fallback'
    };
    return { current: this.dbType, status };
  }
}

module.exports = { EnhancedDatabase };
