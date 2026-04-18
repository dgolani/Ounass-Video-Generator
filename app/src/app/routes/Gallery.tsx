import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/primitives';
import { PageHeader } from '../Shell';
import { listTemplates, type TemplateEntry } from '../../templates/registry';
import { createProject } from '../../store/projects';
import { applyBrand, readBrand } from '../../store/brand';
import { TemplatePreview } from '../components/TemplatePreview';

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
        {templates.map((t) => (
          <TemplateCard
            key={t.meta.id}
            template={t}
            onPick={() => onPick(t.meta.id, t.meta.name.split('—')[0].trim())}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onPick,
}: {
  template: TemplateEntry;
  onPick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--editor-panel)',
        border: `1px solid ${hovered ? 'var(--editor-accent)' : 'var(--editor-border)'}`,
        borderRadius: 'var(--r-lg)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        transition: 'border-color 120ms',
      }}
    >
      <TemplatePreview template={template} playing={hovered} />

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
          {template.meta.name}
        </div>
        <div
          style={{
            fontFamily: 'var(--sans)',
            fontSize: 13,
            color: 'var(--editor-text-dim)',
            lineHeight: 1.5,
          }}
        >
          {template.meta.description}
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
        <span>{template.meta.defaultDuration}s</span>
        <span>{template.meta.aspects.map((a) => a.label).join(' · ')}</span>
      </div>

      <Button
        variant="primary"
        onClick={onPick}
        style={{ justifyContent: 'center' }}
      >
        Use template
      </Button>
    </div>
  );
}
