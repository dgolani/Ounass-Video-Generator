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
      {template.meta.supportsThemes ? (
        <ThemedDualPreview template={template} hovered={hovered} />
      ) : (
        <TemplatePreview template={template} playing={hovered} />
      )}

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

/** Split preview for templates that opt into supportsThemes — renders
 *  the scene TWICE, once in light mode (left half) and once in dark
 *  mode (right half), with a thin copper divider between. Both halves
 *  share the same hover-play behaviour so the two modes animate
 *  together when the card is hovered. */
function ThemedDualPreview({
  template,
  hovered,
}: {
  template: TemplateEntry;
  hovered: boolean;
}) {
  const aspect = template.meta.aspects[0];
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${aspect.width} / ${aspect.height}`,
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
      }}
    >
      {/* Left half — light mode. clip-path shows only the left 50%. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: 'inset(0 50% 0 0)',
        }}
      >
        <TemplatePreview template={template} playing={hovered} mode="light" />
      </div>
      {/* Right half — dark mode. clip-path shows only the right 50%. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: 'inset(0 0 0 50%)',
        }}
      >
        <TemplatePreview template={template} playing={hovered} mode="dark" />
      </div>
      {/* Hairline divider between the two halves. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '50%',
          width: 1,
          background: 'rgba(196,147,115,0.55)',
          pointerEvents: 'none',
        }}
      />
      {/* Tiny labels so the split isn't ambiguous. */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          fontFamily: 'var(--sans)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'rgba(18,18,18,0.55)',
          textTransform: 'uppercase',
          background: 'rgba(245,240,232,0.7)',
          padding: '2px 6px',
          borderRadius: 3,
          pointerEvents: 'none',
        }}
      >
        Light
      </div>
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          fontFamily: 'var(--sans)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'rgba(237,229,214,0.7)',
          textTransform: 'uppercase',
          background: 'rgba(15,14,12,0.7)',
          padding: '2px 6px',
          borderRadius: 3,
          pointerEvents: 'none',
        }}
      >
        Dark
      </div>
    </div>
  );
}
