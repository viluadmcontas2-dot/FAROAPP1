(() => {
  const app = window.__vettaApp;
  if (!app) return;

  const ELECTRIC = Object.freeze({ type: 'electric', label: 'Elétrico', unit: 'kWh' });
  const fuelType = app.$('fuelType');

  const ensureElectricOption = () => {
    if (!fuelType || fuelType.querySelector('option[value="electric"]')) return;
    const option = document.createElement('option');
    option.value = 'electric';
    option.textContent = 'Elétrico';
    fuelType.insertBefore(option, fuelType.querySelector('option[value="custom"]') || null);
  };

  const baseSyncInputs = app.syncInputs;
  app.syncInputs = function(...args) {
    ensureElectricOption();
    const result = baseSyncInputs.apply(this, args);
    if (this.state?.fuel?.type === 'electric' && fuelType) fuelType.value = 'electric';
    return result;
  };

  const baseSyncFuelLabels = app.syncFuelLabels;
  app.syncFuelLabels = function() {
    if (this.state?.fuel?.type !== 'electric') return baseSyncFuelLabels.call(this);
    this.$('customFuelNameWrap')?.classList.add('hidden');
    if (this.$('fuelUnitLabel')) this.$('fuelUnitLabel').textContent = ELECTRIC.unit;
    if (this.$('fuelEfficiencyUnit')) this.$('fuelEfficiencyUnit').textContent = ELECTRIC.unit;
  };

  const baseChangeFuelType = app.changeFuelType;
  app.changeFuelType = function(type) {
    if (type !== 'electric') return baseChangeFuelType.call(this, type);

    const previous = this.state?.fuel?.type === 'electric' ? this.state.fuel : null;
    this.state.fuel = {
      ...ELECTRIC,
      price: Number(previous?.price) || 0,
      efficiency: Number(previous?.efficiency) || 0
    };
    this.save();
    this.syncInputs();
    this.render();
    if (this.state.fuel.price <= 0 || this.state.fuel.efficiency <= 0) {
      this.toast('Elétrico selecionado. Informe preço por kWh e rendimento para manter a meta precisa.');
    }
  };

  const baseUpdateFuelFromForm = app.updateFuelFromForm;
  app.updateFuelFromForm = function() {
    if (this.$('fuelType').value !== 'electric') return baseUpdateFuelFromForm.call(this);

    this.state.fuel = {
      ...ELECTRIC,
      price: this.number(this.$('fuelPrice').value),
      efficiency: this.number(this.$('fuelEfficiency').value)
    };
    this.save();
    this.syncFuelLabels();
    this.render();
  };

  ensureElectricOption();
  app.syncInputs();

  window.FaroEnergy = Object.freeze({
    electricType: ELECTRIC.type,
    electricUnit: ELECTRIC.unit,
    isElectric: () => app.state?.fuel?.type === 'electric'
  });
})();
