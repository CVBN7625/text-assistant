import { describe, expect, it } from 'vitest';
import { toPageMetadata } from './page-metadata';

describe('page metadata', () => {
  it('preserves pending screenshot page metadata', () => {
    expect(toPageMetadata({ pageTitle: 'Page title', pageUrl: 'https://example.com' })).toEqual({
      pageTitle: 'Page title',
      pageUrl: 'https://example.com'
    });
  });

  it('maps Chrome tab metadata', () => {
    expect(toPageMetadata({ title: 'Tab title', url: 'https://example.org' })).toEqual({
      pageTitle: 'Tab title',
      pageUrl: 'https://example.org'
    });
  });
});
