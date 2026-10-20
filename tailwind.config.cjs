// Mesma configuração que o legacy-shell.html declarava para o Tailwind CDN.
// Usada só em desenvolvimento por `npm run vendor:css` (gera vendor/tailwind.css, versionado).
module.exports = {
  // Hover só em dispositivos com hover real: evita "hover grudado" após o toque no celular.
  future: { hoverOnlyWhenSupported: true },
  content: ['./legacy-shell.html', './app-shell.html', './app.js', './faro-*.js'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'sans-serif'] },
      colors: { vetta: { 900: '#0B1121', 800: '#1E293B', 100: '#F1F5F9', 50: '#F8FAFC' } },
      boxShadow: { float: '0 10px 30px -5px rgba(37,99,235,.15)' }
    }
  }
};
