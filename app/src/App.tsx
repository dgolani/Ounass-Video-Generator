import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Shell } from './app/Shell';
import { Home } from './app/routes/Home';
import { Dashboard } from './app/routes/Dashboard';
import { Gallery } from './app/routes/Gallery';
import { Editor } from './app/routes/Editor';
import { BrandKitRoute } from './app/routes/BrandKit';

export default function App() {
  return (
    <BrowserRouter>
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
