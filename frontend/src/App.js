import React, { useState, useEffect } from 'react';
import './App.css';
import CytoscapeComponent from 'react-cytoscapejs';

const API = 'http://localhost:4000';

function UserGraph() {
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNodes, setSelectedNodes] = useState([]); // store selected node ids
  const [shortestPath, setShortestPath] = useState([]); // store ids of nodes/edges in path
  const cyRef = React.useRef(null);

  useEffect(() => {
    fetch(`${API}/graph`)
      .then(res => res.json())
      .then(data => {
        const cyElements = [
          ...data.nodes.map(n => ({ data: n })),
          ...data.edges.map(e => ({ data: e })),
        ];
        setElements(cyElements);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load graph');
        setLoading(false);
      });
  }, []);

  // Handle node selection
  const handleNodeClick = (event) => {
    const nodeId = event.target.id();
    let newSelected = [...selectedNodes];
    if (newSelected.length === 2) newSelected = [];
    if (!newSelected.includes(nodeId)) newSelected.push(nodeId);
    setSelectedNodes(newSelected);
    if (newSelected.length === 2) {
      // Fetch shortest path from backend
      fetch(`${API}/shortest-path?source=${encodeURIComponent(newSelected[0])}&target=${encodeURIComponent(newSelected[1])}`)
        .then(res => res.json())
        .then(data => {
          setShortestPath(data.path || []);
        })
        .catch(() => setShortestPath([]));
    } else {
      setShortestPath([]);
    }
  };

  // Cytoscape style with path highlighting
  const style = [
    {
      selector: 'node',
      style: {
        label: 'data(label)',
        'background-color': '#0074D9',
        color: '#fff',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': 16,
        width: 50,
        height: 50,
      },
    },
    {
      selector: 'node.selected',
      style: {
        'background-color': '#FF851B',
      },
    },
    {
      selector: 'node.path',
      style: {
        'background-color': '#2ECC40',
      },
    },
    {
      selector: 'edge',
      style: {
        label: 'data(label)',
        'curve-style': 'bezier',
        'target-arrow-shape': 'triangle',
        'line-color': '#aaa',
        'target-arrow-color': '#aaa',
        'font-size': 12,
        'text-background-color': '#fff',
        'text-background-opacity': 1,
        'text-background-padding': 2,
      },
    },
    {
      selector: 'edge.path',
      style: {
        'line-color': '#2ECC40',
        'target-arrow-color': '#2ECC40',
        'width': 5,
      },
    },
  ];

  // Add classes for selected/path nodes/edges
  // Build set of consecutive node pairs in the path
  const pathPairs = new Set();
  for (let i = 0; i < shortestPath.length - 1; i++) {
    pathPairs.add(`${shortestPath[i]}--${shortestPath[i + 1]}`);
    pathPairs.add(`${shortestPath[i + 1]}--${shortestPath[i]}`); // undirected
  }
  const cyElements = elements.map(el => {
    if (el.data.source && el.data.target) {
      // edge
      let classes = '';
      if (pathPairs.has(`${el.data.source}--${el.data.target}`)) {
        classes += 'path';
      }
      return { ...el, classes };
    } else {
      // node
      let classes = '';
      if (selectedNodes.includes(el.data.id)) classes += ' selected';
      if (shortestPath.includes(el.data.id)) classes += ' path';
      return { ...el, classes };
    }
  });

  const layout = { name: 'circle' };

  if (loading) return <div>Loading graph...</div>;
  if (error) return <div>{error}</div>;
  if (!elements.length) return <div>No user graph data.</div>;

  return (
    <div style={{ margin: '32px auto', maxWidth: 650, background: '#f8fafc', borderRadius: 12, padding: 24 }}>
      <h2 style={{ textAlign: 'center' }}>User Friendship Graph</h2>
      <p style={{ textAlign: 'center', color: '#555' }}>Click two nodes to highlight the shortest path between them.</p>
      <CytoscapeComponent
        elements={cyElements}
        style={{ width: '600px', height: '600px' }}
        layout={layout}
        stylesheet={style}
        cy={cy => {
          cyRef.current = cy;
          cy.off('tap', 'node');
          cy.on('tap', 'node', handleNodeClick);
        }}
      />
    </div>
  );
}

function App() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [user1, setUser1] = useState('');
  const [user2, setUser2] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [friends, setFriends] = useState([]);
  const [fofs, setFofs] = useState([]);
  const [showGraph, setShowGraph] = useState(false);

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
      <button style={{ margin: '24px 0', background: '#0074D9' }} onClick={() => setShowGraph(g => !g)}>
        {showGraph ? 'Hide' : 'Show'} User Friendship Graph
      </button>
      {showGraph && <UserGraph />}
    </div>
  );
}

export default App;
