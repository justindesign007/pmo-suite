(function registerTertiaryPages() {
  window.PMO_PAGE_FACTORIES = window.PMO_PAGE_FACTORIES || {};
  window.PMO_PAGE_FACTORIES.tertiary = (ctx) => ({
    sprintEditBasic: () => ctx.renderSprintEditPage(),
    sprintEditPlan: () => ctx.renderSprintEditPage(),
    sprintEditRequirements: () => ctx.renderSprintEditPage(),
  });
})();
