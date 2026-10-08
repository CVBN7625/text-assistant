import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAiProfile, createAiRule, processTextWithAi } from './ai-processing-service';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('web ai processing service', () => {
  it('supports OpenAI-compatible responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      choices: [{ message: { content: '{"result":"done"}' } }]
    }));
    vi.stubGlobal('fetch', fetchMock);
    const profile = { ...createAiProfile(), baseUrl: 'https://api.deepseek.com', apiKey: 'key', model: 'deepseek-chat' };

    await expect(processTextWithAi('input', rule(profile.id), profile)).resolves.toBe('done');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.deepseek.com/v1/chat/completions');
  });

  it('supports Anthropic-compatible responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      content: [{ type: 'text', text: '{"result":"done"}' }]
    }));
    vi.stubGlobal('fetch', fetchMock);
    const profile = { ...createAiProfile(), protocol: 'anthropic-compatible' as const, baseUrl: 'https://api.deepseek.com/anthropic', apiKey: 'key', model: 'deepseek-chat' };

    await expect(processTextWithAi('input', rule(profile.id), profile)).resolves.toBe('done');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.deepseek.com/anthropic/v1/messages');
  });

  it('retries invalid model output three times', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      choices: [{ message: { content: 'done' } }]
    }));
    vi.stubGlobal('fetch', fetchMock);
    const profile = { ...createAiProfile(), apiKey: 'key', model: 'model' };

    await expect(processTextWithAi('input', rule(profile.id), profile)).rejects.toThrow('已尝试 3 次');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  }, 5000);
});

function rule(profileId: string) {
  return { ...createAiRule(profileId), instruction: 'Process the text.' };
}

function response(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
