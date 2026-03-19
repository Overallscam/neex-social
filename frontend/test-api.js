// API Test Script
console.log('🔍 Testing API Connection...');

const API_BASE_URL = 'https://neex-social-production.up.railway.app';

async function testAPIs() {
  try {
    // Test Posts endpoint
    console.log('Testing /posts endpoint...');
    const postsResponse = await fetch(`${API_BASE_URL}/posts`);
    if (postsResponse.ok) {
      const posts = await postsResponse.json();
      console.log('✅ Posts API working! Found', posts.length, 'posts');
    } else {
      console.log('❌ Posts API failed with status:', postsResponse.status);
    }

    // Test Users endpoint
    console.log('Testing /users endpoint...');
    const usersResponse = await fetch(`${API_BASE_URL}/users`);
    if (usersResponse.ok) {
      console.log('✅ Users API working!');
    } else {
      console.log('❌ Users API failed with status:', usersResponse.status);
    }

  } catch (error) {
    console.log('❌ API Connection failed:', error.message);
  }
}

testAPIs();
