import { StrictMode, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import '@fontsource/source-sans-3/latin-400.css';
import '@fontsource/source-sans-3/latin-ext-400.css';
import '@fontsource/source-sans-3/latin-500.css';
import '@fontsource/source-sans-3/latin-ext-500.css';
import '@fontsource/source-sans-3/latin-600.css';
import '@fontsource/source-sans-3/latin-ext-600.css';
import '@fontsource/source-sans-3/latin-700.css';
import '@fontsource/source-sans-3/latin-ext-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-ext-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-ext-500.css';
import './styles.css';
import { AppProvider } from './context';
import { Shell } from './components/Shell';
import { Home } from './pages/Home';
import { EmptyState } from './components/common';

const Learn = lazy(() => import('./pages/Learn').then((module) => ({ default: module.Learn })));
const Catalog = lazy(() =>
  import('./pages/Catalog').then((module) => ({ default: module.Catalog })),
);
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Home />} />
            <Route path="nauka" element={<Learn />} />
            <Route path="nauka/:id" element={<Learn />} />
            <Route path="katalog" element={<Catalog />} />
            <Route path="praktyka" element={<PracticeList />} />
            <Route path="praktyka/:id" element={<Workspace />} />
            <Route path="teoria" element={<Theory />} />
            <Route path="postepy" element={<Progress />} />
            <Route path="admin" element={<Admin />} />
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
  </StrictMode>,
);
