import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Shell } from './app/Shell';
import { Home } from './app/routes/Home';
import { Dashboard } from './app/routes/Dashboard';
import { Gallery } from './app/routes/Gallery';
import { Editor } from './app/routes/Editor';
import { BrandKitRoute } from './app/routes/BrandKit';
import { useBrand } from './store/brand';
import { useApplyTypographyCSSVars } from './engine/typography';

/** Top-level side-effect: keep :root CSS `--font-*` variables in sync with
 *  the active brand kit so every scene downstream picks up the current
 *  typography without prop drilling. */
function BrandTypographyBridge() {
  const [brand] = useBrand();
  useApplyTypographyCSSVars(brand.typography);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <BrandTypographyBridge />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/templates" element={<Gallery />} />
          <Route path="/brand" element={<BrandKitRoute />} />
          <Route path="/editor/:id" element={<Editor />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
