import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTencentHeaders, getOcrQuotaState, recognizeImage, testOcrConfig } from './tencent-ocr-service';
import type { ProcessorConfig } from '@clipboard-processor/core';

const storage: Record<string, unknown> = {};

beforeEach(() => {
  Object.keys(storage).forEach(key => delete storage[key]);
  vi.restoreAllMocks();
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: storage[key] })),
        set: vi.fn(async (value: Record<string, unknown>) => Object.assign(storage, value))
      }
    }
  });
});

describe('Tencent OCR service', () => {
  it('creates stable TC3 authorization headers', async () => {
    const headers = await createTencentHeaders(
      '{"ImageBase64":"abc"}',
      'GeneralBasicOCR',
      1551113065,
      { secretId: 'id', secretKey: 'key', region: 'ap-guangzhou' }
    );

    expect(headers.Authorization).toContain('TC3-HMAC-SHA256 Credential=id/2019-02-25/ocr/tc3_request');
    expect(headers['X-TC-Action']).toBe('GeneralBasicOCR');
    expect(headers['X-TC-Region']).toBe('ap-guangzhou');
  });

  it('calls basic OCR and joins detected lines', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      Response: {
        TextDetections: [
          { DetectedText: 'first', Confidence: 99 },
          { DetectedText: 'second', Polygon: [{ X: 1, Y: 2 }] }
        ],
        RequestId: 'request-id'
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await recognizeImage('data:image/png;base64,YWJj', ocrConfig());

    expect(result.text).toBe('first\nsecond');
    expect(result.lines[1].polygon).toEqual([{ x: 1, y: 2 }]);
    expect(fetchMock.mock.calls[0][1].headers['X-TC-Action']).toBe('GeneralBasicOCR');
    expect(Object.values(storage.tencentOcrQuota as Record<string, number>)).toContain(1);
  });

  it('tests credentials with a decodable image containing text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      Response: { TextDetections: [{ DetectedText: 'OCR TEST 123' }], RequestId: 'test-request' }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(testOcrConfig(ocrConfig())).resolves.toEqual({ valid: true, model: 'general-basic' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.ImageBase64.length).toBeGreaterThan(1000);
  });

  it('requires an explicit accurate OCR monthly limit', async () => {
    const config = ocrConfig();
    config.model = 'general-accurate';
    config.tencent!.accurateMonthlyLimit = 0;

    await expect(recognizeImage('data:image/png;base64,YWJj', config)).rejects.toThrow('monthly call limit');
  });

  it('uses the accurate OCR action when selected', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      Response: { TextDetections: [], RequestId: 'accurate-request' }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const config = ocrConfig();
    config.model = 'general-accurate';
    config.tencent!.accurateMonthlyLimit = 10;

    await recognizeImage('data:image/jpeg;base64,YWJj', config);

    expect(fetchMock.mock.calls[0][1].headers['X-TC-Action']).toBe('GeneralAccurateOCR');
  });

  it.each([
    ['general-fast', 'GeneralFastOCR'],
    ['english', 'EnglishOCR']
  ] as const)('maps %s to %s', async (model, action) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      Response: { TextDetections: [], RequestId: `${model}-request` }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const config = ocrConfig();
    config.model = model;

    await recognizeImage('data:image/png;base64,YWJj', config);

    expect(fetchMock.mock.calls[0][1].headers['X-TC-Action']).toBe(action);
  });

  it('stops basic OCR at the 95 percent protection threshold', async () => {
    storage.tencentOcrQuota = { '2026-06:general-basic': 950 };
    const quota = await getOcrQuotaState(ocrConfig(), 'general-basic', new Date('2026-06-12T00:00:00Z'));

    expect(quota.stopped).toBe(true);
    expect(quota.stopAt).toBe(950);
  });
});

function ocrConfig(): ProcessorConfig['ocr'] {
  return {
    engine: 'tencent',
    model: 'general-basic',
    tencent: {
      secretId: 'id',
      secretKey: 'key',
      region: '',
      basicQuotaBaseline: 0,
      fastQuotaBaseline: 0,
      accurateMonthlyLimit: 0,
      accurateQuotaBaseline: 0,
      englishQuotaBaseline: 0
    }
  };
}
