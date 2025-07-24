import React, { useState, useEffect } from 'react';
import './App.css';

const API = 'http://localhost:4000';

function App() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [user1, setUser1] = useState('');
  const [user2, setUser2] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [friends, setFriends] = useState([]);
  const [fofs, setFofs] = useState([]);

  // Fetch users
  useEffect(() => {
    fetch(`${API}/users`).then(res => res.json()).then(setUsers);
  }, []);

  // Add user
  const addUser = async e => {
    e.preventDefault();
    await fetch(`${API}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    setName('');
    fetch(`${API}/users`).then(res => res.json()).then(setUsers);
  };

  // Add friendship
  const addFriendship = async e => {
    e.preventDefault();
    await fetch(`${API}/friendship`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user1, user2 })
    });
    setUser1('');
    setUser2('');
  };

  // Get friends and friends-of-friends
  const getFriends = async name => {
    setSelectedUser(name);
    const res = await fetch(`${API}/friends/${name}`);
    const data = await res.json();
    setFriends(data.friends);
    setFofs(data.friendsOfFriends);
  };

  // Delete user
  const deleteUser = async name => {
    if (!window.confirm(`Are you sure you want to delete user '${name}' and all their friendships?`)) return;
    await fetch(`${API}/users/${name}`, { method: 'DELETE' });
    fetch(`${API}/users`).then(res => res.json()).then(setUsers);
    if (selectedUser === name) {
      setSelectedUser('');
      setFriends([]);
      setFofs([]);
    }
  };

  return (
    <div className="main-container">
      <h1 style={{ textAlign: 'center', marginBottom: 30 }}>Graph Database Demo (Neo4j)</h1>
      <h2 className="section-title">Add User</h2>
      <form onSubmit={addUser}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" required />
        <button type="submit">Add User</button>
      </form>

      <h2 className="section-title">Add Friendship</h2>
      <form onSubmit={addFriendship}>
        <select value={user1} onChange={e => setUser1(e.target.value)} required>
          <option value="">Select User 1</option>
          {users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={user2} onChange={e => setUser2(e.target.value)} required>
          <option value="">Select User 2</option>
          {users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <button type="submit">Add Friendship</button>
      </form>

      <h2 className="section-title">All Users</h2>
      <ul>
        {users.map(u => (
          <li key={u}>
            <span>{u}</span>
            <button onClick={() => getFriends(u)}>Show Friends</button>
            <button style={{background: '#e53e3e'}} onClick={() => deleteUser(u)}>Delete User</button>
          </li>
        ))}
      </ul>

      {selectedUser && (
        <div className="friends-section">
          <h3>Friends of {selectedUser}</h3>
          <ul>
            {friends.length ? friends.map(f => <li key={f}>{f}</li>) : <li>No friends</li>}
          </ul>
          <h4>Friends of Friends</h4>
          <ul>
            {fofs.length ? fofs.map(f => <li key={f}>{f}</li>) : <li>No friends-of-friends</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
