import { beforeEach, describe, expect, it } from 'vitest';
import { getOcrQuota, loadOcrConfig, resetOcrQuota, saveOcrConfig } from './tencent-ocr-service';

describe('web Tencent OCR service', () => {
  beforeEach(() => localStorage.clear());

  it('persists OCR configuration', () => {
    const config = loadOcrConfig();
    config.secretId = 'id';
    config.model = 'english';
    saveOcrConfig(config);

    expect(loadOcrConfig().secretId).toBe('id');
    expect(loadOcrConfig().model).toBe('english');
  });

  it('uses the 95 percent protection limit for basic OCR', () => {
    const quota = getOcrQuota(loadOcrConfig());
    expect(quota.limit).toBe(1000);
    expect(quota.stopAt).toBe(950);
    expect(quota.remaining).toBe(950);
  });

  it('requires an explicit accurate OCR limit', () => {
    const config = loadOcrConfig();
    config.model = 'general-accurate';
    expect(getOcrQuota(config).stopped).toBe(true);
  });

  it('resets model quota without changing configuration', () => {
    const config = loadOcrConfig();
    config.secretId = 'id';
    saveOcrConfig(config);
    resetOcrQuota('general-basic');
    expect(loadOcrConfig().secretId).toBe('id');
  });
});
