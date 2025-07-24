const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());

// Neo4j connection (default local setup)
const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', '12345678') // username, password (change as needed)
);
const session = driver.session();

// Add a user
app.post('/users', async (req, res) => {
  const { name } = req.body;
  try {
    await session.run(
      'CREATE (u:User {name: $name})',
      { name }
    );
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all users
app.get('/users', async (req, res) => {
  try {
    const result = await session.run('MATCH (u:User) RETURN u.name AS name');
    const users = result.records.map(r => r.get('name'));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add friendship
app.post('/friendship', async (req, res) => {
  const { user1, user2 } = req.body;
  try {
    await session.run(
      'MATCH (a:User {name: $user1}), (b:User {name: $user2}) CREATE (a)-[:FRIEND]->(b), (b)-[:FRIEND]->(a)',
      { user1, user2 }
    );
    res.status(201).json({ message: 'Friendship created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Corrected: Get friends and friends-of-friends (excluding self and direct friends)
app.get('/friends/:name', async (req, res) => {
  const { name } = req.params;
  try {
    const result = await session.run(
      `MATCH (u:User {name: $name})-[:FRIEND]->(f:User)
       WITH u, collect(f) AS directFriends
       UNWIND directFriends AS f
       MATCH (f)-[:FRIEND]->(fof:User)
       WHERE NOT fof = u AND NOT fof IN directFriends
       RETURN 
         [friend IN directFriends | friend.name] AS friends,
         collect(DISTINCT fof.name) AS friendsOfFriends`,
      { name }
    );
    const record = result.records[0];
    res.json({
      friends: record.get('friends'),
      friendsOfFriends: record.get('friendsOfFriends')
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Return full graph (nodes and edges)
app.get('/graph', async (req, res) => {
  try {
    const usersResult = await session.run('MATCH (u:User) RETURN u.name AS name');
    const nodes = usersResult.records.map(r => ({
      id: r.get('name'),
      label: r.get('name')
    }));

    const edgesResult = await session.run(
      'MATCH (a:User)-[:FRIEND]->(b:User) WHERE a.name < b.name RETURN a.name AS source, b.name AS target'
    );
    const edges = edgesResult.records.map(r => ({
      source: r.get('source'),
      target: r.get('target'),
      label: 'friend'
    }));

    res.json({ nodes, edges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Shortest path endpoint
app.get('/shortest-path', async (req, res) => {
  const { source, target } = req.query;
  if (!source || !target) {
    return res.status(400).json({ error: 'source and target are required' });
  }
  try {
    const result = await session.run(
      `MATCH (start:User {name: $source}), (end:User {name: $target}),
       p = shortestPath((start)-[:FRIEND*]-(end))
       RETURN [n IN nodes(p) | n.name] AS path`,
      { source, target }
    );
    if (result.records.length === 0) {
      return res.json({ path: [] });
    }
    const path = result.records[0].get('path');
    res.json({ path });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a user and all their friendships
app.delete('/users/:name', async (req, res) => {
  const { name } = req.params;
  try {
    await session.run(
      'MATCH (u:User {name: $name}) DETACH DELETE u',
      { name }
    );
    res.json({ message: 'User and all friendships deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
