// Firebase Realtime Database Configuration for NEEX Social Media App
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, push, set, get, child, query, orderByChild, limitToLast } = require('firebase/database');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCEUX19EIV2tKsqRZiYPiQ64Wfgb6QLvwo",
  authDomain: "neex-57c2e.firebaseapp.com",
  projectId: "neex-57c2e",
  databaseURL: "https://neex-57c2e-default-rtdb.firebaseio.com/", // Realtime Database URL
  storageBucket: "neex-57c2e.firebasestorage.app",
  messagingSenderId: "996705907990",
  appId: "1:996705907990:web:47602beb05a5fd9d514c37",
  measurementId: "G-90K6GVY92F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

class RealtimeDatabase {
  constructor() {
    this.db = database;
    this.collections = {
      users: 'users',
      posts: 'posts',
      messages: 'messages'
    };
  }

  // User operations
  async addUser(userData) {
    try {
      const usersRef = ref(this.db, this.collections.users);
      const newUserRef = push(usersRef);
      const userWithMeta = {
        ...userData,
        joinDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      await set(newUserRef, userWithMeta);
      return { id: newUserRef.key, ...userWithMeta };
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  }

  async getUsers() {
    try {
      const usersRef = ref(this.db, this.collections.users);
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const users = [];
        snapshot.forEach((childSnapshot) => {
          users.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
        return users;
      }
      return [];
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  async getUserByUsername(username) {
    try {
      const users = await this.getUsers();
      return users.find(user => user.username === username) || null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  }

  async updateUser(userId, updates) {
    try {
      const userRef = ref(this.db, `${this.collections.users}/${userId}`);
      await set(userRef, updates);
      return { id: userId, ...updates };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Post operations
  async addPost(postData) {
    try {
      const postsRef = ref(this.db, this.collections.posts);
      const newPostRef = push(postsRef);
      const postWithMeta = {
        ...postData,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        likes: postData.likes || [],
        reactions: postData.reactions || {
          like: 0,
          heart: 0,
          laugh: 0
        }
      };
      await set(newPostRef, postWithMeta);
      return { id: newPostRef.key, ...postWithMeta };
    } catch (error) {
      console.error('Error adding post:', error);
      throw error;
    }
  }

  async getPosts() {
    try {
      const postsRef = ref(this.db, this.collections.posts);
      const postsQuery = query(postsRef, orderByChild('createdAt'), limitToLast(20));
      const snapshot = await get(postsQuery);
      if (snapshot.exists()) {
        const posts = [];
        snapshot.forEach((childSnapshot) => {
          posts.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
        return posts.reverse(); // Most recent first
      }
      return [];
    } catch (error) {
      console.error('Error getting posts:', error);
      throw error;
    }
  }

  async updatePost(postId, updates) {
    try {
      const postRef = ref(this.db, `${this.collections.posts}/${postId}`);
      const snapshot = await get(postRef);
      if (snapshot.exists()) {
        const updatedPost = { ...snapshot.val(), ...updates };
        await set(postRef, updatedPost);
        return { id: postId, ...updatedPost };
      }
      return null;
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  async deletePost(postId) {
    try {
      const postRef = ref(this.db, `${this.collections.posts}/${postId}`);
      await set(postRef, null);
      return { success: true };
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  // Message operations
  async addMessage(messageData) {
    try {
      const messagesRef = ref(this.db, this.collections.messages);
      const newMessageRef = push(messagesRef);
      const messageWithMeta = {
        ...messageData,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      await set(newMessageRef, messageWithMeta);
      return { id: newMessageRef.key, ...messageWithMeta };
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  async getMessages() {
    try {
      const messagesRef = ref(this.db, this.collections.messages);
      const messagesQuery = query(messagesRef, orderByChild('createdAt'));
      const snapshot = await get(messagesQuery);
      if (snapshot.exists()) {
        const messages = [];
        snapshot.forEach((childSnapshot) => {
          messages.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
        return messages;
      }
      return [];
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  // Initialize with sample data
  async initializeSampleData() {
    try {
      const users = await this.getUsers();
      const posts = await this.getPosts();

      // Add sample users if none exist
      if (users.length === 0) {
        console.log('🔥 Initializing Realtime Database with sample data...');
        
        const sampleUsers = [
          {
            username: "john",
            password: "123",
            name: "John Doe",
            email: "john@example.com",
            avatar: "JD",
            bio: "Hello! I'm John 👋",
            verified: true,
            followers: 1234,
            following: 567
          },
          {
            username: "alice",
            password: "123",
            name: "Alice Johnson",
            email: "alice@example.com",
            avatar: "AJ",
            bio: "Love coffee and books ☕📚",
            verified: true,
            followers: 987,
            following: 432
          },
          {
            username: "bob",
            password: "123",
            name: "Bob Chen",
            email: "bob@example.com",
            avatar: "BC",
            bio: "Tech enthusiast 💻",
            verified: false,
            followers: 543,
            following: 789
          },
          {
            username: "sarah",
            password: "123",
            name: "Sarah Garcia",
            email: "sarah@example.com",
            avatar: "SG",
            bio: "Designer & creator 🎨",
            verified: true,
            followers: 2156,
            following: 234
          }
        ];

        for (const user of sampleUsers) {
          await this.addUser(user);
        }
      }

      // Add sample posts if none exist
      if (posts.length === 0) {
        const samplePosts = [
          {
            username: "john",
            content: "Hello everyone! This is my first post 👋",
            image: null,
            likes: ["alice"],
            reactions: { like: 1, heart: 0, laugh: 0 },
            isAnonymous: false
          },
          {
            username: "alice",
            content: "Beautiful day today! ☀️",
            image: null,
            likes: ["john", "bob"],
            reactions: { like: 2, heart: 0, laugh: 0 },
            isAnonymous: false
          },
          {
            username: "bob",
            content: "Just finished reading a great book 📚",
            image: null,
            likes: ["sarah"],
            reactions: { like: 1, heart: 0, laugh: 0 },
            isAnonymous: false
          }
        ];

        for (const post of samplePosts) {
          await this.addPost(post);
        }
      }

      console.log('✅ Realtime Database initialized successfully!');
    } catch (error) {
      console.error('Error initializing sample data:', error);
    }
  }
}

module.exports = { RealtimeDatabase, firebaseConfig };
