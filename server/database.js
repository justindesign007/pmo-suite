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
  {
    id: '003_relational_business_tables',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        account TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        owner TEXT,
        status TEXT,
        start_date TEXT,
        end_date TEXT,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS project_members (
        project_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        PRIMARY KEY (project_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS sprints (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        owner TEXT,
        status TEXT,
        start_date TEXT,
        end_date TEXT,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS requirements (
        id TEXT PRIMARY KEY,
        sprint_id TEXT NOT NULL,
        code TEXT,
        title TEXT,
        owner TEXT,
        status TEXT,
        priority TEXT,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS milestones (
        id TEXT PRIMARY KEY,
        sprint_id TEXT NOT NULL,
        name TEXT,
        owner TEXT,
        status TEXT,
        date TEXT,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS timeline_nodes (
        id TEXT PRIMARY KEY,
        sprint_id TEXT NOT NULL,
        title TEXT,
        owner TEXT,
        status TEXT,
        date TEXT,
        type TEXT,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS timeline_node_requirements (
        timeline_node_id TEXT NOT NULL,
        requirement_id TEXT NOT NULL,
        PRIMARY KEY (timeline_node_id, requirement_id)
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor TEXT,
        event TEXT,
        source TEXT,
        at TEXT,
        data TEXT NOT NULL
      );
    `,
  },
];

export function openDatabase(dbPath = process.env.PMO_DB_PATH || defaultDbPath) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.pmoDbPath = dbPath;
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
  const clearBusinessTablesStmt = [
    'DELETE FROM timeline_node_requirements',
    'DELETE FROM audit_logs',
    'DELETE FROM timeline_nodes',
    'DELETE FROM milestones',
    'DELETE FROM requirements',
    'DELETE FROM sprints',
    'DELETE FROM project_members',
    'DELETE FROM projects',
    'DELETE FROM users',
  ];
  const insertUserStmt = db.prepare('INSERT INTO users (id, account, name, role, status, data) VALUES (?, ?, ?, ?, ?, ?)');
  const insertProjectStmt = db.prepare('INSERT INTO projects (id, name, owner, status, start_date, end_date, data) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertProjectMemberStmt = db.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)');
  const insertSprintStmt = db.prepare('INSERT INTO sprints (id, project_id, name, owner, status, start_date, end_date, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const insertRequirementStmt = db.prepare('INSERT INTO requirements (id, sprint_id, code, title, owner, status, priority, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const insertMilestoneStmt = db.prepare('INSERT INTO milestones (id, sprint_id, name, owner, status, date, data) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertTimelineNodeStmt = db.prepare('INSERT INTO timeline_nodes (id, sprint_id, title, owner, status, date, type, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const insertTimelineNodeRequirementStmt = db.prepare('INSERT INTO timeline_node_requirements (timeline_node_id, requirement_id) VALUES (?, ?)');
  const insertAuditLogStmt = db.prepare('INSERT INTO audit_logs (id, actor, event, source, at, data) VALUES (?, ?, ?, ?, ?, ?)');
  const tableCountStmt = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM projects) AS projects,
      (SELECT COUNT(*) FROM sprints) AS sprints,
      (SELECT COUNT(*) FROM requirements) AS requirements,
      (SELECT COUNT(*) FROM milestones) AS milestones,
      (SELECT COUNT(*) FROM timeline_nodes) AS timelineNodes,
      (SELECT COUNT(*) FROM audit_logs) AS auditLogs
  `);

  function syncBusinessTables(state) {
    clearBusinessTablesStmt.forEach((statement) => db.exec(statement));
    (state.users || []).forEach((user) => {
      insertUserStmt.run(user.id, user.account, user.name, user.role, user.status || 'active', JSON.stringify(user));
    });
    (state.projects || []).forEach((project) => {
      insertProjectStmt.run(project.id, project.name, project.owner || '', project.status || '', project.startDate || '', project.endDate || '', JSON.stringify(project));
      [...new Set(project.members || [])].forEach((userId) => insertProjectMemberStmt.run(project.id, userId));
    });
    (state.sprints || []).forEach((sprint) => {
      insertSprintStmt.run(sprint.id, sprint.projectId, sprint.name, sprint.owner || '', sprint.status || '', sprint.startDate || '', sprint.endDate || '', JSON.stringify(sprint));
    });
    (state.requirements || []).forEach((requirement) => {
      insertRequirementStmt.run(requirement.id, requirement.sprintId, requirement.code || '', requirement.title || '', requirement.owner || '', requirement.status || '', requirement.priority || '', JSON.stringify(requirement));
    });
    (state.milestones || []).forEach((milestone) => {
      insertMilestoneStmt.run(milestone.id, milestone.sprintId, milestone.name || '', milestone.owner || '', milestone.status || '', milestone.date || '', JSON.stringify(milestone));
    });
    (state.timelineNodes || []).forEach((node) => {
      insertTimelineNodeStmt.run(node.id, node.sprintId, node.title || '', node.owner || '', node.status || '', node.date || '', node.type || '', JSON.stringify(node));
      [...new Set(node.requirementIds || [])].forEach((requirementId) => insertTimelineNodeRequirementStmt.run(node.id, requirementId));
    });
    (state.auditLogs || []).forEach((log) => {
      insertAuditLogStmt.run(log.id, log.actor || '', log.event || '', log.source || '', log.at || '', JSON.stringify(log));
    });
  }

  return {
    getState() {
      const row = getStateStmt.get('business');
      return row ? { ...JSON.parse(row.data), revision: row.revision } : null;
    },
    saveState(state) {
      const { revision, ...storedState } = state;
      db.exec('BEGIN');
      try {
        saveStateStmt.run('business', JSON.stringify(storedState), currentLocalMinute());
        syncBusinessTables(storedState);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
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
    tableCounts() {
      return tableCountStmt.get();
    },
    databasePath() {
      return db.pmoDbPath;
    },
    healthCheck() {
      db.prepare('SELECT 1 AS ok').get();
      return { ok: true, databasePath: db.pmoDbPath, tableCounts: this.tableCounts() };
    },
    close() {
      db.close();
    },
  };
}
