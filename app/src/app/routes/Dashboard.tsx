import { useNavigate } from 'react-router-dom';
import { Button, Empty, Stack } from '../../ui/primitives';
import { PageHeader } from '../Shell';
import { deleteProject, useProjects } from '../../store/projects';
import { getTemplate } from '../../templates/registry';

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function Dashboard() {
  const projects = useProjects();
  const nav = useNavigate();

  return (
    <div>
      <PageHeader
        kicker="Your work"
        title="Ad projects"
        actions={
          <Button variant="primary" onClick={() => nav('/templates')}>
            + New ad
          </Button>
        }
      />

      {projects.length === 0 ? (
        <Empty
          title="No ads yet"
          body="Start from a template to create your first video ad."
          action={
            <Button variant="primary" onClick={() => nav('/templates')}>
              Browse templates
            </Button>
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {projects.map((p) => {
            const tpl = getTemplate(p.templateId);
            return (
              <div
                key={p.id}
                onClick={() => nav(`/editor/${p.id}`)}
                style={{
                  background: 'var(--editor-panel)',
                  border: '1px solid var(--editor-border)',
                  borderRadius: 'var(--r-lg)',
                  padding: 20,
                  cursor: 'pointer',
                  transition: 'border-color 120ms, transform 120ms',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
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
                    aspectRatio: '9 / 16',
                    background: 'var(--editor-bg)',
                    borderRadius: 'var(--r-md)',
                    border: '1px solid var(--editor-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--serif)',
                    fontSize: 20,
                    fontStyle: 'italic',
                    fontWeight: 300,
                    color: 'var(--editor-text-dim)',
                  }}
                >
                  {tpl?.meta.name.split('—')[0]?.trim() ?? 'Preview'}
                </div>
                <Stack gap={4}>
                  <div
                    style={{
                      fontFamily: 'var(--serif)',
                      fontWeight: 400,
                      fontSize: 18,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontFamily: 'var(--sans)',
                      fontSize: 11,
                      color: 'var(--editor-text-dim)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <span>{tpl?.meta.name ?? p.templateId}</span>
                    <span>{formatRelative(p.updatedAt)}</span>
                  </div>
                </Stack>
                <div
                  style={{ display: 'flex', gap: 8, marginTop: 'auto' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    onClick={() => nav(`/editor/${p.id}`)}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (confirm(`Delete "${p.name}"?`)) deleteProject(p.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
