const express = require('express');
const sqlite3 = require('sqlite3');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize SQLite
const db = new sqlite3.Database('./rooms.db', (err) => {
  if (err) console.error(err);
  else console.log('Connected to SQLite database');
});

// Create table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    players TEXT,
    status TEXT DEFAULT 'lobby',
    roles TEXT DEFAULT '{}'
  )
`);

// Get all rooms
app.get('/rooms', (req, res) => {
  db.all('SELECT * FROM rooms', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    rows.forEach(r => {
      r.players = JSON.parse(r.players);
      r.roles = JSON.parse(r.roles); // Parse roles for frontend
    });
    res.json(rows);
  });
});

// Add 'status' and 'roles' to the table
db.run(`

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    players TEXT,
    status TEXT DEFAULT 'lobby',
    roles TEXT DEFAULT '{}'
  )
`);

// Get all rooms (Updated to include status/roles)
app.get('/rooms', (req, res) => {
  db.all('SELECT * FROM rooms', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    rows.forEach(r => {
      r.players = JSON.parse(r.players);
      r.roles = JSON.parse(r.roles); // Parse roles for frontend
    });
    res.json(rows);
  });
});

app.post('/rooms/:id/start', (req, res) => {
  const roomId = req.params.id;

  db.get('SELECT players FROM rooms WHERE id = ?', [roomId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Room not found' });

    let players = JSON.parse(row.players);
    if (players.length < 3) return res.status(400).json({ error: 'Need at least 3 players' });

    // Role Assignment Logic
    const shuffled = [...players].sort(() => 0.5 - Math.random());
    const rolesMap = {};
    
    // Assign roles: 1 Mafia, 1 Detective, others are Villagers
    rolesMap[shuffled.pop()] = 'Mafia';
    rolesMap[shuffled.pop()] = 'Detective';
    shuffled.forEach(p => rolesMap[p] = 'Villager');

    db.run(
      'UPDATE rooms SET status = "started", roles = ? WHERE id = ?',
      [JSON.stringify(rolesMap), roomId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'started' });
      }
    );
  });
});



// Join a room
app.post('/rooms/:id/join', (req, res) => {
  const roomId = req.params.id;
  const { playerName } = req.body;

  db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Room not found' });

    let players = JSON.parse(row.players);
    if (!players.includes(playerName)) players.push(playerName);

    db.run('UPDATE rooms SET players = ? WHERE id = ?', [JSON.stringify(players), roomId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: row.id, players });
    });
  });
});

// Leave a room
app.post('/rooms/:id/leave', (req, res) => {
  const roomId = req.params.id;
  const { playerName } = req.body;

  db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Room not found' });

    let players = JSON.parse(row.players);
    players = players.filter(p => p !== playerName);

    if (players.length === 0) {
      // Delete room if empty
      db.run('DELETE FROM rooms WHERE id = ?', [roomId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json({ message: 'Room deleted as it became empty' });
      });
    } else {
      // Update room with remaining players
      db.run('UPDATE rooms SET players = ? WHERE id = ?', [JSON.stringify(players), roomId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: row.id, players });
      });
    }
  });
});

// Start server
app.listen(4000, () => console.log('Server running on port 4000'));
