import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAiProfile, createAiRule } from '../shared/ai-processing-types';
import { processTextWithAi } from './ai-processing-service';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ai processing service', () => {
  it('calls an OpenAI-compatible endpoint and parses strict JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { content: '{"result":"processed"}' } }]
    }));
    vi.stubGlobal('fetch', fetchMock);
    const profile = { ...createAiProfile(), baseUrl: 'https://api.deepseek.com', apiKey: 'key', model: 'deepseek-chat' };

    await expect(processTextWithAi('input', aiRule(profile.id), profile)).resolves.toBe('processed');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.deepseek.com/v1/chat/completions');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer key');
  });

  it('calls an Anthropic-compatible endpoint with x-api-key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      content: [{ type: 'text', text: '{"result":"processed"}' }]
    }));
    vi.stubGlobal('fetch', fetchMock);
    const profile = {
      ...createAiProfile(),
      protocol: 'anthropic-compatible' as const,
      baseUrl: 'https://api.deepseek.com/anthropic',
      apiKey: 'key',
      model: 'deepseek-chat'
    };

    await expect(processTextWithAi('input', aiRule(profile.id), profile)).resolves.toBe('processed');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.deepseek.com/anthropic/v1/messages');
    expect(fetchMock.mock.calls[0][1].headers['x-api-key']).toBe('key');
  });

  it('rejects invalid output after three attempts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { content: 'processed' } }]
    })));
    const profile = { ...createAiProfile(), apiKey: 'key', model: 'model' };

    await expect(processTextWithAi('input', aiRule(profile.id), profile)).rejects.toThrow('已尝试 3 次');
    expect(fetch).toHaveBeenCalledTimes(3);
  }, 5000);

  it('does not retry local validation errors', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const profile = { ...createAiProfile(), apiKey: '', model: 'model' };

    await expect(processTextWithAi('input', aiRule(profile.id), profile)).rejects.toThrow('API Key');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not retry authentication errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('invalid key', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    const profile = { ...createAiProfile(), apiKey: 'bad-key', model: 'model' };

    await expect(processTextWithAi('input', aiRule(profile.id), profile)).rejects.toThrow('HTTP 401');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function aiRule(profileId: string) {
  return { ...createAiRule(profileId), instruction: 'Process the text.' };
}
