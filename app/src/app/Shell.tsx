import { NavLink, Outlet, useLocation } from 'react-router-dom';
import type { CSSProperties } from 'react';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/templates', label: 'Templates' },
  { to: '/brand', label: 'Brand kit' },
];

export function Shell() {
  const loc = useLocation();
  const isEditor = loc.pathname.startsWith('/editor/');

  // Editor gets its own full-bleed chrome — no sidebar
  if (isEditor) {
    return <Outlet />;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr',
        height: '100vh',
        background: 'var(--editor-bg)',
        color: 'var(--editor-text)',
      }}
    >
      <aside
        style={{
          background: 'var(--editor-panel)',
          borderRight: '1px solid var(--editor-border)',
          padding: '32px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--editor-accent)',
              marginBottom: 6,
            }}
          >
            Ounass
          </div>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 22,
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
            }}
          >
            Video Ad
            <br />
            Generator
          </div>
        </div>

        <nav
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => navLinkStyle(isActive)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', opacity: 0.5 }}>
          <div
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--editor-text-dim)',
            }}
          >
            Build 0.1
          </div>
        </div>
      </aside>

      <main
        style={{
          overflow: 'auto',
          padding: '48px 56px',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

function navLinkStyle(isActive: boolean): CSSProperties {
  return {
    padding: '10px 14px',
    borderRadius: 'var(--r-md)',
    fontFamily: 'var(--sans)',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.02em',
    textDecoration: 'none',
    color: isActive ? 'var(--editor-text)' : 'var(--editor-text-dim)',
    background: isActive ? 'var(--editor-panel-2)' : 'transparent',
    transition: 'background 120ms, color 120ms',
  };
}

// Page header used by Dashboard + Gallery
export function PageHeader({
  kicker,
  title,
  actions,
}: {
  kicker?: string;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 48,
        paddingBottom: 20,
        borderBottom: '1px solid var(--editor-border)',
      }}
    >
      <div>
        {kicker && (
          <div
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--editor-accent)',
              marginBottom: 10,
            }}
          >
            {kicker}
          </div>
        )}
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--serif)',
            fontSize: 44,
            fontWeight: 300,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {title}
        </h1>
      </div>
      {actions && <div style={{ display: 'flex', gap: 12 }}>{actions}</div>}
    </div>
  );
}
