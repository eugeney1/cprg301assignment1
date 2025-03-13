// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define the path to the database file (it will be created if not present)
const dbPath = path.resolve(process.cwd(), 'gallery.db');

// Open the database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Create a "photos" table if it doesn’t exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

module.exports = db;
