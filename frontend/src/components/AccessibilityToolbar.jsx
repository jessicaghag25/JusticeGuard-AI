import { useI18n } from '../i18n/i18n';

const langs = [
  ['en', 'English'],
  ['fr', 'Français'],
  ['es', 'Español'],
  ['pa', 'Punjabi'],
  ['hi', 'Hindi'],
  ['ti', 'Tigrinya']
];

export default function AccessibilityToolbar() {
  const { language, setLanguage, highContrast, setHighContrast, t } = useI18n();

  return (
    <div className="mx-auto mt-3 flex max-w-6xl flex-wrap items-center gap-2 px-6" aria-label="Accessibility controls">
      <label className="text-sm font-medium text-slate-700" htmlFor="language-select">
        {t('language')}
      </label>
      <select
        id="language-select"
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
      >
        {langs.map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
      <button
        onClick={() => setHighContrast((v) => !v)}
        className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white"
        title="Toggle high-contrast mode"
      >
        {t('highContrast')}
      </button>
    </div>
  );
}
