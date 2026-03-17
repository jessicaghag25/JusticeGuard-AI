import Header from './components/Header';
import FeatureCard from './components/FeatureCard';
import DashboardPage from './pages/DashboardPage';
import AuthPage from './pages/AuthPage';
import AccessibilityToolbar from './components/AccessibilityToolbar';
import { useI18n } from './i18n/i18n';

const features = [
  { title: 'Authentication', description: 'JWT + bcrypt auth via /api/signup and /api/login.' },
  {
    title: 'Document Upload',
    description: 'Drag/drop upload with metadata: employee, department, jurisdiction, document type.'
  },
  {
    title: 'Compliance Timeline',
    description: 'Chronological, expandable timeline with verification status, versions, and expiration highlights.'
  },
  {
    title: 'AI + Reports',
    description: 'AI guidance chat, actionable alerts, and PDF/CSV/Excel audit report exports with share controls.'
  }
];

export default function App() {
  const { highContrast, t } = useI18n();

  return (
    <main className={`min-h-screen text-slate-900 ${highContrast ? 'high-contrast bg-black text-white' : 'bg-slate-50'}`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:px-2 focus:py-1">
        {t('skipToMain')}
      </a>
      <Header />
      <AccessibilityToolbar />
      <section className="mx-auto grid max-w-6xl gap-4 px-6 py-8 md:grid-cols-2 lg:grid-cols-4" aria-label="Platform features">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </section>
      <div id="main-content" tabIndex={-1}>
        <AuthPage />
        <DashboardPage />
      </div>
    </main>
  );
}
