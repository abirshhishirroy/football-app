import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import fs from 'fs';

const DB_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'football.db')
  : path.join(process.cwd(), 'data', 'football.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function columnExists(table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  return cols.some((c) => c.name === column);
}

function tableExists(table: string): boolean {
  const row = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
  return !!row;
}

function hasOldRoleCheck(): boolean {
  const row = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`).get() as any;
  return !!(row?.sql && /CHECK\(role IN \('admin', 'coach'\)\)/.test(row.sql));
}

// Base tables, created once. Existing databases keep their data.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('admin', 'player')),
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

  CREATE TABLE IF NOT EXISTS match_goal_scorers (
    id TEXT PRIMARY KEY,
    matchId TEXT NOT NULL,
    team TEXT NOT NULL CHECK(team IN ('A', 'B')),
    playerId TEXT NOT NULL,
    isGoal INTEGER NOT NULL DEFAULT 1,
    minute INTEGER,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (matchId) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (playerId) REFERENCES players(id) ON DELETE CASCADE
  );
`);

// --- Non-destructive migrations for pre-existing databases ---

// Migrate the old 'users.role' CHECK constraint ('admin','coach') to ('admin','player').
// SQLite cannot ALTER a CHECK, so rebuild the table while preserving all data.
if (hasOldRoleCheck()) {
  db.exec(`PRAGMA foreign_keys = OFF`);
  db.exec(`DROP TABLE IF EXISTS users_new`);
  db.exec(`
    CREATE TABLE users_new (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('admin', 'player')),
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO users_new (id, email, password, name, role, createdAt)
      SELECT id, email, password, name,
        CASE WHEN role = 'admin' THEN 'admin' ELSE 'player' END,
        createdAt
      FROM users;
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
  `);
  db.exec(`PRAGMA foreign_keys = ON`);
}

// Add player stat columns if missing (existing tables keep their data).
if (tableExists('players')) {
  for (const col of ['goals', 'assists', 'matchesPlayed', 'wins']) {
    if (!columnExists('players', col)) {
      db.prepare(`ALTER TABLE players ADD COLUMN ${col} INTEGER NOT NULL DEFAULT 0`).run();
    }
  }
}

// Add match venue/reporting columns if missing.
if (tableExists('matches')) {
  for (const col of ['venueName', 'venueLink', 'reportingTime', 'matchFees']) {
    if (!columnExists('matches', col)) {
      db.prepare(`ALTER TABLE matches ADD COLUMN ${col} TEXT DEFAULT ''`).run();
    }
  }
}

// Add match result columns if missing.
if (tableExists('matches')) {
  if (!columnExists('matches', 'winner')) {
    db.exec(`ALTER TABLE matches ADD COLUMN winner TEXT DEFAULT NULL`);
  }
  if (!columnExists('matches', 'scoreA')) {
    db.exec(`ALTER TABLE matches ADD COLUMN scoreA INTEGER DEFAULT NULL`);
  }
  if (!columnExists('matches', 'scoreB')) {
    db.exec(`ALTER TABLE matches ADD COLUMN scoreB INTEGER DEFAULT NULL`);
  }
  if (!columnExists('matches', 'completedAt')) {
    db.exec(`ALTER TABLE matches ADD COLUMN completedAt TEXT DEFAULT NULL`);
  }
}

// Add match_teams team name columns if missing.
if (tableExists('match_teams')) {
  for (const col of ['teamAName', 'teamBName']) {
    if (!columnExists('match_teams', col)) {
      db.prepare(`ALTER TABLE match_teams ADD COLUMN ${col} TEXT DEFAULT ''`).run();
    }
  }
}

// Ensure the admin seed exists and has role 'admin'.
const seededAdmin = db.prepare('SELECT id, role FROM users WHERE email = ?').get('admin@football.com') as any;
if (seededAdmin) {
  if (seededAdmin.role !== 'admin') {
    db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run('admin@football.com');
  }
} else {
  const adminPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)').run(
    uuidv4(), 'admin@football.com', adminPassword, 'Admin', 'admin'
  );
}

export default db;
export { uuidv4 };
