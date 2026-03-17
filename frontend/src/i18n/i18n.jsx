import { createContext, useContext, useMemo, useState } from 'react';

const dictionaries = {
  en: { appTitle: 'Compliance Management Platform', language: 'Language', highContrast: 'High Contrast', skipToMain: 'Skip to main content' },
  fr: { appTitle: 'Plateforme de gestion de la conformité', language: 'Langue', highContrast: 'Contraste élevé', skipToMain: 'Aller au contenu principal' },
  es: { appTitle: 'Plataforma de Gestión de Cumplimiento', language: 'Idioma', highContrast: 'Alto contraste', skipToMain: 'Saltar al contenido principal' },
  pa: { appTitle: 'ਕੰਪਲਾਇੰਸ ਮੈਨੇਜਮੈਂਟ ਪਲੇਟਫਾਰਮ', language: 'ਭਾਸ਼ਾ', highContrast: 'ਉੱਚ ਕਾਂਟ੍ਰਾਸਟ', skipToMain: 'ਮੁੱਖ ਸਮੱਗਰੀ ਤੇ ਜਾਓ' },
  hi: { appTitle: 'अनुपालन प्रबंधन प्लेटफ़ॉर्म', language: 'भाषा', highContrast: 'उच्च कंट्रास्ट', skipToMain: 'मुख्य सामग्री पर जाएँ' },
  ti: { appTitle: 'መድረኽ ምሕደራ ምግባር ሕጊ', language: 'ቋንቋ', highContrast: 'ልዑል ኮንትራስት', skipToMain: 'ናብ ቀንዲ ትሕዝቶ ዝለግስ' }
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [highContrast, setHighContrast] = useState(false);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      highContrast,
      setHighContrast,
      t: (key) => dictionaries[language]?.[key] || dictionaries.en[key] || key
    }),
    [language, highContrast]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
