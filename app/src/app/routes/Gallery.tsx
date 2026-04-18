import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/primitives';
import { PageHeader } from '../Shell';
import { listTemplates } from '../../templates/registry';
import { createProject } from '../../store/projects';
import { applyBrand, readBrand } from '../../store/brand';

export function Gallery() {
  const templates = listTemplates();
  const nav = useNavigate();

  const onPick = (id: string, name: string) => {
    const tpl = templates.find((t) => t.meta.id === id);
    if (!tpl) return;
    const brand = readBrand();
    const baseDefaults = structuredClone(tpl.meta.defaultProps) as Record<string, unknown>;
    const project = createProject({
      name: `Untitled — ${name}`,
      templateId: id,
      props: applyBrand(baseDefaults, brand),
      aspectIndex: 0,
      duration: tpl.meta.defaultDuration,
    });
    nav(`/editor/${project.id}`);
  };

  return (
    <div>
      <PageHeader kicker="Start from" title="Templates" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 24,
        }}
      >
        {templates.map((t) => {
          const aspect = t.meta.aspects[0];
          return (
            <div
              key={t.meta.id}
              style={{
                background: 'var(--editor-panel)',
                border: '1px solid var(--editor-border)',
                borderRadius: 'var(--r-lg)',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                transition: 'border-color 120ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--editor-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--editor-border)';
              }}
            >
              <div
                style={{
                  aspectRatio: `${aspect.width} / ${aspect.height}`,
                  background:
                    'linear-gradient(180deg, #141414 0%, #0A0A0A 100%)',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--editor-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 8,
                  padding: 20,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'var(--editor-accent)',
                  }}
                >
                  {aspect.label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 32,
                    fontWeight: 300,
                    color: '#F5F3EF',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  {t.meta.name.split('—')[0]?.trim()}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontStyle: 'italic',
                    fontSize: 16,
                    color: 'rgba(245,243,239,0.6)',
                  }}
                >
                  {t.meta.name.split('—')[1]?.trim()}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontWeight: 400,
                    fontSize: 20,
                    letterSpacing: '-0.01em',
                    marginBottom: 6,
                  }}
                >
                  {t.meta.name}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 13,
                    color: 'var(--editor-text-dim)',
                    lineHeight: 1.5,
                  }}
                >
                  {t.meta.description}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontFamily: 'var(--sans)',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--editor-text-dim)',
                }}
              >
                <span>{t.meta.defaultDuration}s</span>
                <span>{t.meta.aspects.map((a) => a.label).join(' · ')}</span>
              </div>

              <Button
                variant="primary"
                onClick={() => onPick(t.meta.id, t.meta.name.split('—')[0].trim())}
                style={{ justifyContent: 'center' }}
              >
                Use template
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
