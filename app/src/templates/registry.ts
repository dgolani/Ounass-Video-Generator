// Template registry — add a template = import it here, register in the map.
// Editor & gallery read from this registry; they never import templates directly.

import type { ComponentType } from 'react';
import type { FieldDescriptor } from './fields';
import type { TemplateMeta, AspectRatio, SceneOutline } from './types';

import * as lookbook from './lookbook';
import * as editorial from './editorial';
import * as countdown from './countdown';
import * as hero from './hero';
import * as bestsellers from './bestsellers';
import * as seasonal from './seasonal';
import * as carousel from './carousel';
import * as giftGuide from './gift-guide';
import * as brandSpotlight from './brand-spotlight';
import * as theStack from './the-stack';
import * as thePairing from './the-pairing';
import * as newIn from './new-in';
import * as theCollab from './the-collab';
import * as theRail from './the-rail';
import * as theReel from './the-reel';
import * as theReelModular from './the-reel-modular';

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
  [bestsellers.meta.id]: {
    meta: bestsellers.meta as unknown as TemplateMeta<unknown>,
    fields: bestsellers.fields,
    Scene: bestsellers.BestsellersScene as unknown as ComponentType<SceneComponentProps>,
  },
  [seasonal.meta.id]: {
    meta: seasonal.meta as unknown as TemplateMeta<unknown>,
    fields: seasonal.fields,
    Scene: seasonal.SeasonalScene as unknown as ComponentType<SceneComponentProps>,
  },
  [carousel.meta.id]: {
    meta: carousel.meta as unknown as TemplateMeta<unknown>,
    fields: carousel.fields,
    Scene: carousel.CarouselScene as unknown as ComponentType<SceneComponentProps>,
  },
  [giftGuide.meta.id]: {
    meta: giftGuide.meta as unknown as TemplateMeta<unknown>,
    fields: giftGuide.fields,
    Scene: giftGuide.GiftGuideScene as unknown as ComponentType<SceneComponentProps>,
  },
  [brandSpotlight.meta.id]: {
    meta: brandSpotlight.meta as unknown as TemplateMeta<unknown>,
    fields: brandSpotlight.fields,
    Scene: brandSpotlight.BrandSpotlightScene as unknown as ComponentType<SceneComponentProps>,
  },
  [theStack.meta.id]: {
    meta: theStack.meta as unknown as TemplateMeta<unknown>,
    fields: theStack.fields,
    Scene: theStack.TheStackScene as unknown as ComponentType<SceneComponentProps>,
  },
  [thePairing.meta.id]: {
    meta: thePairing.meta as unknown as TemplateMeta<unknown>,
    fields: thePairing.fields,
    Scene: thePairing.ThePairingScene as unknown as ComponentType<SceneComponentProps>,
  },
  [newIn.meta.id]: {
    meta: newIn.meta as unknown as TemplateMeta<unknown>,
    fields: newIn.fields,
    Scene: newIn.NewInScene as unknown as ComponentType<SceneComponentProps>,
  },
  [theCollab.meta.id]: {
    meta: theCollab.meta as unknown as TemplateMeta<unknown>,
    fields: theCollab.fields,
    Scene: theCollab.TheCollabScene as unknown as ComponentType<SceneComponentProps>,
  },
  [theRail.meta.id]: {
    meta: theRail.meta as unknown as TemplateMeta<unknown>,
    fields: theRail.fields,
    Scene: theRail.TheRailScene as unknown as ComponentType<SceneComponentProps>,
  },
  [theReel.meta.id]: {
    meta: theReel.meta as unknown as TemplateMeta<unknown>,
    fields: theReel.fields,
    Scene: theReel.ReelScene as unknown as ComponentType<SceneComponentProps>,
  },
  [theReelModular.meta.id]: {
    meta: theReelModular.meta as unknown as TemplateMeta<unknown>,
    fields: theReelModular.fields,
    Scene: theReelModular.ReelModularScene as unknown as ComponentType<SceneComponentProps>,
  },
};

export function getTemplate(id: string): TemplateEntry | null {
  return entries[id] ?? null;
}

export function listTemplates(): TemplateEntry[] {
  return Object.values(entries);
}
