import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomeLanding.css';

const LANDING_EXIT_MS = 480;

function LandingIllustration() {
  return (
    <svg
      className="landing-ill-float"
      viewBox="0 0 220 176"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="landing-frame" x1="36" y1="24" x2="184" y2="152" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgba(255,255,255,0.14)" />
          <stop offset="1" stopColor="rgba(196,147,115,0.22)" />
        </linearGradient>
        <linearGradient id="landing-inner" x1="52" y1="40" x2="168" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgba(255,255,255,0.04)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.09)" />
        </linearGradient>
      </defs>
      <rect x="28" y="20" width="164" height="124" rx="18" stroke="url(#landing-frame)" strokeWidth="1.25" />
      <rect x="40" y="32" width="140" height="88" rx="10" fill="url(#landing-inner)" stroke="rgba(255,255,255,0.06)" />
      <rect x="52" y="48" width="116" height="4" rx="2" fill="rgba(255,255,255,0.07)" />
      <rect x="52" y="58" width="88" height="4" rx="2" fill="rgba(255,255,255,0.05)" />
      <rect x="52" y="68" width="104" height="4" rx="2" fill="rgba(255,255,255,0.05)" />
      <g opacity="0.9">
        <circle cx="110" cy="96" r="22" stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="rgba(255,255,255,0.03)" />
        <path
          d="M102 86 L102 106 L122 96 Z"
          fill="rgba(245,245,247,0.35)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.5"
        />
      </g>
      <g opacity="0.55">
        <rect x="44" y="132" width="28" height="3" rx="1.5" fill="rgba(196,147,115,0.45)" />
        <rect x="78" y="132" width="22" height="3" rx="1.5" fill="rgba(255,255,255,0.08)" />
        <rect x="106" y="132" width="36" height="3" rx="1.5" fill="rgba(255,255,255,0.08)" />
        <rect x="148" y="132" width="24" height="3" rx="1.5" fill="rgba(255,255,255,0.08)" />
      </g>
    </svg>
  );
}

export function Home() {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!exiting) return;
    const id = window.setTimeout(() => {
      navigate('/dashboard');
    }, LANDING_EXIT_MS);
    return () => window.clearTimeout(id);
  }, [exiting, navigate]);

  const handleStart = () => {
    if (exiting) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate('/dashboard');
      return;
    }
    setExiting(true);
  };

  return (
    <div className={`landing-root${exiting ? ' landing-root--exiting' : ''}`}>
      <div className="landing-ambient" aria-hidden />
      <div className="landing-content">
        <div className="landing-ill-wrap landing-fade-1">
          <LandingIllustration />
        </div>
        <p className="landing-kicker landing-fade-2">Ounass Cutroom</p>
        <h1 className="landing-title landing-fade-2b">Cut. Brand. Ship.</h1>
        <p className="landing-sub landing-fade-3">
          In-browser video ads for your team — template to timeline, brand-safe and ready to export.
        </p>
        <button
          type="button"
          className="landing-cta landing-fade-4"
          disabled={exiting}
          aria-busy={exiting}
          onClick={handleStart}
        >
          {"Let's Get Started"}
        </button>
      </div>
    </div>
  );
}
