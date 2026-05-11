import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const log = execFileSync('git', ['log', '-8', '--date=format-local:%Y-%m-%d %H:%M', '--pretty=format:%h%x09%ad%x09%s'], {
  encoding: 'utf8',
});

const zhSummary = {
  'Polish marked UI details': ['优化登录页、侧边栏和按钮视觉细节', '精简 Sprint 详情页重复信息', '强化 WeTask 链接展示'],
  'Refine user management and release metadata': ['优化系统级用户管理表单', '新增版本信息与更新日志元数据', '保护业务数据避免被系统更新覆盖'],
  'Add functional coverage for sprint detail flow': ['补充 Sprint 详情页功能用例', '验证项目与 Sprint 关联切换'],
  'Use account login and fixed sidebar layout': ['切换为用户账号登录', '固定左侧系统菜单高度与滚动结构'],
  'Refine sidebar account actions and permissions': ['优化侧边栏账号与退出操作', '完善 PMO、PM、成员权限展示'],
  'Fix preview login without bypassing auth': ['修复预览窗口登录问题', '保留正常账号密码校验逻辑'],
  'Fix preview login entry': ['修复预览环境登录入口响应'],
  'Add direct login click fallback': ['新增登录按钮直接点击兜底逻辑', '提升内嵌预览环境登录稳定性'],
  'Handle login via explicit click action': ['补充显式登录点击事件处理'],
  'Allow debug login from empty login form': ['增加早期调试登录能力'],
  'Refine login page presentation': ['优化登录页视觉呈现'],
  'Add login and role-based permissions': ['新增登录模块', '增加基于角色的权限控制'],
};

const entries = log
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [commit, date, ...messageParts] = line.split('\t');
    const message = messageParts.join('\t');
    return { commit, date, message, points: zhSummary[message] || ['完成一次系统功能更新'] };
  });

const lastTag = (() => {
  try {
    return execFileSync('git', ['describe', '--tags', '--abbrev=0'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '0.6.0';
  }
})();

const now = new Date();
const buildDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
const content = `window.PMO_META = ${JSON.stringify({
  version: lastTag.replace(/^v/, ''),
  buildDate,
  dataSchema: 1,
  changelog: entries,
}, null, 2)};\n`;

writeFileSync(new URL('../src/meta.js', import.meta.url), content);
