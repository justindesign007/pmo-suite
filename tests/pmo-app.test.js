import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

function createRuntime(savedState = null, { blockStorage = false } = {}) {
  const listeners = {};
  const store = new Map();
  if (savedState) store.set('pmo-sprint-api-cache-v2', JSON.stringify(savedState));

  const app = {
    innerHTML: '',
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    querySelector() {
      return null;
    },
  };

  class FakeFormData {
    constructor(form) {
      this.form = form || { fields: {} };
    }

    get(key) {
      return this.form.fields?.[key] || '';
    }

    entries() {
      return Object.entries(this.form.fields || {});
    }
  }

  const context = {
    console,
    structuredClone,
    FormData: FakeFormData,
    Blob: class {},
    URL: {
      createObjectURL() {
        return 'blob:test';
      },
      revokeObjectURL() {},
    },
    document: {
      querySelector(selector) {
        return selector === '#app' ? app : null;
      },
    },
    window: {
      localStorage: {
        getItem(key) {
          return store.get(key) || null;
        },
        setItem(key, value) {
          if (blockStorage) throw new Error('simulated blocked storage');
          store.set(key, String(value));
        },
      },
      setTimeout() {},
      confirm() {
        return true;
      },
    },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { app, context, listeners, store };
}

function click(listeners, action, dataset = {}) {
  const target = {
    dataset: { action, ...dataset },
    closest() {
      return this;
    },
  };
  listeners.click({ target });
}

function submit(listeners, formName, fields) {
  listeners.submit({
    preventDefault() {},
    target: {
      dataset: { form: formName },
      fields,
      querySelector() {
        return null;
      },
    },
  });
}

test('strict account login works when preview storage writes are blocked', () => {
  const { app, context } = createRuntime(null, { blockStorage: true });

  assert.match(app.innerHTML, /login-page/);
  context.window.pmoLogin({
    preventDefault() {},
    stopPropagation() {},
    target: {
      closest() {
        return { fields: { account: '', password: '' } };
      },
    },
  });
  assert.match(app.innerHTML, /请输入完整的用户账号和密码/);
  assert.match(app.innerHTML, /login-page/);

  context.window.pmoLogin({
    preventDefault() {},
    stopPropagation() {},
    target: {
      closest() {
        return { fields: { account: 'zhangsan', password: '123456' } };
      },
    },
  });
  assert.doesNotMatch(app.innerHTML, /login-page/);
  assert.match(app.innerHTML, /system-sidebar/);
});

test('role permissions render as PMO full access, PM project operations, member read-only', () => {
  const pmo = createRuntime({ currentUserId: 'u-1' }).app.innerHTML;
  assert.match(pmo, /data-action="new-project"/);
  assert.match(pmo, /成员管理/);

  const pm = createRuntime({ currentUserId: 'u-2' }).app.innerHTML;
  assert.doesNotMatch(pm, /data-action="new-project"/);
  assert.match(pm, /编辑项目/);
  assert.match(pm, /\+ Sprint/);
  assert.match(pm, /成员管理/);

  const member = createRuntime({ currentUserId: 'u-3' }).app.innerHTML;
  assert.doesNotMatch(member, /成员管理/);
  assert.doesNotMatch(member, /编辑项目/);
  assert.doesNotMatch(member, /\+ Sprint/);
});

test('opening a sprint detail syncs the owning project before rendering detail page', () => {
  const savedState = {
    currentUserId: 'u-1',
    selectedProjectId: 'p-1',
    selectedSprintId: 's-1',
    sprints: [
      {
        id: 's-1',
        projectId: 'p-1',
        name: 'Sprint 1 - 项目规划闭环',
        goal: '完成项目和 Sprint 的核心规划链路。',
        description: '覆盖项目 CRUD、Sprint CRUD、关键需求与时间轴设置。',
        owner: 'u-3',
        status: 'active',
        priority: 'high',
        startDate: '2026-05-12',
        endDate: '2026-05-26',
        acceptanceCriteria: '可以创建项目、创建 Sprint，并配置需求、里程碑和时间轴节点。',
        teams: ['产品', '研发', '测试'],
      },
      {
        id: 's-2',
        projectId: 'p-2',
        name: 'Sprint 2 - 财务流程梳理',
        goal: '完成财务流程改造需求梳理。',
        description: '面向财务自动化项目的 Sprint。',
        owner: 'u-2',
        status: 'not_started',
        priority: 'medium',
        startDate: '2026-06-03',
        endDate: '2026-06-17',
        acceptanceCriteria: '形成流程清单。',
        teams: ['产品', '数据'],
      },
    ],
  };
  const { app, listeners } = createRuntime(savedState);

  assert.match(app.innerHTML, /Sprint 2 - 财务流程梳理/);
  click(listeners, 'open-sprint', { id: 's-2' });
  assert.match(app.innerHTML, /detail-page/);
  assert.match(app.innerHTML, /Sprint 2 - 财务流程梳理/);
  assert.match(app.innerHTML, /当前项目：财务自动化流程改造/);
  assert.doesNotMatch(app.innerHTML, /当前项目：企业客户项目看板 MVP/);
});

test('PMO can create a project from the drawer workflow', () => {
  const { app, listeners } = createRuntime({ currentUserId: 'u-1' });

  click(listeners, 'new-project');
  assert.match(app.innerHTML, /data-form="project"/);
  submit(listeners, 'project', {
    name: '新客户交付项目',
    owner: 'u-2',
    status: 'planning',
    startDate: '2026-07-01',
    endDate: '2026-08-01',
    goal: '验证 PMO 创建项目闭环。',
    description: '自动化用例创建。',
    'members.0.name': 'u-2',
  });

  assert.match(app.innerHTML, /新客户交付项目/);
  assert.doesNotMatch(app.innerHTML, /drawer open/);
});

test('PM can create a sprint in an owned project', () => {
  const { app, listeners } = createRuntime({ currentUserId: 'u-2', selectedProjectId: 'p-1' });

  click(listeners, 'new-sprint', { id: 'p-1' });
  assert.match(app.innerHTML, /data-form="sprint"/);
  submit(listeners, 'sprint', {
    name: 'Sprint PM 操作用例',
    owner: 'u-2',
    status: 'not_started',
    priority: 'medium',
    startDate: '2026-05-27',
    endDate: '2026-06-10',
    goal: '验证 PM 可以创建自己项目下的 Sprint。',
    businessGoal: '',
    deliveryGoal: '',
    qualityGoal: '',
    acceptanceCriteria: '保存后能进入 Sprint 列表。',
    riskNote: '',
  });

  assert.match(app.innerHTML, /Sprint PM 操作用例/);
});

test('member write operations are blocked even if events are triggered manually', () => {
  const { app, listeners } = createRuntime({ currentUserId: 'u-3', selectedProjectId: 'p-1' });

  assert.doesNotMatch(app.innerHTML, /编辑项目/);
  click(listeners, 'new-sprint', { id: 'p-1' });
  assert.doesNotMatch(app.innerHTML, /data-form="sprint"/);
  assert.match(app.innerHTML, /只有 PMO 或项目 PM 可以管理 Sprint/);

  click(listeners, 'new-project');
  assert.doesNotMatch(app.innerHTML, /data-form="project"/);
  assert.match(app.innerHTML, /只有 PMO 可以创建项目/);
});
