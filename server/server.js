// server.js
require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(express.json());
app.use(cors());

//MySQL database settings
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

//Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Database connection error:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

//Authentication using jwt
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization'); //Get token

  if (!token) return res.status(401).json({ message: 'Access denied' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: 'Invalid token' });
      req.user = user;
      next();
  });
};

//User signup endpoint
app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;
  
  //Username and email must be unique, the code needs to return the proper error if needed
  db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], async (err, results) => {
      if (err) return res.status(500).json({ message: 'Error checking username or email' });
      if (results.length > 0) {
          const existingUser = results[0];
          //Check username uniquness
          if (existingUser.username === username) {
              return res.status(400).json({ message: 'Username already taken' });
          }
          //Check email
          if (existingUser.email === email) {
              return res.status(400).json({ message: 'Email already in use' });
          }
      }
      
      //Hash the password to store it safely in the database
      const hashedPassword = await bcrypt.hash(password, 10);
      db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
          [username, email, hashedPassword], (err, result) => {
          if (err) return res.status(500).json({ message: 'Error creating user' });
          res.json({ message: 'User created' });
      });
  });
});

//User login (by username or email)
app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body; //Can be username or email
  db.query('SELECT * FROM users WHERE username = ? OR email = ?', [identifier, identifier], async (err, results) => {
      if (err || results.length === 0) return res.status(400).json({ message: 'Invalid credentials' });
      const user = results[0];
      //Validate password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(400).json({ message: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
  });
});


//Get all notes the user has access to, including shared notes
app.get('/api/notes', authenticateToken, (req, res) => {
  db.query('SELECT * FROM notes WHERE user_id = ? OR id IN (SELECT note_id FROM shared_notes WHERE shared_with = ?)', 
      [req.user.id, req.user.id], (err, results) => {
      if (err) return res.status(500).json({ message: 'Error fetching notes' });
      res.json(results);
  });
});

//Get a note by ID, ensure the user must be authenticated, and note must belong to them or be shared with them
app.get('/api/notes/:id', authenticateToken, (req, res) => {
  db.query('SELECT * FROM notes WHERE id = ? AND (user_id = ? OR id IN (SELECT note_id FROM shared_notes WHERE shared_with = ?))',
      [req.params.id, req.user.id, req.user.id], (err, results) => {
      if (err || results.length === 0) return res.status(404).json({ message: 'Note not found' });
      res.json(results[0]);
  });
});

//Create a new note
app.post('/api/notes', authenticateToken, (req, res) => {
  const { title, content } = req.body;
  db.query('INSERT INTO notes (title, content, user_id) VALUES (?, ?, ?)', 
      [title, content, req.user.id], (err, result) => {
      if (err) return res.status(500).json({ message: 'Error creating note' });
      res.json({ message: 'Note created', id: result.insertId });
  });
});

//Update a note by ID
app.put('/api/notes/:id', authenticateToken, (req, res) => {
  const { title, content } = req.body;
  db.query('UPDATE notes SET title = ?, content = ? WHERE id = ? AND user_id = ?', 
      [title, content, req.params.id, req.user.id], (err, result) => {
      if (err || result.affectedRows === 0) return res.status(404).json({ message: 'Note not found or unauthorized' });
      res.json({ message: 'Note updated' });
  });
});

//Delete a note by ID
app.delete('/api/notes/:id', authenticateToken, (req, res) => {
  db.query('DELETE FROM notes WHERE id = ? AND user_id = ?', 
      [req.params.id, req.user.id], (err, result) => {
      if (err || result.affectedRows === 0) return res.status(404).json({ message: 'Note not found or unauthorized' });
      res.json({ message: 'Note deleted' });
  });
});

//Share a note with another user
//  Users cannot be expected to know the user_id of the individual they would like to share the note with.
//  This expects the user to provide the email address and it will locate the user_id for the table.
app.post('/api/notes/:id/share', authenticateToken, (req, res) => {
  const { sharedWithEmail } = req.body;
  
  //Get user_id from email
  db.query('SELECT id FROM users WHERE email = ?', [sharedWithEmail], (err, results) => {
      if (err) return res.status(500).json({ message: 'Error retrieving user' });
      if (results.length === 0) return res.status(404).json({ message: 'User not found' });
      
      const sharedWithId = results[0].id;
      
      //Insert shared note entry
      db.query('INSERT INTO shared_notes (note_id, shared_with) VALUES (?, ?)', 
          [req.params.id, sharedWithId], (err, result) => {
          if (err) return res.status(500).json({ message: 'Error sharing note' });
          res.json({ message: 'Note shared successfully' });
      });
  });
});

//Search for notes, search all avialable notes for keywords including shared notes.
app.get('/api/search', authenticateToken, (req, res) => {
  const query = req.query.q;
  db.query(`SELECT * FROM notes WHERE MATCH(title, content) AGAINST (?) AND (user_id = ? OR id IN (SELECT note_id FROM shared_notes WHERE shared_with = ?))`,
      [query, req.user.id, req.user.id], (err, results) => {
      if (err) return res.status(500).json({ message: 'Error searching notes' });
      res.json(results);
  });
});

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
