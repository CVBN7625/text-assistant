import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WEB_SKIN_CHANGE_EVENT,
  WEB_SKIN_STORAGE_KEY,
  getSkinThemeOverrides,
  getStoredSkin,
  normalizeSkin,
  setStoredSkin,
  skinOptions
} from './skins';

describe('web skins', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('falls back to classic for missing or invalid values', () => {
    expect(normalizeSkin(undefined)).toBe('classic');
    expect(normalizeSkin('unknown')).toBe('classic');
    expect(getStoredSkin()).toBe('classic');
  });

  it('persists sunflower and dispatches a change event', () => {
    const listener = vi.fn();
    window.addEventListener(WEB_SKIN_CHANGE_EVENT, listener);

    setStoredSkin('sunflower');

    expect(localStorage.getItem(WEB_SKIN_STORAGE_KEY)).toBe('sunflower');
    expect(getStoredSkin()).toBe('sunflower');
    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ skin: 'sunflower' });

    window.removeEventListener(WEB_SKIN_CHANGE_EVENT, listener);
  });

  it('keeps the sunflower id while exposing the Chinese display name', () => {
    expect(skinOptions.find(option => option.value === 'sunflower')).toEqual({
      label: '向日葵手稿',
      value: 'sunflower'
    });
  });

  it('returns distinct classic and sunflower overrides', () => {
    expect(getSkinThemeOverrides('classic').common?.bodyColor).toBe('#f7f6f2');
    expect(getSkinThemeOverrides('sunflower').common?.bodyColor).toBe('#f3efe4');
  });
});
