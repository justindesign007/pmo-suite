import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const defaultDbPath = resolve(process.cwd(), 'data/pmo-suite.sqlite');

export function openDatabase(dbPath = process.env.PMO_DB_PATH || defaultDbPath) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
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
  `);
  return db;
}

export function currentLocalMinute(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function createRepository(db = openDatabase()) {
  const getStateStmt = db.prepare('SELECT data FROM app_state WHERE id = ?');
  const saveStateStmt = db.prepare(`
    INSERT INTO app_state (id, data, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `);
  const listBackupsStmt = db.prepare('SELECT data FROM backups ORDER BY created_at DESC');
  const clearBackupsStmt = db.prepare('DELETE FROM backups');
  const insertBackupStmt = db.prepare('INSERT INTO backups (id, data, created_at) VALUES (?, ?, ?)');

  return {
    getState() {
      const row = getStateStmt.get('business');
      return row ? JSON.parse(row.data) : null;
    },
    saveState(state) {
      saveStateStmt.run('business', JSON.stringify(state), currentLocalMinute());
      return state;
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
    close() {
      db.close();
    },
  };
}
