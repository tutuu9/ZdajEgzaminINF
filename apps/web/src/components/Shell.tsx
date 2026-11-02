import {
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  ChevronRight,
  FolderOpen,
  GraduationCap,
  House,
  LockKeyhole,
  Menu,
  PanelLeftClose,
  PenLine,
  ShieldCheck,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Suspense, useEffect, useState } from 'react';
import { useApp } from '../context';
import { ErrorNotice, Loading } from './common';
import { RouteErrorBoundary } from './RouteErrorBoundary';

const navigation = [
  { to: '/', label: 'Moja pracownia', icon: House, end: true },
  { to: '/nauka', label: 'Ścieżka nauki', icon: BookOpen },
  { to: '/praktyka', label: 'Zadania praktyczne', icon: PenLine },
  { to: '/teoria', label: 'Ćwicz teorię', icon: GraduationCap },
  { to: '/katalog', label: 'Arkusze egzaminacyjne', icon: FolderOpen },
  { to: '/postepy', label: 'Moje postępy', icon: ChartNoAxesCombined },
];
export function Shell() {
  const { error, reload, completed, data } = useApp();
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  useEffect(() => setMenu(false), [location.pathname]);
  const active = navigation.find((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
  );
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Przejdź do treści
      </a>
      {menu && (
        <button
          className="sidebar-overlay"
          aria-label="Zamknij menu"
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        id="site-navigation"
        className={`sidebar ${menu ? 'open' : ''}`}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setMenu(false);
        }}
      >
        <NavLink to="/" className="brand">
          <span className="brand-symbol">
            inf<span>.</span>
          </span>
          <span>
            Zdaj Egzamin<small>Twoja pracownia informatyczna</small>
          </span>
        </NavLink>
        <button
          className="mobile-close icon-button"
          aria-label="Zamknij menu"
          onClick={() => setMenu(false)}
        >
          <X size={22} />
        </button>
        <div className="qualification-switch">
          <span className="qualification-dot" />
          <strong>INF.03</strong>
          <span>Web i bazy danych</span>
        </div>
        <nav aria-label="Nawigacja główna">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              end={end}
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <Icon size={19} />
              <span>{label}</span>
              <ChevronRight size={14} className="nav-chevron" />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-progress">
          <div>
            <span>Twój rytm nauki</span>
            <strong>
              {completed.length}
              <small> / {data?.lessons.length ?? 12}</small>
            </strong>
          </div>
          <div className="progress-track">
            <span
              style={{
                width: `${Math.min(100, (completed.length / (data?.lessons.length || 12)) * 100)}%`,
              }}
            />
          </div>
          <p>Każdy mały krok ma znaczenie.</p>
        </div>
        <div className="sidebar-footer">
          <div>
            <ShieldCheck size={18} />
            <p>
              Twój postęp zostaje
              <br />
              <strong>w tej przeglądarce.</strong>
            </p>
          </div>
          <NavLink to="/admin">
            <LockKeyhole size={15} />
            Panel administratora
            <ArrowUpRight size={13} />
          </NavLink>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Otwórz menu"
              aria-controls="site-navigation"
              aria-expanded={menu}
              onClick={() => setMenu(true)}
            >
              <Menu size={22} />
            </button>
            <PanelLeftClose size={17} className="desktop-only muted" />
            <span>Pracownia</span>
            <ChevronRight size={13} />
            <strong>
              {location.pathname.startsWith('/admin') ? 'Administracja' : active?.label || 'Nauka'}
            </strong>
          </div>
          <span className="topbar-badge">
            <span />
            Arkusze CKE · INF.03
          </span>
        </header>
        <main
          id="main-content"
          className={`main-content ${location.pathname.startsWith('/praktyka/') ? 'workspace-main' : ''}`}
        >
          {error && <ErrorNotice message={error} onRetry={() => void reload()} />}
          <RouteErrorBoundary key={location.pathname}>
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        </main>
        <footer className="main-footer">
          <span>Zdaj Egzamin INF</span>
          <span>Niezależny projekt edukacyjny. Wyniki nie są oceną CKE.</span>
        </footer>
      </div>
    </div>
  );
}
