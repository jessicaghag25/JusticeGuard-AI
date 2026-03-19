import { useI18n } from '../i18n/i18n';

export default function Header() {
  const { t } = useI18n();

  return (
    <header className="bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <h1 className="text-3xl font-bold" aria-label="96ply brand">
          <span className="text-brandRed">96</span>
          <span className="text-brandBlue">ply</span>
        </h1>
        <p className="text-sm text-slate-600">{t('appTitle')}</p>
      </div>
    </header>
  );
}
