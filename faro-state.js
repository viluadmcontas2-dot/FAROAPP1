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

  const baseCloneDefaults = app.cloneDefaults;
  app.cloneDefaults = function() {
    return ensureExtensions(baseCloneDefaults.call(this));
  };

  const baseNormalizeState = app.normalizeState;
  app.normalizeState = function(value) {
    return ensureExtensions(baseNormalizeState.call(this, value));
  };

  app.exportData = function() {
    const payload = {
      app: 'FARO',
      version: Number(this.state?.version || 1),
      exportedAt: new Date().toISOString(),
      data: this.state
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `faro-backup-${this.todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.toast('Backup FARO exportado.');
  };

  app.state = ensureExtensions(app.state);
  app.save();

  window.FaroState = Object.freeze({ ensure: ensureExtensions, backupFormat: 'FARO' });
})();
