// Firebase Configuration for NEEX Social Media App
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } = require('firebase/firestore');
const { getAuth } = require('firebase/auth');
const { getStorage } = require('firebase/storage');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCEUX19EIV2tKsqRZiYPiQ64Wfgb6QLvwo",
  authDomain: "neex-57c2e.firebaseapp.com",
  projectId: "neex-57c2e",
  storageBucket: "neex-57c2e.firebasestorage.app",
  messagingSenderId: "996705907990",
  appId: "1:996705907990:web:47602beb05a5fd9d514c37",
  measurementId: "G-90K6GVY92F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

class FirebaseDatabase {
  constructor() {
    this.db = db;
    this.collections = {
      users: 'users',
      posts: 'posts',
      messages: 'messages'
    };
  }

  // User operations
  async addUser(userData) {
    try {
      const docRef = await addDoc(collection(this.db, this.collections.users), {
        ...userData,
        joinDate: new Date().toISOString(),
        createdAt: new Date()
      });
      return { id: docRef.id, ...userData };
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  }

  async getUsers() {
    try {
      const querySnapshot = await getDocs(collection(this.db, this.collections.users));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  async getUserByUsername(username) {
    try {
      const q = query(collection(this.db, this.collections.users), where("username", "==", username));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  }

  async updateUser(userId, updates) {
    try {
      const userRef = doc(this.db, this.collections.users, userId);
      await updateDoc(userRef, updates);
      return { id: userId, ...updates };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Post operations
  async addPost(postData) {
    try {
      const docRef = await addDoc(collection(this.db, this.collections.posts), {
        ...postData,
        date: new Date().toISOString(),
        createdAt: new Date(),
        likes: postData.likes || [],
        reactions: postData.reactions || {
          like: 0,
          heart: 0,
          laugh: 0
        }
      });
      return { id: docRef.id, ...postData };
    } catch (error) {
      console.error('Error adding post:', error);
      throw error;
    }
  }

  async getPosts() {
    try {
      const q = query(collection(this.db, this.collections.posts), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting posts:', error);
      throw error;
    }
  }

  async updatePost(postId, updates) {
    try {
      const postRef = doc(this.db, this.collections.posts, postId);
      await updateDoc(postRef, updates);
      return { id: postId, ...updates };
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  async deletePost(postId) {
    try {
      await deleteDoc(doc(this.db, this.collections.posts, postId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  // Message operations
  async addMessage(messageData) {
    try {
      const docRef = await addDoc(collection(this.db, this.collections.messages), {
        ...messageData,
        timestamp: new Date().toISOString(),
        createdAt: new Date()
      });
      return { id: docRef.id, ...messageData };
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  async getMessages() {
    try {
      const q = query(collection(this.db, this.collections.messages), orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
        console.log('🔥 Initializing Firebase with sample data...');
        
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

      console.log('✅ Firebase initialized successfully!');
    } catch (error) {
      console.error('Error initializing sample data:', error);
    }
  }
}

module.exports = { FirebaseDatabase, firebaseConfig };
