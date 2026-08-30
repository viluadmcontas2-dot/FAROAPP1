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

  const baseRecordNumbers = app.recordNumbers;
  app.recordNumbers = function(record, context) {
    const result = baseRecordNumbers.call(this, record, context);
    const km = this.number(record?.km);

    if (record?.fuelCostKmSnapshot != null && this.number(record?.fuelSpend) <= 0) {
      const expectedFuel = km * this.number(record.fuelCostKmSnapshot);
      const fuelDelta = result.fuel - expectedFuel;
      result.fuel = expectedFuel;
      result.contribution += fuelDelta;
      result.net += fuelDelta;
      result.costPerKm = km > 0 ? (result.fuel + result.variable + result.percentCost) / km : 0;
    }

    if (record?.fixedShareSnapshot != null) {
      const expectedFixedShare = this.number(record.fixedShareSnapshot);
      const fixedDelta = result.fixedShare - expectedFixedShare;
      result.fixedShare = expectedFixedShare;
      result.net += fixedDelta;
    }

    return result;
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
