// Template registry — add a template = import it here, register in the map.
// Editor & gallery read from this registry; they never import templates directly.

import type { ComponentType } from 'react';
import type { FieldDescriptor } from './fields';
import type { TemplateMeta, AspectRatio, SceneOutline } from './types';

import * as lookbook from './lookbook';
import * as editorial from './editorial';
import * as countdown from './countdown';
import * as hero from './hero';

export type SceneComponentProps = {
  props: any;
  timeScale?: number;
  width: number;
  height: number;
};

export type TemplateEntry = {
  meta: TemplateMeta<unknown>;
  fields: FieldDescriptor[];
  Scene: ComponentType<SceneComponentProps>;
};

export type { TemplateMeta, AspectRatio, SceneOutline };

const entries: Record<string, TemplateEntry> = {
  [lookbook.meta.id]: {
    meta: lookbook.meta as unknown as TemplateMeta<unknown>,
    fields: lookbook.fields,
    Scene: lookbook.LookbookScene as unknown as ComponentType<SceneComponentProps>,
  },
  [editorial.meta.id]: {
    meta: editorial.meta as unknown as TemplateMeta<unknown>,
    fields: editorial.fields,
    Scene: editorial.EditorialScene as unknown as ComponentType<SceneComponentProps>,
  },
  [countdown.meta.id]: {
    meta: countdown.meta as unknown as TemplateMeta<unknown>,
    fields: countdown.fields,
    Scene: countdown.CountdownScene as unknown as ComponentType<SceneComponentProps>,
  },
  [hero.meta.id]: {
    meta: hero.meta as unknown as TemplateMeta<unknown>,
    fields: hero.fields,
    Scene: hero.HeroScene as unknown as ComponentType<SceneComponentProps>,
  },
};

export function getTemplate(id: string): TemplateEntry | null {
  return entries[id] ?? null;
}

export function listTemplates(): TemplateEntry[] {
  return Object.values(entries);
}
