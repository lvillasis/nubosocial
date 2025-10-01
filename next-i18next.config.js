// next-i18next.config.js
module.exports = {
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
  },
  localeDetection: true, // ✅ detecta y guarda automáticamente en cookies
  reloadOnPrerender: process.env.NODE_ENV === "development",
};