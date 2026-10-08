import type { UiSkin } from '@clipboard-processor/core';
import type { GlobalThemeOverrides } from 'naive-ui';

export type UiThemePreference = 'light' | 'dark' | 'auto';
export type ResolvedUiTheme = 'light' | 'dark';

export const skinOptions = [
  { label: 'Classic', value: 'classic' },
  { label: 'Botanical Manuscript', value: 'sunflower' }
] as const;

export function normalizeSkin(value: unknown): UiSkin {
  return value === 'sunflower' ? 'sunflower' : 'classic';
}

export function normalizeTheme(value: unknown): UiThemePreference {
  return value === 'light' || value === 'dark' ? value : 'auto';
}

export function resolveTheme(
  skin: UiSkin,
  preference: UiThemePreference,
  systemPrefersDark: boolean
): ResolvedUiTheme {
  if (skin === 'sunflower') return 'light';
  if (preference === 'auto') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
}

export function watchSystemTheme(listener: (isDark: boolean) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = (event: MediaQueryListEvent) => listener(event.matches);
  query.addEventListener('change', handleChange);
  return () => query.removeEventListener('change', handleChange);
}

const lightOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#1d4ed8',
    primaryColorHover: '#2563eb',
    primaryColorPressed: '#1e40af',
    primaryColorSuppl: '#1d4ed8',
    infoColor: '#1d4ed8',
    successColor: '#16803c',
    warningColor: '#b7791f',
    errorColor: '#be123c',
    bodyColor: '#f4f7fb',
    cardColor: '#ffffff',
    modalColor: '#ffffff',
    popoverColor: '#ffffff',
    inputColor: '#ffffff',
    borderColor: '#cfd7e3',
    dividerColor: '#dde4ee',
    textColorBase: '#1f2933',
    textColor1: '#1f2933',
    textColor2: '#52606d',
    textColor3: '#7b8794'
  }
};

const darkOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#7aa2ff',
    primaryColorHover: '#9ab8ff',
    primaryColorPressed: '#5f88e8',
    primaryColorSuppl: '#7aa2ff',
    infoColor: '#7aa2ff',
    successColor: '#67c587',
    warningColor: '#e6b85c',
    errorColor: '#ff8fa3',
    bodyColor: '#111820',
    cardColor: '#18222d',
    modalColor: '#18222d',
    popoverColor: '#1c2834',
    inputColor: '#121c26',
    borderColor: '#3a4959',
    dividerColor: '#2e3d4c',
    textColorBase: '#edf3f8',
    textColor1: '#edf3f8',
    textColor2: '#bdc9d4',
    textColor3: '#8e9dac'
  }
};

const sunflowerOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily: '"LXGW WenKai Screen", "KaiTi", serif',
    primaryColor: '#c99928',
    primaryColorHover: '#956d16',
    primaryColorPressed: '#76520f',
    primaryColorSuppl: '#c99928',
    infoColor: '#667047',
    successColor: '#667047',
    warningColor: '#c99928',
    errorColor: '#a65e4d',
    bodyColor: '#f3efe4',
    cardColor: '#fbf8f0',
    modalColor: '#fffdf8',
    popoverColor: '#fffdf8',
    inputColor: '#fffdf8',
    borderColor: '#d8d0c0',
    dividerColor: '#d8d0c0',
    textColorBase: '#29251e',
    textColor1: '#29251e',
    textColor2: '#554f43',
    textColor3: '#777061'
  }
};

export function getThemeOverrides(skin: UiSkin, theme: ResolvedUiTheme): GlobalThemeOverrides {
  if (skin === 'sunflower') return sunflowerOverrides;
  return theme === 'dark' ? darkOverrides : lightOverrides;
}
