import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createRepository, openDatabase } from '../server/database.js';

function createTestRepository() {
  const dbPath = join(mkdtempSync(join(tmpdir(), 'pmo-suite-')), 'test.sqlite');
  const repository = createRepository(openDatabase(dbPath));
  return { repository };
}

test('SQLite repository persists business state', () => {
  const { repository } = createTestRepository();
  try {
    const state = {
      currentUserId: 'u-1',
      users: [{ id: 'u-1', account: 'zhangsan', name: '张三', role: 'pmo', status: 'active' }],
      projects: [],
      sprints: [],
      requirements: [],
      milestones: [],
      timelineNodes: [],
      auditLogs: [{ id: 'audit-1', event: 'test.state.saved', at: '2026-05-12 10:00' }],
    };

    repository.saveState(state);
    const savedState = repository.getState();
    assert.equal(savedState.users[0].account, 'zhangsan');
    assert.equal(savedState.auditLogs[0].event, 'test.state.saved');
  } finally {
    repository.close();
  }
});

test('SQLite repository persists backup snapshots in latest-first order', () => {
  const { repository } = createTestRepository();
  try {
    const backups = [
      {
        id: 'backup-old',
        format: 'pmo-suite-backup',
        version: 1,
        createdAt: '2026-05-12 09:30',
        summary: { users: 1, projects: 0, sprints: 0, requirements: 0 },
        state: { users: [], projects: [], sprints: [] },
      },
      {
        id: 'backup-new',
        format: 'pmo-suite-backup',
        version: 1,
        createdAt: '2026-05-12 10:30',
        summary: { users: 2, projects: 1, sprints: 1, requirements: 0 },
        state: { users: [], projects: [], sprints: [] },
      },
    ];

    repository.replaceBackups(backups);
    const savedBackups = repository.listBackups();
    assert.equal(savedBackups.length, 2);
    assert.equal(savedBackups[0].id, 'backup-new');
    assert.equal(savedBackups[1].id, 'backup-old');
  } finally {
    repository.close();
  }
});
