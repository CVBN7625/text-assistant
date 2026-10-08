import type { ProcessorConfig } from '@clipboard-processor/core';

const SENSITIVE_KEY_PATTERN = /(api[-_]?key|secret(?:[-_]?(?:id|key))?|token|password|credential|app[-_]?id|client[-_]?id|cuid|mac)$/i;
const CONFIG_OBJECT_KEYS = ['processors', 'shortcuts', 'translation', 'ocr', 'ui'] as const;

export function isSensitiveConfigKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

export function createConfigBackup(config: ProcessorConfig, includeSensitiveCredentials: boolean): ProcessorConfig {
  const cloned = cloneJson(config);
  return includeSensitiveCredentials ? cloned : removeSensitiveValues(cloned) as ProcessorConfig;
}

export function getConfigBackupFilename(includeSensitiveCredentials: boolean): string {
  return includeSensitiveCredentials
    ? 'clipboard-processor-config-sensitive.json'
    : 'clipboard-processor-config.json';
}

export function parseConfigBackup(text: string, currentConfig: ProcessorConfig): Partial<ProcessorConfig> {
  const parsed: unknown = JSON.parse(text);
  if (!isConfigBackup(parsed)) {
    throw new Error('Invalid config backup');
  }
  return restoreMissingSensitiveValues(parsed, currentConfig) as Partial<ProcessorConfig>;
}

export function isConfigBackup(value: unknown): value is Partial<ProcessorConfig> {
  if (!isPlainObject(value)) {
    return false;
  }
  if (!('quickActions' in value) && !CONFIG_OBJECT_KEYS.some(key => key in value)) {
    return false;
  }
  if ('quickActions' in value && !Array.isArray(value.quickActions)) {
    return false;
  }
  return CONFIG_OBJECT_KEYS.every(key => !(key in value) || isPlainObject(value[key]));
}

function removeSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(removeSensitiveValues);
  }
  if (!isPlainObject(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !isSensitiveConfigKey(key))
      .map(([key, child]) => [key, removeSensitiveValues(child)])
  );
}

function restoreMissingSensitiveValues(imported: unknown, current: unknown): unknown {
  if (Array.isArray(imported)) {
    return imported.map((value, index) => restoreMissingSensitiveValues(
      value,
      Array.isArray(current) ? current[index] : undefined
    ));
  }
  if (!isPlainObject(imported)) {
    return imported;
  }

  const restored: Record<string, unknown> = { ...imported };
  const currentObject = isPlainObject(current) ? current : {};
  for (const [key, currentValue] of Object.entries(currentObject)) {
    if (isSensitiveConfigKey(key)) {
      if (!(key in restored)) {
        restored[key] = cloneJson(currentValue);
      }
    } else if (key in restored) {
      restored[key] = restoreMissingSensitiveValues(restored[key], currentValue);
    } else {
      const sensitiveValues = extractSensitiveValues(currentValue);
      if (sensitiveValues !== undefined) {
        restored[key] = sensitiveValues;
      }
    }
  }
  return restored;
}

function extractSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    const values = value.map(extractSensitiveValues);
    return values.some(item => item !== undefined) ? values : undefined;
  }
  if (!isPlainObject(value)) {
    return undefined;
  }

  const entries = Object.entries(value).flatMap(([key, child]) => {
    if (isSensitiveConfigKey(key)) {
      return [[key, cloneJson(child)] as const];
    }
    const nested = extractSensitiveValues(child);
    return nested === undefined ? [] : [[key, nested] as const];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
