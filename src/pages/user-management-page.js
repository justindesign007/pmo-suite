(function registerUserManagementPage() {
  window.PMO_PAGE_FACTORIES = window.PMO_PAGE_FACTORIES || {};
  window.PMO_PAGE_FACTORIES.userManagement = (ctx) => ({
    users: () => {
      if (!ctx.canManageUsers()) {
        ctx.state.view = 'overview';
        return '';
      }
      const users = ctx.visibleUsers();
      return `
        <main class="project-overview">
          <section class="panel card">
            <div class="section-head">
              <div>
                <h2>${ctx.isPmo() ? '系统用户' : '项目成员'}</h2>
                <p class="small">${ctx.isPmo() ? 'PMO 可设置 PM、成员和角色权限。' : 'PM 可查看项目相关账号，用户增删改由 PMO 统一维护。'}</p>
              </div>
              ${ctx.isPmo() ? '<button class="button" data-action="new-user">+ 新建用户</button>' : ''}
            </div>
            <div class="user-table-wrap">
              <table class="user-table">
                <thead>
                  <tr>
                    <th>用户账号</th>
                    <th>姓名</th>
                    <th>角色</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  ${users.map((user) => `
                    <tr>
                      <td><strong>${ctx.escapeHtml(user.account || '-')}</strong></td>
                      <td>${ctx.escapeHtml(user.name || '-')}</td>
                      <td>${ctx.roleLabels[ctx.normalizeRole(user.role)]}</td>
                      <td>${user.status === 'active' ? '启用' : '停用'}</td>
                      <td>
                        <div class="card-actions table-actions">
                          ${ctx.canEditUser(user) ? `<button class="link-button" data-action="edit-user" data-id="${user.id}">编辑</button>` : '<button class="link-button" disabled>编辑</button>'}
                          ${ctx.canDeleteUser(user) ? `<button class="link-button danger" data-action="delete-user" data-id="${user.id}">删除</button>` : '<button class="link-button danger" disabled>删除</button>'}
                        </div>
                      </td>
                    </tr>
                  `).join('') || '<tr><td colspan="5"><div class="empty-state">暂无可管理成员</div></td></tr>'}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      `;
    },
  });
})();
