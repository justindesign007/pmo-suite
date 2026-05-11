(function registerHomePage() {
  window.PMO_PAGE_FACTORIES = window.PMO_PAGE_FACTORIES || {};
  window.PMO_PAGE_FACTORIES.home = (ctx) => ({
    overview: () => ctx.renderProjectOverview(),
  });
})();
