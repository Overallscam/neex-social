import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch(API + '/posts')
      .then(res => res.json())
      .then(setPosts);
  }, [loggedIn, posts.length]);

  const register = () => {
    fetch(API + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(res => res.json())
      .then(data => alert(data.message));
  };

  const login = () => {
    fetch(API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.message === 'Login successful') setLoggedIn(true);
        alert(data.message);
      });
  };

  const createPost = () => {
    fetch(API + '/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, content: postContent })
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        setPostContent('');
        fetch(API + '/posts')
          .then(res => res.json())
          .then(setPosts);
      });
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Simple Social Media App</h2>
      {!loggedIn ? (
        <div>
          <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} /><br />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} /><br />
          <button onClick={register}>Register</button>
          <button onClick={login}>Login</button>
        </div>
      ) : (
        <div>
          <textarea placeholder="What's on your mind?" value={postContent} onChange={e => setPostContent(e.target.value)} /><br />
          <button onClick={createPost}>Post</button>
          <h3>Feed</h3>
          {posts.map((p, i) => (
            <div key={i} style={{ border: '1px solid #ccc', margin: '8px 0', padding: 8 }}>
              <b>{p.username}</b>: {p.content}
              <div style={{ fontSize: 10, color: '#888' }}>{new Date(p.date).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
