import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRepository, currentLocalMinute, openDatabase } from './database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const publicRoot = projectRoot;
const port = Number(process.env.PORT || 3000);

function validateBusinessState(state) {
  if (!state || typeof state !== 'object') return 'state 必须是对象';
  const requiredArrays = ['users', 'projects', 'sprints', 'requirements', 'milestones', 'timelineNodes'];
  const invalidKey = requiredArrays.find((key) => !Array.isArray(state[key]));
  if (invalidKey) return `${invalidKey} 必须是数组`;
  return '';
}

function appendAudit(state, event = 'state.saved') {
  const existingLogs = Array.isArray(state.auditLogs) ? state.auditLogs : [];
  const logs = existingLogs.at(-1)?.event === event && existingLogs.at(-1)?.source !== 'server'
    ? existingLogs.slice(0, -1)
    : existingLogs;
  return [
    ...logs,
    {
      id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      at: currentLocalMinute(),
      actor: state.currentUserId || 'system',
      event,
      source: 'server',
    },
  ].slice(-100);
}

export function createApp(repository = createRepository(openDatabase())) {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true, storage: 'sqlite' });
  });

  app.get('/api/state', (_request, response) => {
    response.json({ state: repository.getState() });
  });

  app.put('/api/state', (request, response) => {
    const nextState = request.body?.state;
    const error = validateBusinessState(nextState);
    if (error) {
      response.status(400).json({ error });
      return;
    }
    const savedState = {
      ...nextState,
      auditLogs: appendAudit(nextState, request.body?.event),
    };
    repository.saveState(savedState);
    response.json({ ok: true, auditLogs: savedState.auditLogs, state: savedState });
  });

  app.get('/api/backups', (_request, response) => {
    response.json({ backups: repository.listBackups() });
  });

  app.put('/api/backups', (request, response) => {
    const backups = request.body?.backups;
    if (!Array.isArray(backups)) {
      response.status(400).json({ error: 'backups 必须是数组' });
      return;
    }
    repository.replaceBackups(backups);
    response.json({ ok: true, backups });
  });

  app.use(express.static(publicRoot, {
    extensions: ['html'],
    index: 'index.html',
  }));

  app.use((_request, response) => {
    response.sendFile(resolve(publicRoot, 'index.html'));
  });

  app.locals.repository = repository;
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repository = createRepository(openDatabase());
  const app = createApp(repository);
  const server = app.listen(port, () => {
    console.log(`PMO Suite server running at http://localhost:${port}`);
  });

  const shutdown = () => {
    server.close(() => {
      repository.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
