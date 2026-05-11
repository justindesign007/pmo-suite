(function registerSecondaryPages() {
  window.PMO_PAGE_FACTORIES = window.PMO_PAGE_FACTORIES || {};
  window.PMO_PAGE_FACTORIES.secondary = (ctx) => ({
    sprintDetail: () => ctx.renderSprintPage(),
    sprintCreate: () => ctx.renderSprintCreatePage(),
    requirementDetail: () => ctx.renderRequirementPage(),
    milestoneDetail: () => ctx.renderMilestonePage(),
    about: () => ctx.renderAboutPage(),
    changelog: () => ctx.renderChangelogPage(),
  });
})();
