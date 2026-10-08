import type { OcrModel, ProcessorConfig } from '@clipboard-processor/core';

export interface OcrLine {
  text: string;
  confidence?: number;
  polygon?: Array<{ x: number; y: number }>;
}

export interface OcrResult {
  text: string;
  lines: OcrLine[];
  model: OcrModel;
  requestId?: string;
  duration: number;
}

export interface OcrQuotaState {
  model: OcrModel;
  month: string;
  localUsed: number;
  baseline: number;
  limit: number;
  stopAt: number;
  remainingBeforeStop: number;
  stopped: boolean;
}

type TencentConfig = NonNullable<ProcessorConfig['ocr']['tencent']>;

interface TencentOcrResponse {
  Response?: {
    TextDetections?: Array<{
      DetectedText?: string;
      Confidence?: number;
      Polygon?: Array<{ X?: number; Y?: number }>;
    }>;
    RequestId?: string;
    Error?: { Code?: string; Message?: string };
  };
}

const ENDPOINT = 'https://ocr.tencentcloudapi.com';
const HOST = 'ocr.tencentcloudapi.com';
const SERVICE = 'ocr';
const VERSION = '2018-11-19';
const BASIC_LIMIT = 1000;
const STOP_RATIO = 0.95;
const REQUEST_TIMEOUT_MS = 30000;
const MAX_BASE64_BYTES = 7 * 1024 * 1024;
const QUOTA_STORAGE_KEY = 'tencentOcrQuota';
const TEST_IMAGE_DATA_URL = 'data:image/png;base64,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';

export async function recognizeImage(
  dataUrl: string,
  config: ProcessorConfig['ocr'],
  now = new Date()
): Promise<OcrResult> {
  const tencent = validateConfig(config);
  const model = config.model;
  const quota = await getOcrQuotaState(config, model, now);
  if (quota.stopped || quota.localUsed + quota.baseline + 1 > quota.stopAt) {
    throw new Error(`OCR monthly usage protection reached: ${quota.localUsed + quota.baseline}/${quota.limit}`);
  }

  const imageBase64 = extractImageBase64(dataUrl);
  const body = JSON.stringify({ ImageBase64: imageBase64 });
  const action = getAction(model);
  const timestamp = Math.floor(now.getTime() / 1000);
  const headers = await createTencentHeaders(body, action, timestamp, tencent);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const start = Date.now();

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal
    });
    const payload = await response.json() as TencentOcrResponse;
    if (!response.ok || payload.Response?.Error) {
      const error = payload.Response?.Error;
      throw new Error(formatTencentError(error?.Code, error?.Message, response.status));
    }

    await incrementQuota(model, now);
    const lines = (payload.Response?.TextDetections || []).map(item => ({
      text: item.DetectedText || '',
      confidence: item.Confidence,
      polygon: item.Polygon?.map(point => ({ x: point.X || 0, y: point.Y || 0 }))
    })).filter(line => line.text);

    return {
      text: lines.map(line => line.text).join('\n'),
      lines,
      model,
      requestId: payload.Response?.RequestId,
      duration: Date.now() - start
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Tencent OCR request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function testOcrConfig(config: ProcessorConfig['ocr']): Promise<{ valid: true; model: OcrModel }> {
  await recognizeImage(TEST_IMAGE_DATA_URL, config);
  return { valid: true, model: config.model };
}

export async function getOcrQuotaState(
  config: ProcessorConfig['ocr'],
  model = config.model,
  now = new Date()
): Promise<OcrQuotaState> {
  const tencent = config.tencent;
  const baseline = getQuotaBaseline(tencent, model);
  const limit = model === 'general-accurate' ? Number(tencent?.accurateMonthlyLimit || 0) : BASIC_LIMIT;
  const stopAt = model === 'general-accurate' ? limit : Math.floor(limit * STOP_RATIO);
  const quota = await loadQuota();
  const month = getMonth(now);
  const localUsed = quota[`${month}:${model}`] || 0;
  return {
    model,
    month,
    localUsed,
    baseline,
    limit,
    stopAt,
    remainingBeforeStop: Math.max(0, stopAt - baseline - localUsed),
    stopped: limit <= 0 || baseline + localUsed >= stopAt
  };
}

export async function resetOcrQuota(model: OcrModel, now = new Date()): Promise<void> {
  const quota = await loadQuota();
  delete quota[`${getMonth(now)}:${model}`];
  await chrome.storage.local.set({ [QUOTA_STORAGE_KEY]: quota });
}

export async function createTencentHeaders(
  body: string,
  action: string,
  timestamp: number,
  config: Pick<TencentConfig, 'secretId' | 'secretKey' | 'region'>
): Promise<Record<string, string>> {
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${HOST}\n`;
  const signedHeaders = 'content-type;host';
  const hashedPayload = await sha256Hex(body);
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`;
  const credentialScope = `${date}/${SERVICE}/tc3_request`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;
  const secretDate = await hmacSha256(new TextEncoder().encode(`TC3${config.secretKey}`), date);
  const secretService = await hmacSha256(secretDate, SERVICE);
  const secretSigning = await hmacSha256(secretService, 'tc3_request');
  const signature = bytesToHex(await hmacSha256(secretSigning, stringToSign));

  return {
    Authorization: `TC3-HMAC-SHA256 Credential=${config.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'Content-Type': 'application/json; charset=utf-8',
    Host: HOST,
    'X-TC-Action': action,
    'X-TC-Timestamp': String(timestamp),
    'X-TC-Version': VERSION,
    ...(config.region ? { 'X-TC-Region': config.region } : {})
  };
}

function validateConfig(config: ProcessorConfig['ocr']): TencentConfig {
  const tencent = config.tencent;
  if (!tencent?.secretId.trim() || !tencent.secretKey.trim()) {
    throw new Error('Configure Tencent Cloud OCR SecretId and SecretKey first');
  }
  if (config.model === 'general-accurate' && Number(tencent.accurateMonthlyLimit || 0) <= 0) {
    throw new Error('Set a monthly call limit before using accurate OCR');
  }
  return tencent;
}

function extractImageBase64(dataUrl: string): string {
  const match = /^data:image\/(png|jpe?g|bmp);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) throw new Error('OCR supports PNG, JPEG, and BMP Data URLs');
  const base64 = match[2].replace(/\s/g, '');
  const bytes = Math.floor(base64.length * 3 / 4);
  if (bytes > MAX_BASE64_BYTES) throw new Error('Image exceeds Tencent OCR Base64 size limit');
  return base64;
}

function getAction(model: OcrModel): string {
  const actions: Record<OcrModel, string> = {
    'general-basic': 'GeneralBasicOCR',
    'general-fast': 'GeneralFastOCR',
    'general-accurate': 'GeneralAccurateOCR',
    english: 'EnglishOCR'
  };
  return actions[model];
}

function getQuotaBaseline(tencent: ProcessorConfig['ocr']['tencent'], model: OcrModel): number {
  if (model === 'general-fast') return Number(tencent?.fastQuotaBaseline || 0);
  if (model === 'general-accurate') return Number(tencent?.accurateQuotaBaseline || 0);
  if (model === 'english') return Number(tencent?.englishQuotaBaseline || 0);
  return Number(tencent?.basicQuotaBaseline || 0);
}

async function incrementQuota(model: OcrModel, now: Date): Promise<void> {
  const quota = await loadQuota();
  const key = `${getMonth(now)}:${model}`;
  quota[key] = (quota[key] || 0) + 1;
  await chrome.storage.local.set({ [QUOTA_STORAGE_KEY]: quota });
}

async function loadQuota(): Promise<Record<string, number>> {
  const stored = await chrome.storage.local.get(QUOTA_STORAGE_KEY);
  return stored[QUOTA_STORAGE_KEY] || {};
}

function getMonth(now: Date): string {
  return now.toISOString().slice(0, 7);
}

function formatTencentError(code?: string, message?: string, status?: number): string {
  const known: Record<string, string> = {
    'AuthFailure.SignatureFailure': 'Tencent OCR signature verification failed',
    'AuthFailure.SecretIdNotFound': 'Tencent OCR SecretId was not found',
    'FailedOperation.ImageDecodeFailed': 'Tencent OCR could not decode the image',
    'FailedOperation.NoText': 'No text was detected',
    'RequestLimitExceeded': 'Tencent OCR request limit exceeded'
  };
  return `${known[code || ''] || message || `Tencent OCR HTTP ${status || 0}`}${code ? ` (${code})` : ''}`;
}

async function sha256Hex(value: string): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
}

async function hmacSha256(key: Uint8Array, value: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', Uint8Array.from(key).buffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value)));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
