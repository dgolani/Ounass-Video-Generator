import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Shell } from './app/Shell';
import { Home } from './app/routes/Home';
import { Dashboard } from './app/routes/Dashboard';
import { Gallery } from './app/routes/Gallery';
import { Editor } from './app/routes/Editor';
import { BrandKitRoute } from './app/routes/BrandKit';
import { useBrand } from './store/brand';
import { useApplyTypographyCSSVars } from './engine/typography';
import { SafeZoneOverridesContext } from './engine';

/** Top-level side-effect: keep :root CSS `--font-*` variables in sync with
 *  the active brand kit so every scene downstream picks up the current
 *  typography without prop drilling. */
function BrandTypographyBridge() {
  const [brand] = useBrand();
  useApplyTypographyCSSVars(brand.typography);
  return null;
}

/** Expose the brand kit's safe-zone overrides to every scene via context.
 *  `useSafeZone(aspect)` reads the context and falls back to DEFAULT_SAFE_ZONES
 *  when the brand kit hasn't overridden a particular aspect. Editing a zone
 *  value in Brand Kit re-renders every scene downstream instantly. */
function BrandSafeZoneBridge({ children }: { children: ReactNode }) {
  const [brand] = useBrand();
  return (
    <SafeZoneOverridesContext.Provider value={brand.safeZones}>
      {children}
    </SafeZoneOverridesContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <BrandTypographyBridge />
      <BrandSafeZoneBridge>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<Shell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/templates" element={<Gallery />} />
            <Route path="/brand" element={<BrandKitRoute />} />
            <Route path="/editor/:id" element={<Editor />} />
          </Route>
        </Routes>
      </BrandSafeZoneBridge>
    </BrowserRouter>
  );
}
