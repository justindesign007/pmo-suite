# PMO Suite

PMO Suite 是一个轻量级开源项目管理 MVP，面向 PMO、项目 Owner 和交付团队，用于统一维护项目、Sprint、成员、需求责任人与关键计划节点。

当前版本采用无构建依赖的单页应用形态，适合快速部署、验证流程和持续迭代。后续可以平滑替换数据层为 REST 或 GraphQL 服务端。

## 功能范围

- 项目增删改查
- Sprint 增删改查与二级详情页
- 系统级用户管理与角色模型
- 项目成员维护
- 需求编号、负责人、状态、优先级、WeTask 链接维护
- 里程碑与关键时间轴维护
- CSV / Excel 导入导出
- 本地 `localStorage` 数据适配层，后续可替换为 REST 或 GraphQL API

## 技术栈

- HTML / CSS / JavaScript
- 无前端构建依赖
- 浏览器本地存储
- Node.js 仅用于语法检查

## 本地运行

直接打开 `index.html`，或启动一个本地静态服务：

```bash
npm run start
```

然后访问：

```text
http://localhost:8000
```

## 默认登录账号

本地 MVP 使用浏览器 `localStorage` 保存数据。登录使用用户账号，默认演示账号如下，初始密码均为 `123456`：

- PMO：`zhangsan`
- PM：`lisi`
- 成员：`wangwu`

## 测试

```bash
npm test
```

当前 `npm test` 会执行 `src/main.js` 的 JavaScript 语法检查。

## Git 协作建议

- `main`：稳定版本分支
- `feature/<name>`：功能开发分支
- `fix/<name>`：缺陷修复分支
- 合并前至少运行一次 `npm test`

## 开源许可

MIT License
