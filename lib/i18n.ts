import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  resources: {
    es: {
      translation: {
        home: "Inicio",
        profile: "Perfil",
        news: "Noticias",
        signin: "Iniciar sesión",
        signout: "Salir",
      },
    },
    en: {
      translation: {
        home: "Home",
        profile: "Profile",
        news: "News",
        signin: "Sign in",
        signout: "Sign out",
      },
    },
  },
  lng: "es",
  fallbackLng: "es",
  interpolation: { escapeValue: false },
});

export default i18n;
