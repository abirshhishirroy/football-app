import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'football.db')
  : path.join(__dirname, '..', 'data', 'football.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'coach' CHECK(role IN ('admin', 'coach')),
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    height INTEGER NOT NULL,
    weight INTEGER NOT NULL,
    position TEXT NOT NULL,
    playingStyle TEXT NOT NULL,
    weeklyActivity REAL NOT NULL DEFAULT 0,
    pace INTEGER NOT NULL DEFAULT 50,
    shooting INTEGER NOT NULL DEFAULT 50,
    passing INTEGER NOT NULL DEFAULT 50,
    dribbling INTEGER NOT NULL DEFAULT 50,
    defending INTEGER NOT NULL DEFAULT 50,
    physical INTEGER NOT NULL DEFAULT 50,
    goalkeeping INTEGER DEFAULT NULL,
    overall REAL NOT NULL DEFAULT 50,
    avatarUrl TEXT DEFAULT NULL,
    userId TEXT DEFAULT NULL UNIQUE,
    createdBy TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (createdBy) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    formation TEXT NOT NULL,
    isAiGenerated INTEGER NOT NULL DEFAULT 0,
    createdBy TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (createdBy) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS team_players (
    teamId TEXT NOT NULL,
    playerId TEXT NOT NULL,
    positionInTeam TEXT NOT NULL,
    PRIMARY KEY (teamId, playerId),
    FOREIGN KEY (teamId) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (playerId) REFERENCES players(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    matchDate TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'full', 'cancelled', 'completed')),
    formation TEXT NOT NULL DEFAULT '4-4-2',
    createdBy TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (createdBy) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS match_signups (
    id TEXT PRIMARY KEY,
    matchId TEXT NOT NULL,
    userId TEXT NOT NULL,
    joinedAt TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(matchId, userId),
    FOREIGN KEY (matchId) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS match_teams (
    id TEXT PRIMARY KEY,
    matchId TEXT NOT NULL UNIQUE,
    teamA TEXT NOT NULL,
    teamB TEXT NOT NULL,
    generatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (matchId) REFERENCES matches(id) ON DELETE CASCADE
  );
`);

const adminPassword = bcrypt.hashSync('admin123', 10);
const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@football.com');
if (!existingAdmin) {
  db.prepare('INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)').run(
    uuidv4(), 'admin@football.com', adminPassword, 'Admin', 'admin'
  );
}

export default db;
export { uuidv4 };
