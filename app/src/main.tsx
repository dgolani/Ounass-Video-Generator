import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css'; // self-hosted @font-face declarations (Portrait, Noto Serif Display, Noto Kufi Arabic)
import './styles/tokens.css';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
