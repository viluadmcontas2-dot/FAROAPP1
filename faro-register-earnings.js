(() => {
  const SOURCES = Object.freeze(['uber', 'ninetyNine', 'indrive', 'extras']);

  const number = value => {
    const parsed = Number(String(value ?? '').trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const normalize = raw => Object.fromEntries(SOURCES.map(key => {
    const value = number(raw?.[key]);
    if (value < 0) throw new Error(`Valor negativo não permitido: ${key}`);
    return [key, Math.round(value * 100) / 100];
  }));

  const total = raw => Object.values(normalize(raw)).reduce(
    (sum, value) => Math.round((sum + value) * 100) / 100,
    0
  );

  const hasAny = raw => Object.values(normalize(raw)).some(value => value > 0);

  window.FaroRegisterEarnings = Object.freeze({ SOURCES, normalize, total, hasAny });
})();
