import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Empty, Stack } from '../../ui/primitives';
import { PageHeader } from '../Shell';
import { deleteProject, useProjects } from '../../store/projects';
import { getTemplate } from '../../templates/registry';
import { TemplatePreview } from '../components/TemplatePreview';
import type { Project } from '../../store/types';

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
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const nav = useNavigate();
  const [hovered, setHovered] = useState(false);
  const tpl = getTemplate(project.templateId);

  return (
    <div
      onClick={() => nav(`/editor/${project.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--editor-panel)',
        border: `1px solid ${hovered ? 'var(--editor-accent)' : 'var(--editor-border)'}`,
        borderRadius: 'var(--r-lg)',
        padding: 20,
        cursor: 'pointer',
        transition: 'border-color 120ms',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {tpl ? (
        <TemplatePreview
          template={tpl}
          props={project.props}
          duration={project.duration}
          aspectIndex={project.aspectIndex}
          playing={hovered}
        />
      ) : (
        <div
          style={{
            aspectRatio: '9 / 16',
            background: 'var(--editor-bg)',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--editor-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--sans)',
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#D85258',
          }}
        >
          Template missing: {project.templateId}
        </div>
      )}

      <Stack gap={4}>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 18,
            letterSpacing: '-0.01em',
          }}
        >
          {project.name}
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
          <span>{tpl?.meta.name ?? project.templateId}</span>
          <span>{formatRelative(project.updatedAt)}</span>
        </div>
      </Stack>

      <div
        style={{ display: 'flex', gap: 8, marginTop: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="sm"
          onClick={() => nav(`/editor/${project.id}`)}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          Open
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => {
            if (confirm(`Delete "${project.name}"?`)) deleteProject(project.id);
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
