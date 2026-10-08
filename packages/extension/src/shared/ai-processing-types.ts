export const AI_PROFILES_STORAGE_KEY = 'aiApiProfiles';
export const AI_RULES_STORAGE_KEY = 'aiProcessingRules';

export type AiApiProtocol = 'openai-compatible' | 'anthropic-compatible';
export type AnthropicAuthMode = 'x-api-key' | 'bearer';

export interface AiApiProfile {
  id: string;
  name: string;
  protocol: AiApiProtocol;
  baseUrl: string;
  apiKey: string;
  model: string;
  anthropicAuthMode: AnthropicAuthMode;
  maxInputChars: number;
  maxOutputTokens: number;
  timeoutMs: number;
  createdAt: number;
  updatedAt: number;
}

export interface AiProcessingRule {
  id: string;
  name: string;
  instruction: string;
  profileId: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export function createAiProfile(): AiApiProfile {
  const now = Date.now();
  return {
    id: `ai-profile-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: '新 API 配置',
    protocol: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: '',
    anthropicAuthMode: 'x-api-key',
    maxInputChars: 20000,
    maxOutputTokens: 4096,
    timeoutMs: 60000,
    createdAt: now,
    updatedAt: now
  };
}

export function createAiRule(profileId = ''): AiProcessingRule {
  const now = Date.now();
  return {
    id: `ai-rule-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: '新 AI 处理要求',
    instruction: '',
    profileId,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };
}

export function normalizeAiProfiles(values: unknown): AiApiProfile[] {
  if (!Array.isArray(values)) return [];
  return values.filter(value => value && typeof value === 'object').map(value => {
    const item = value as Partial<AiApiProfile>;
    const fallback = createAiProfile();
    return {
      ...fallback,
      ...item,
      protocol: item.protocol === 'anthropic-compatible' ? 'anthropic-compatible' : 'openai-compatible',
      anthropicAuthMode: item.anthropicAuthMode === 'bearer' ? 'bearer' : 'x-api-key',
      maxInputChars: clamp(item.maxInputChars, 1, 1_000_000, 20000),
      maxOutputTokens: clamp(item.maxOutputTokens, 1, 100_000, 4096),
      timeoutMs: clamp(item.timeoutMs, 1000, 300_000, 60000)
    };
  });
}

export function normalizeAiRules(values: unknown): AiProcessingRule[] {
  if (!Array.isArray(values)) return [];
  return values.filter(value => value && typeof value === 'object').map(value => {
    const item = value as Partial<AiProcessingRule>;
    const fallback = createAiRule();
    return { ...fallback, ...item, isActive: item.isActive ?? true };
  });
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}
