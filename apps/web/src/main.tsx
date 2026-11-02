import { StrictMode, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-ext-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-ext-500.css';
import './workspace-base.css';
import './styles.css';
import { AppProvider } from './context';
import { Shell } from './components/Shell';
import { Home } from './pages/Home';
import { EmptyState } from './components/common';
import { ThemeProvider } from './theme';

const Learn = lazy(() => import('./pages/Learn').then((module) => ({ default: module.Learn })));
const PracticeList = lazy(() =>
  import('./pages/PracticeList').then((module) => ({ default: module.PracticeList })),
);
const Workspace = lazy(() =>
  import('./pages/Workspace').then((module) => ({ default: module.Workspace })),
);
const Theory = lazy(() => import('./pages/Theory').then((module) => ({ default: module.Theory })));
const Progress = lazy(() =>
  import('./pages/Progress').then((module) => ({ default: module.Progress })),
);
const Admin = lazy(() => import('./pages/Admin').then((module) => ({ default: module.Admin })));
const Faq = lazy(() => import('./pages/Faq').then((module) => ({ default: module.Faq })));

function RouteAlias({ to, task = false }: { to: string; task?: boolean }) {
  const location = useLocation();
  const { id } = useParams();
  return (
    <Navigate
      replace
      to={`${to}${task && id ? `/${encodeURIComponent(id)}` : ''}${location.search}${location.hash}`}
    />
  );
}
function LearningEntry() {
  const location = useLocation();
  return new URLSearchParams(location.search).has('temat') ? (
    <RouteAlias to="/nauka/podstawy" />
  ) : (
    <Home />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AppProvider>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<RouteAlias to="/nauka" />} />
              <Route path="nauka" element={<LearningEntry />} />
              <Route path="nauka/podstawy" element={<Learn />} />
              <Route path="nauka/:id" element={<Learn />} />
              <Route path="katalog" element={<RouteAlias to="/arkusze" />} />
              <Route path="praktyka" element={<RouteAlias to="/arkusze" />} />
              <Route path="arkusze" element={<PracticeList />} />
              <Route path="arkusze/:id" element={<RouteAlias to="/praktyka" task />} />
              <Route path="praktyka/:id" element={<Workspace />} />
              <Route path="teoria" element={<Theory />} />
              <Route path="postepy" element={<RouteAlias to="/moje-prace" />} />
              <Route path="moje-prace" element={<Progress />} />
              <Route path="admin" element={<Admin />} />
              <Route path="faq" element={<Faq />} />
              <Route
                path="*"
                element={
                  <EmptyState title="Nie znaleziono tej strony" to="/" label="Wróć do pracowni">
                    Wybierz jeden z tematów w menu, aby wrócić do nauki.
                  </EmptyState>
                }
              />
            </Route>
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
