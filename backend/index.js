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

// Get friends and friends-of-friends
app.get('/friends/:name', async (req, res) => {
  const { name } = req.params;
  try {
    const result = await session.run(
      `MATCH (u:User {name: $name})-[:FRIEND]->(f:User)
       OPTIONAL MATCH (f)-[:FRIEND]->(fof:User)
       RETURN collect(DISTINCT f.name) AS friends, collect(DISTINCT fof.name) AS friendsOfFriends`,
      { name }
    );
    const record = result.records[0];
    res.json({
      friends: record.get('friends').filter(n => n !== name),
      friendsOfFriends: record.get('friendsOfFriends').filter(n => n !== name)
    });
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

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 