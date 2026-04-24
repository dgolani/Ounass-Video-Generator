import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/primitives';
import { PageHeader } from '../Shell';
import { listTemplates, type TemplateEntry } from '../../templates/registry';
import { createProject } from '../../store/projects';
import { applyBrand, readBrand } from '../../store/brand';
import { TemplatePreview } from '../components/TemplatePreview';
import type { TemplateCategory } from '../../templates/types';

/** Category chips shown at the top of the gallery. Order matches the
 *  rough frequency we expect marketers to need — Edit is the biggest
 *  bucket (7 templates) so it anchors the row; Moment/Lockup/Single
 *  follow. "All" is always first. Keeping the category set small (4
 *  buckets) keeps the chip row single-line on laptop widths. */
type ChipKey = 'all' | TemplateCategory;

const CHIPS: Array<{ key: ChipKey; label: string; hint: string }> = [
  { key: 'all',    label: 'All',          hint: 'Every template' },
  { key: 'edit',   label: 'Edit',         hint: 'Multi-product edits — carousels, lookbooks, rails' },
  { key: 'single', label: 'Single piece', hint: 'One hero product or designer feature' },
  { key: 'moment', label: 'Moment',       hint: 'Time-bound campaigns — countdown, seasonal' },
  { key: 'lockup', label: 'Lockup',       hint: 'Brand / product lockups — pairings, collabs, stacks' },
];

export function Gallery() {
  const templates = listTemplates();
  const nav = useNavigate();
  const [activeCategory, setActiveCategory] = useState<ChipKey>('all');

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

  // Per-chip counts — shown as a tiny trailing number on each pill so
  // marketers can see at a glance how many templates hide behind each
  // filter. Recomputed only when the template list changes (effectively
  // once per session since templates are static).
  const counts = useMemo(() => {
    const c: Record<ChipKey, number> = { all: templates.length, single: 0, edit: 0, moment: 0, lockup: 0 };
    for (const t of templates) c[t.meta.category] += 1;
    return c;
  }, [templates]);

  const visible = useMemo(() => {
    if (activeCategory === 'all') return templates;
    return templates.filter((t) => t.meta.category === activeCategory);
  }, [templates, activeCategory]);

  return (
    <div>
      <PageHeader kicker="Start from" title="Templates" />

      {/* Category filter row — sticky-feeling pill strip under the
       *  header. Clicking a chip narrows the grid; the active chip uses
       *  the copper accent so it reads as a selected tab. */}
      <div
        role="tablist"
        aria-label="Template categories"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 24,
        }}
      >
        {CHIPS.map((chip) => {
          const active = activeCategory === chip.key;
          const count = counts[chip.key];
          return (
            <button
              key={chip.key}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveCategory(chip.key)}
              title={chip.hint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                fontFamily: 'var(--sans)',
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: active ? '#1A1208' : 'var(--editor-text)',
                background: active ? 'var(--editor-accent)' : 'var(--editor-panel)',
                border: `1px solid ${active ? 'var(--editor-accent)' : 'var(--editor-border)'}`,
                borderRadius: 999,
                cursor: 'pointer',
                transition: 'background 140ms, color 140ms, border-color 140ms',
              }}
            >
              <span>{chip.label}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  opacity: 0.7,
                  letterSpacing: '0.06em',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            fontFamily: 'var(--sans)',
            fontSize: 14,
            color: 'var(--editor-text-dim)',
          }}
        >
          No templates in this category yet.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 24,
          }}
        >
          {visible.map((t) => (
            <TemplateCard
              key={t.meta.id}
              template={t}
              onPick={() => onPick(t.meta.id, t.meta.name.split('—')[0].trim())}
            />
          ))}
        </div>
      )}
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
