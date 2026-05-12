import express from 'express';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRepository, currentLocalMinute, openDatabase } from './database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const publicRoot = projectRoot;
const port = Number(process.env.PORT || 3000);
const sessionCookieName = 'pmo_session';
const sessionTtlMs = Number(process.env.PMO_SESSION_TTL_MS || 1000 * 60 * 60 * 8);

function normalizeRole(role) {
  if (role === 'project_owner') return 'pm';
  if (['pmo', 'pm', 'member'].includes(role)) return role;
  return 'member';
}

export function validateBusinessState(state) {
  if (!state || typeof state !== 'object') return 'state 必须是对象';
  const requiredArrays = ['users', 'projects', 'sprints', 'requirements', 'milestones', 'timelineNodes'];
  const invalidKey = requiredArrays.find((key) => !Array.isArray(state[key]));
  if (invalidKey) return `${invalidKey} 必须是数组`;
  const duplicateAccount = new Set();
  for (const user of state.users) {
    if (!user.id || !user.account || !user.name) return '用户必须包含 id、account 和 name';
    const account = String(user.account).toLowerCase();
    if (duplicateAccount.has(account)) return '用户账号不能重复';
    duplicateAccount.add(account);
  }
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

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    if (index < 0) return [part, ''];
    return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
  }));
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function createSession(repository, userId) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = currentLocalMinute(new Date(Date.now() + sessionTtlMs));
  repository.createSession(tokenHash(token), userId, expiresAt);
  return { token, expiresAt };
}

function cookieOptions(expiresAt = '') {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const expires = expiresAt ? `; Expires=${new Date(expiresAt.replace(' ', 'T')).toUTCString()}` : '';
  return `HttpOnly; SameSite=Lax; Path=/${secure}${expires}`;
}

function readSession(repository, request) {
  const token = parseCookies(request.headers.cookie || '')[sessionCookieName];
  if (!token) return null;
  const session = repository.getSession(tokenHash(token));
  if (!session) return null;
  const state = repository.getState();
  const user = state?.users?.find((item) => item.id === session.user_id && item.status === 'active');
  if (!user) return null;
  return { token, session, user, state };
}

function requireAuth(repository) {
  return (request, response, next) => {
    const auth = readSession(repository, request);
    if (!auth) {
      response.status(401).json({ error: '未登录或登录已失效' });
      return;
    }
    request.auth = auth;
    next();
  };
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const hash = scryptSync(String(password), salt, 32).toString('base64url');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, storedHash = '') {
  if (!storedHash?.startsWith('scrypt$')) return false;
  const [, salt, expected] = storedHash.split('$');
  const actual = scryptSync(String(password), salt, 32);
  const expectedBuffer = Buffer.from(expected, 'base64url');
  return expectedBuffer.length === actual.length && timingSafeEqual(actual, expectedBuffer);
}

export function sanitizeStateForClient(state, currentUserId = '') {
  if (!state) return null;
  return {
    ...state,
    currentUserId,
    users: (state.users || []).map(({ password, passwordHash, ...user }) => ({
      ...user,
      hasPassword: Boolean(passwordHash || password),
    })),
  };
}

export function secureStateForStorage(incomingState, existingState = null) {
  const existingUsers = new Map((existingState?.users || []).map((user) => [user.id, user]));
  return {
    ...incomingState,
    currentUserId: '',
    users: incomingState.users.map((user) => {
      const existing = existingUsers.get(user.id);
      const nextUser = { ...user, role: normalizeRole(user.role), account: String(user.account || '').toLowerCase() };
      if (nextUser.password) {
        nextUser.passwordHash = hashPassword(nextUser.password);
      } else if (existing?.passwordHash) {
        nextUser.passwordHash = existing.passwordHash;
      } else if (existing?.password) {
        nextUser.passwordHash = hashPassword(existing.password);
      }
      delete nextUser.password;
      delete nextUser.confirmPassword;
      delete nextUser.hasPassword;
      return nextUser;
    }),
  };
}

function usersComparable(users = []) {
  return JSON.stringify([...users].map(({ password, confirmPassword, passwordHash, hasPassword, ...user }) => ({
    ...user,
    role: normalizeRole(user.role),
  })).sort((a, b) => String(a.id).localeCompare(String(b.id))));
}

function projectForEntity(state, entity, type) {
  if (type === 'projects') return entity;
  if (type === 'sprints') return state.projects.find((project) => project.id === entity.projectId);
  const sprint = state.sprints.find((item) => item.id === entity.sprintId);
  return state.projects.find((project) => project.id === sprint?.projectId);
}

function changedEntities(previous = [], next = []) {
  const previousMap = new Map(previous.map((item) => [item.id, item]));
  const nextMap = new Map(next.map((item) => [item.id, item]));
  const changed = [];
  nextMap.forEach((value, id) => {
    if (JSON.stringify(previousMap.get(id) || null) !== JSON.stringify(value)) changed.push(value);
  });
  previousMap.forEach((value, id) => {
    if (!nextMap.has(id)) changed.push(value);
  });
  return changed;
}

export function canSaveState(previousState, nextState, actor) {
  const role = normalizeRole(actor?.role);
  if (role === 'pmo') return { allowed: true };
  if (role === 'member') return { allowed: false, message: '成员仅有查看权限' };
  if (role !== 'pm') return { allowed: false, message: '当前账号无写入权限' };
  if (usersComparable(previousState.users) !== usersComparable(nextState.users)) {
    return { allowed: false, message: 'PM 不能修改系统用户' };
  }
  if ((nextState.projects || []).some((project) => !previousState.projects.some((item) => item.id === project.id))) {
    return { allowed: false, message: 'PM 不能创建项目' };
  }
  const changedCollections = ['projects', 'sprints', 'requirements', 'milestones', 'timelineNodes'];
  for (const key of changedCollections) {
    const changed = changedEntities(previousState[key] || [], nextState[key] || []);
    const outsideScope = changed.some((entity) => projectForEntity(previousState, entity, key)?.owner !== actor.id);
    if (outsideScope) return { allowed: false, message: 'PM 只能修改自己负责项目下的数据' };
  }
  return { allowed: true };
}

export function createApp(repository = createRepository(openDatabase())) {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  repository.deleteExpiredSessions();

  app.get('/api/health', (_request, response) => {
    response.json({
      ok: true,
      storage: 'sqlite',
      migrations: repository.listMigrations().length,
      uptime: Math.round(process.uptime()),
    });
  });

  app.post('/api/auth/login', (request, response) => {
    const account = String(request.body?.account || '').trim().toLowerCase();
    const password = String(request.body?.password || '');
    const existingState = repository.getState();
    if (!account || !password) {
      response.status(400).json({ error: '请输入完整的用户账号和密码' });
      return;
    }
    if (!existingState) {
      response.status(401).json({ error: '系统尚未初始化业务数据' });
      return;
    }
    const state = secureStateForStorage(existingState, existingState);
    const user = state.users.find((item) => item.account === account && item.status === 'active');
    const passwordMatched = user && (verifyPassword(password, user.passwordHash) || user.password === password);
    if (!passwordMatched) {
      response.status(401).json({ error: '用户账号或密码不正确，或账号未启用' });
      return;
    }
    const savedState = repository.saveState(state);
    const session = createSession(repository, user.id);
    response.setHeader('Set-Cookie', `${sessionCookieName}=${encodeURIComponent(session.token)}; ${cookieOptions(session.expiresAt)}`);
    response.json({
      ok: true,
      user: sanitizeStateForClient(savedState, user.id).users.find((item) => item.id === user.id),
      state: sanitizeStateForClient(savedState, user.id),
      backups: repository.listBackups(),
    });
  });

  app.post('/api/auth/logout', (request, response) => {
    const token = parseCookies(request.headers.cookie || '')[sessionCookieName];
    if (token) repository.deleteSession(tokenHash(token));
    response.setHeader('Set-Cookie', `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
    response.json({ ok: true });
  });

  app.get('/api/auth/me', (request, response) => {
    const auth = readSession(repository, request);
    if (!auth) {
      response.status(401).json({ error: '未登录' });
      return;
    }
    response.json({
      user: sanitizeStateForClient(auth.state, auth.user.id).users.find((item) => item.id === auth.user.id),
      state: sanitizeStateForClient(auth.state, auth.user.id),
      backups: repository.listBackups(),
    });
  });

  app.get('/api/state', requireAuth(repository), (request, response) => {
    response.json({ state: sanitizeStateForClient(repository.getState(), request.auth.user.id) });
  });

  app.put('/api/state', (request, response) => {
    const nextState = request.body?.state;
    const error = validateBusinessState(nextState);
    if (error) {
      response.status(400).json({ error });
      return;
    }
    const existingState = repository.getState();
    const isInitialBootstrap = !existingState;
    const auth = isInitialBootstrap ? null : readSession(repository, request);
    if (!isInitialBootstrap && !auth) {
      response.status(401).json({ error: '未登录或登录已失效' });
      return;
    }
    if (!isInitialBootstrap && Number(nextState.revision || request.body?.revision || 0) !== Number(existingState.revision || 0)) {
      response.status(409).json({ error: '数据版本已变化，请刷新后再保存' });
      return;
    }
    const securedState = secureStateForStorage(nextState, existingState);
    const actor = isInitialBootstrap
      ? securedState.users.find((user) => normalizeRole(user.role) === 'pmo')
      : existingState.users.find((user) => user.id === auth.user.id);
    if (!isInitialBootstrap) {
      const permission = canSaveState(existingState, securedState, actor);
      if (!permission.allowed) {
        response.status(403).json({ error: permission.message });
        return;
      }
    }
    const savedState = {
      ...securedState,
      currentUserId: actor?.id || '',
      auditLogs: appendAudit({ ...securedState, currentUserId: actor?.id || '' }, request.body?.event),
    };
    const persisted = repository.saveState({ ...savedState, currentUserId: '' });
    response.json({
      ok: true,
      auditLogs: persisted.auditLogs,
      state: sanitizeStateForClient(persisted, actor?.id || ''),
      revision: persisted.revision,
    });
  });

  app.get('/api/backups', requireAuth(repository), (_request, response) => {
    response.json({ backups: repository.listBackups() });
  });

  app.put('/api/backups', requireAuth(repository), (request, response) => {
    if (normalizeRole(request.auth.user.role) !== 'pmo') {
      response.status(403).json({ error: '只有 PMO 可以保存备份数据' });
      return;
    }
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
