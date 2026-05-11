(function registerDataBackupPage() {
  window.PMO_PAGE_FACTORIES = window.PMO_PAGE_FACTORIES || {};
  window.PMO_PAGE_FACTORIES.dataBackup = (ctx) => ({
    dataBackup: () => {
      if (!ctx.isPmo()) {
        ctx.state.view = 'overview';
        return '';
      }
      const backups = ctx.dataBackups();
      const latestBackup = backups[0];
      return `
        <main class="project-overview">
          <section class="panel card backup-panel">
            <div class="section-head">
              <div>
                <h2>数据备份</h2>
                <p class="small">业务数据与系统版本解耦。建议在导入、升级或大批量调整成员前手动备份。</p>
              </div>
              <div class="card-actions">
                <button class="button" data-action="create-backup">手动备份</button>
                <button class="button" data-action="restore-backup" data-id="${ctx.escapeHtml(latestBackup?.id || '')}" ${latestBackup ? '' : 'disabled'}>恢复最近备份</button>
              </div>
            </div>
            <div class="backup-summary-grid">
              <div><span>最近备份</span><strong>${latestBackup ? ctx.escapeHtml(ctx.formatDateTime(latestBackup.createdAt)) : '暂无备份'}</strong></div>
              <div><span>用户</span><strong>${latestBackup?.summary?.users ?? '-'} 个</strong></div>
              <div><span>项目</span><strong>${latestBackup?.summary?.projects ?? '-'} 个</strong></div>
              <div><span>Sprint</span><strong>${latestBackup?.summary?.sprints ?? '-'} 个</strong></div>
            </div>
            ${backups.length ? `
              <div class="backup-list">
                ${backups.slice(0, 8).map((backup) => `
                  <div class="backup-row">
                    <div>
                      <strong>${ctx.escapeHtml(ctx.formatDateTime(backup.createdAt))}</strong>
                      <span>${backup.summary?.users || 0} 用户 · ${backup.summary?.projects || 0} 项目 · ${backup.summary?.sprints || 0} Sprint · ${backup.summary?.requirements || 0} 需求</span>
                    </div>
                    <button class="link-button" data-action="restore-backup" data-id="${ctx.escapeHtml(backup.id)}">恢复</button>
                  </div>
                `).join('')}
              </div>
            ` : '<div class="empty-state">暂无数据备份</div>'}
          </section>
        </main>
      `;
    },
  });
})();
