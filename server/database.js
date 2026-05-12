import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const defaultDbPath = resolve(process.cwd(), 'data/pmo-suite.sqlite');
const migrations = [
  {
    id: '001_core_state',
    sql: `
      CREATE TABLE IF NOT EXISTS app_state (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `,
  },
  {
    id: '002_sessions_and_revision',
    sql: `
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      ALTER TABLE app_state ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
    `,
    ignoreErrors: ['duplicate column name: revision'],
  },
];

export function openDatabase(dbPath = process.env.PMO_DB_PATH || defaultDbPath) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  runMigrations(db);
  return db;
}

export function currentLocalMinute(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  const appliedStmt = db.prepare('SELECT id FROM schema_migrations WHERE id = ?');
  const recordStmt = db.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)');
  migrations.forEach((migration) => {
    if (appliedStmt.get(migration.id)) return;
    db.exec('BEGIN');
    try {
      migration.sql.split(';').map((statement) => statement.trim()).filter(Boolean).forEach((statement) => {
        try {
          db.exec(`${statement};`);
        } catch (error) {
          if (!migration.ignoreErrors?.some((message) => String(error.message).includes(message))) throw error;
        }
      });
      recordStmt.run(migration.id, currentLocalMinute());
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  });
}

export function createRepository(db = openDatabase()) {
  const getStateStmt = db.prepare('SELECT data, revision FROM app_state WHERE id = ?');
  const saveStateStmt = db.prepare(`
    INSERT INTO app_state (id, data, updated_at, revision)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, revision = app_state.revision + 1
  `);
  const listBackupsStmt = db.prepare('SELECT data FROM backups ORDER BY created_at DESC');
  const clearBackupsStmt = db.prepare('DELETE FROM backups');
  const insertBackupStmt = db.prepare('INSERT INTO backups (id, data, created_at) VALUES (?, ?, ?)');
  const createSessionStmt = db.prepare(`
    INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `);
  const getSessionStmt = db.prepare('SELECT token_hash, user_id, created_at, expires_at FROM auth_sessions WHERE token_hash = ?');
  const deleteSessionStmt = db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?');
  const deleteExpiredSessionsStmt = db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?');
  const listMigrationsStmt = db.prepare('SELECT id, applied_at FROM schema_migrations ORDER BY id');

  return {
    getState() {
      const row = getStateStmt.get('business');
      return row ? { ...JSON.parse(row.data), revision: row.revision } : null;
    },
    saveState(state) {
      const { revision, ...storedState } = state;
      saveStateStmt.run('business', JSON.stringify(storedState), currentLocalMinute());
      return this.getState();
    },
    listBackups() {
      return listBackupsStmt.all().map((row) => JSON.parse(row.data));
    },
    replaceBackups(backups) {
      db.exec('BEGIN');
      try {
        clearBackupsStmt.run();
        backups.forEach((backup) => {
          insertBackupStmt.run(backup.id, JSON.stringify(backup), backup.createdAt || currentLocalMinute());
        });
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      return backups;
    },
    createSession(tokenHash, userId, expiresAt) {
      createSessionStmt.run(tokenHash, userId, currentLocalMinute(), expiresAt);
    },
    getSession(tokenHash) {
      const row = getSessionStmt.get(tokenHash);
      if (!row) return null;
      if (row.expires_at <= currentLocalMinute()) {
        deleteSessionStmt.run(tokenHash);
        return null;
      }
      return row;
    },
    deleteSession(tokenHash) {
      deleteSessionStmt.run(tokenHash);
    },
    deleteExpiredSessions() {
      deleteExpiredSessionsStmt.run(currentLocalMinute());
    },
    listMigrations() {
      return listMigrationsStmt.all();
    },
    close() {
      db.close();
    },
  };
}
