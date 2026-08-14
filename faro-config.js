(() => {
  // Somente valores publicáveis entram neste arquivo. Segredos vivem exclusivamente no backend.
  window.FARO_CONFIG = Object.freeze({
    schemaVersion: 1,
    supabaseUrl: '',
    supabasePublishableKey: '',
    otpChannel: 'whatsapp',
    billingEnabled: true,
    pushEnabled: false,
    pushPublicKey: ''
  });
})();
