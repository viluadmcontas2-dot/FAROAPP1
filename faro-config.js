(() => {
  // Somente valores publicáveis entram neste arquivo. Segredos vivem exclusivamente no backend.
  window.FARO_CONFIG = Object.freeze({
    schemaVersion: 1,
    supabaseUrl: 'https://mjbyqhreptllilkggiri.supabase.co',
    supabasePublishableKey: 'sb_publishable_UBGdQk2oIJyuWgEcDpK59Q_RFvwWQzS',
    otpChannel: 'whatsapp',
    billingEnabled: true,
    pushEnabled: false,
    pushPublicKey: ''
  });
})();
