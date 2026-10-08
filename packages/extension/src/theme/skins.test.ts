import { describe, expect, it } from 'vitest';
import { normalizeSkin, normalizeTheme, resolveTheme } from './skins';

describe('extension appearance resolution', () => {
  it('normalizes unknown appearance values', () => {
    expect(normalizeSkin('sunflower')).toBe('sunflower');
    expect(normalizeSkin('unknown')).toBe('classic');
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeTheme('unknown')).toBe('auto');
  });

  it.each([
    ['classic', 'light', false, 'light'],
    ['classic', 'dark', false, 'dark'],
    ['classic', 'auto', false, 'light'],
    ['classic', 'auto', true, 'dark'],
    ['sunflower', 'light', false, 'light'],
    ['sunflower', 'dark', true, 'light'],
    ['sunflower', 'auto', true, 'light']
  ] as const)('resolves %s/%s/systemDark=%s to %s', (skin, preference, systemDark, expected) => {
    expect(resolveTheme(skin, preference, systemDark)).toBe(expected);
  });
});
