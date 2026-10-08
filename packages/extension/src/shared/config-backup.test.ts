import { describe, expect, it } from 'vitest';
import type { ProcessorConfig } from '@clipboard-processor/core';
import { defaultConfig } from '@clipboard-processor/core';
import {
  createConfigBackup,
  getConfigBackupFilename,
  isSensitiveConfigKey,
  parseConfigBackup
} from './config-backup';

describe('extension config backup', () => {
  it('removes every sensitive field from a safe backup', () => {
    const backup = createConfigBackup(configWithCredentials(), false);
    expect(collectSensitivePaths(backup)).toEqual([]);
    expect(backup.translation.apiKeys.baidu?.secretKey).toBeUndefined();
    expect(backup.ocr.tencent?.secretId).toBeUndefined();
    expect(backup.translation.defaultTargetLang).toBe('zh');
  });

  it('keeps credentials in an explicitly sensitive backup', () => {
    const backup = createConfigBackup(configWithCredentials(), true);
    expect(backup.translation.apiKeys.baidu?.appId).toBe('baidu-id');
    expect(backup.ocr.tencent?.secretId).toBe('tencent-id');
  });

  it('preserves current credentials when importing a safe backup', () => {
    const current = configWithCredentials();
    const safeBackup = createConfigBackup({
      ...current,
      translation: { ...current.translation, defaultTargetLang: 'en' }
    }, false);
    const imported = parseConfigBackup(JSON.stringify(safeBackup), current);
    expect(imported.translation?.defaultTargetLang).toBe('en');
    expect(imported.translation?.apiKeys.baidu?.secretKey).toBe('baidu-secret');
    expect(imported.ocr?.tencent?.secretKey).toBe('tencent-secret');
  });

  it('replaces credentials when importing a sensitive backup', () => {
    const current = configWithCredentials();
    const backup = createConfigBackup(current, true);
    backup.translation.apiKeys.baidu!.secretKey = 'replacement';
    const imported = parseConfigBackup(JSON.stringify(backup), current);
    expect(imported.translation?.apiKeys.baidu?.secretKey).toBe('replacement');
  });

  it('preserves credentials when a partial backup omits their containers', () => {
    const imported = parseConfigBackup('{"ui":{"theme":"dark"}}', configWithCredentials());
    expect(imported.translation?.apiKeys.baidu?.secretKey).toBe('baidu-secret');
    expect(imported.ocr?.tencent?.secretId).toBe('tencent-id');
  });

  it('uses a visibly sensitive filename only for credential exports', () => {
    expect(getConfigBackupFilename(false)).toBe('clipboard-processor-config.json');
    expect(getConfigBackupFilename(true)).toBe('clipboard-processor-config-sensitive.json');
  });

  it.each(['not-json', '[]', '{}', '{"quickActions":{}}', '{"translation":[]}'])(
    'rejects invalid backup input: %s',
    value => expect(() => parseConfigBackup(value, configWithCredentials())).toThrow()
  );

  it('treats newly introduced credential-like keys as sensitive', () => {
    expect(isSensitiveConfigKey('accessToken')).toBe(true);
    expect(isSensitiveConfigKey('providerCredential')).toBe(true);
    expect(isSensitiveConfigKey('displayName')).toBe(false);
  });
});

function configWithCredentials(): ProcessorConfig {
  return {
    ...defaultConfig,
    translation: {
      ...defaultConfig.translation,
      apiKeys: {
        baidu: {
          appId: 'baidu-id',
          secretKey: 'baidu-secret',
          largeModelApiKey: 'large-model-secret',
          imageCuid: 'image-cuid',
          imageMac: 'image-mac'
        },
        google: { apiKey: 'google-secret' },
        deepl: { apiKey: 'deepl-secret' }
      }
    },
    ocr: {
      ...defaultConfig.ocr,
      tencent: {
        ...defaultConfig.ocr.tencent!,
        secretId: 'tencent-id',
        secretKey: 'tencent-secret'
      }
    }
  };
}

function collectSensitivePaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectSensitivePaths(item, `${prefix}[${index}]`));
  }
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return isSensitiveConfigKey(key) ? [path] : collectSensitivePaths(child, path);
  });
}
