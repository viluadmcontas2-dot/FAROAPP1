(() => {
  const app = window.__vettaApp;
  if (!app || window.FaroState) return;

  const ensureExtensions = value => {
    const state = value && typeof value === 'object' && !Array.isArray(value) ? value : {};

    if (!Array.isArray(state.paymentOccurrences)) state.paymentOccurrences = [];
    if (!state.paymentTrackingStartedAt) state.paymentTrackingStartedAt = app.todayKey();
    if (!Array.isArray(state.reserveContributions)) state.reserveContributions = [];
    if (!state.reserveProfiles || typeof state.reserveProfiles !== 'object' || Array.isArray(state.reserveProfiles)) state.reserveProfiles = {};

    return state;
  };

  const baseNormalizeState = app.normalizeState;
  app.normalizeState = function(value) {
    return ensureExtensions(baseNormalizeState.call(this, value));
  };

  const current = ensureExtensions(app.state);
  if (current !== app.state) app.state = current;
  app.save();

  window.FaroState = Object.freeze({
    ensure: ensureExtensions
  });
})();
