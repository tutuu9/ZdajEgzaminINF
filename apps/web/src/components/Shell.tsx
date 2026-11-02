import {
  BookOpen,
  CircleHelp,
  FolderOpen,
  GraduationCap,
  Layers3,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import { useApp } from '../context';
import { ErrorNotice, Loading } from './common';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { ThemePicker } from './ThemePicker';

const navigation = [
  { to: '/nauka', label: 'Nauka', icon: BookOpen },
  { to: '/arkusze', label: 'Arkusze', icon: Layers3 },
  { to: '/teoria', label: 'Teoria', icon: GraduationCap },
  { to: '/moje-prace', label: 'Moje prace', icon: FolderOpen },
  { to: '/faq', label: 'Pytania i odpowiedzi', shortLabel: 'FAQ', icon: CircleHelp },
];
export function Shell() {
  const { error, reload } = useApp();
  const location = useLocation();
  const workspace = /^\/(praktyka|arkusze)\/[^/]+/.test(location.pathname);
  return (
    <div className={`app-shell${workspace ? ' workspace-shell' : ''}`}>
      <a href="#main-content" className="skip-link">
        Przejdź do treści
      </a>
      {!workspace && (
        <header className="site-header glass-panel">
          <NavLink to="/nauka" className="brand" aria-label="Zdaj Egzamin INF — nauka">
            <span className="brand-symbol">
              inf<span>.</span>
            </span>
            <span>
              Zdaj Egzamin<small>Twoje miejsce na INF.03</small>
            </span>
          </NavLink>
          <nav className="main-navigation" aria-label="Nawigacja główna">
            {navigation.map(({ to, label, shortLabel, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                aria-label={label}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span className={shortLabel ? 'nav-label-long' : undefined}>{label}</span>
                {shortLabel && <span className="nav-label-short">{shortLabel}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="header-tools">
            <span className="qualification-badge">
              <span />
              INF.03
            </span>
            <ThemePicker />
          </div>
        </header>
      )}
      <div className="main-area">
        <main id="main-content" className={`main-content${workspace ? ' workspace-main' : ''}`}>
          {error && <ErrorNotice message={error} onRetry={() => void reload()} />}
          <RouteErrorBoundary key={location.pathname}>
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        </main>
        {!workspace && (
          <footer className="main-footer">
            <span>
              <ShieldCheck size={15} />
              Postęp zapisuje się w tej przeglądarce.
            </span>
            <div>
              <span>Niezależny projekt edukacyjny</span>
              <a href="https://t.me/tutuu9" target="_blank" rel="noopener noreferrer">
                <Send size={13} aria-hidden="true" />
                Właściciel
              </a>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
