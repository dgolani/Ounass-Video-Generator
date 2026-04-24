// Theme mode — light | dark toggle for templates that opt into it via
// TemplateMeta.supportsThemes. Analogous to LocaleContext: set once at
// the scene boundary (editor / preview cards) and read inside scenes
// via useThemeMode().
//
// The payoff: a single `colors` schema shape can carry BOTH palettes:
//
//   colors: { light: Palette; dark: Palette }
//
// …and scenes call useThemedColors(props.colors) to resolve which one
// applies. Unthemed templates (the original 9) pass a plain Palette
// and the same helper returns it unchanged — no branches in scenes.

import { createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark';

/** Current theme mode. Default 'light'; editor overrides per-project. */
export const ThemeModeContext = createContext<ThemeMode>('light');

export function useThemeMode(): ThemeMode {
  return useContext(ThemeModeContext);
}

/** Resolve a `colors` prop that MAY be a themed pair into a flat palette.
 *
 *  Themed templates store `colors: { light, dark }` in their schema;
 *  unthemed templates store a plain palette. Scenes call this hook and
 *  get the right thing back either way — no `supportsThemes` branching
 *  required inside scene code.
 *
 *  Detection: a themed payload has both `light` and `dark` keys AND
 *  neither of those is a string (strings would indicate CSS colour
 *  names accidentally aliased as `light` / `dark`). */
export function useThemedColors<T>(colorsProp: T | { light: T; dark: T }): T {
  const mode = useThemeMode();
  if (
    colorsProp &&
    typeof colorsProp === 'object' &&
    'light' in (colorsProp as object) &&
    'dark' in (colorsProp as object) &&
    typeof (colorsProp as { light: unknown }).light !== 'string' &&
    typeof (colorsProp as { dark: unknown }).dark !== 'string'
  ) {
    const themed = colorsProp as { light: T; dark: T };
    return mode === 'dark' ? themed.dark : themed.light;
  }
  return colorsProp as T;
}
