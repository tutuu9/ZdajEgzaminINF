import {
  BookOpen,
  FolderOpen,
  GraduationCap,
  Layers3,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import { useApp } from '../context';
import { ErrorNotice, Loading } from './common';
import { RouteErrorBoundary } from './RouteErrorBoundary';

const navigation = [
  { to: '/nauka', label: 'Nauka', icon: BookOpen },
  { to: '/arkusze', label: 'Arkusze', icon: Layers3 },
  { to: '/teoria', label: 'Teoria', icon: GraduationCap },
  { to: '/moje-prace', label: 'Moje prace', icon: FolderOpen },
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
            {navigation.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <span className="qualification-badge">
            <span />
            INF.03
          </span>
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
              <NavLink to="/admin">
                <LockKeyhole size={13} />
                Administracja
              </NavLink>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
