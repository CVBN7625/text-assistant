export type WebOcrModel = 'general-basic' | 'general-fast' | 'general-accurate' | 'english';

export interface WebOcrConfig {
  secretId: string;
  secretKey: string;
  region: string;
  model: WebOcrModel;
  basicQuotaBaseline: number;
  fastQuotaBaseline: number;
  accurateMonthlyLimit: number;
  accurateQuotaBaseline: number;
  englishQuotaBaseline: number;
}

export interface WebOcrResult {
  text: string;
  lines: Array<{ text: string; confidence?: number }>;
  requestId?: string;
  duration: number;
  model: WebOcrModel;
}

export interface WebOcrQuota {
  used: number;
  baseline: number;
  limit: number;
  stopAt: number;
  remaining: number;
  stopped: boolean;
}

export const OCR_CONFIG_KEY = 'clipboard-web-tencent-ocr-config-v1';
const OCR_QUOTA_KEY = 'clipboard-web-tencent-ocr-quota-v1';
const ENDPOINT = 'https://ocr.tencentcloudapi.com';
const HOST = 'ocr.tencentcloudapi.com';
const BASIC_LIMIT = 1000;
const MAX_IMAGE_SIZE = 7 * 1024 * 1024;

export const OCR_MODELS: Array<{ value: WebOcrModel; label: string; description: string }> = [
  { value: 'general-basic', label: '通用印刷体识别（基础版）', description: '默认推荐，适合网页截图、书籍和普通中英文图片。' },
  { value: 'general-fast', label: '通用印刷体识别（高速版）', description: '适合清晰、简单排版并优先追求速度的图片。' },
  { value: 'general-accurate', label: '通用文字识别（高精度版）', description: '适合小字、模糊、倾斜和复杂背景，需要设置月调用上限。' },
  { value: 'english', label: '英文识别', description: '针对纯英文印刷体优化，中英文混合图片建议使用基础版。' }
];

export function loadOcrConfig(): WebOcrConfig {
  const defaults: WebOcrConfig = {
    secretId: '', secretKey: '', region: '', model: 'general-basic',
    basicQuotaBaseline: 0, fastQuotaBaseline: 0, accurateMonthlyLimit: 0,
    accurateQuotaBaseline: 0, englishQuotaBaseline: 0
  };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(OCR_CONFIG_KEY) || '{}') };
  } catch {
    return defaults;
  }
}

export function saveOcrConfig(config: WebOcrConfig): void {
  localStorage.setItem(OCR_CONFIG_KEY, JSON.stringify(config));
}

export function getOcrQuota(config: WebOcrConfig): WebOcrQuota {
  const quota = loadQuota();
  const used = quota[quotaKey(config.model)] || 0;
  const baseline = getBaseline(config);
  const limit = config.model === 'general-accurate' ? config.accurateMonthlyLimit : BASIC_LIMIT;
  const stopAt = config.model === 'general-accurate' ? limit : Math.floor(limit * 0.95);
  return { used, baseline, limit, stopAt, remaining: Math.max(0, stopAt - baseline - used), stopped: limit <= 0 || baseline + used >= stopAt };
}

export function resetOcrQuota(model: WebOcrModel): void {
  const quota = loadQuota();
  delete quota[quotaKey(model)];
  localStorage.setItem(OCR_QUOTA_KEY, JSON.stringify(quota));
}

export async function recognizeFile(file: File, config: WebOcrConfig): Promise<WebOcrResult> {
  validate(file, config);
  const quota = getOcrQuota(config);
  if (quota.stopped || quota.used + quota.baseline + 1 > quota.stopAt) throw new Error('已达到当前模型的月调用保护上限');
  const start = Date.now();
  const body = JSON.stringify({ ImageBase64: await fileToBase64(file) });
  const timestamp = Math.floor(Date.now() / 1000);
  const headers = await createHeaders(body, actionFor(config.model), timestamp, config);
  let response: Response;
  try {
    response = await fetch(ENDPOINT, { method: 'POST', headers, body, signal: AbortSignal.timeout(30000) });
  } catch (error) {
    throw new Error(`无法连接腾讯云 OCR。网页版可能受到 CORS 或网络策略限制：${error instanceof Error ? error.message : error}`);
  }
  const payload = await response.json();
  const apiError = payload.Response?.Error;
  if (!response.ok || apiError) throw new Error(`${apiError?.Message || `HTTP ${response.status}`}${apiError?.Code ? ` (${apiError.Code})` : ''}`);
  recordUsage(config.model);
  const lines = (payload.Response?.TextDetections || []).map((item: any) => ({ text: item.DetectedText || '', confidence: item.Confidence })).filter((item: any) => item.text);
  return { text: lines.map((item: any) => item.text).join('\n'), lines, requestId: payload.Response?.RequestId, duration: Date.now() - start, model: config.model };
}

function validate(file: File, config: WebOcrConfig): void {
  if (!config.secretId.trim() || !config.secretKey.trim()) throw new Error('请先填写腾讯云 SecretId 和 SecretKey');
  if (config.model === 'general-accurate' && config.accurateMonthlyLimit <= 0) throw new Error('使用高精度版前必须设置月调用上限');
  if (!['image/png', 'image/jpeg', 'image/bmp'].includes(file.type)) throw new Error('仅支持 PNG、JPEG 和 BMP 图片');
  if (file.size > MAX_IMAGE_SIZE) throw new Error('图片大小不能超过 7 MB');
}

function actionFor(model: WebOcrModel): string {
  return { 'general-basic': 'GeneralBasicOCR', 'general-fast': 'GeneralFastOCR', 'general-accurate': 'GeneralAccurateOCR', english: 'EnglishOCR' }[model];
}

async function createHeaders(body: string, action: string, timestamp: number, config: WebOcrConfig): Promise<Record<string, string>> {
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${HOST}\n`;
  const signedHeaders = 'content-type;host';
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${await sha256(body)}`;
  const scope = `${date}/ocr/tc3_request`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${scope}\n${await sha256(canonicalRequest)}`;
  const dateKey = await hmac(new TextEncoder().encode(`TC3${config.secretKey}`), date);
  const serviceKey = await hmac(dateKey, 'ocr');
  const signingKey = await hmac(serviceKey, 'tc3_request');
  const signature = hex(await hmac(signingKey, stringToSign));
  return {
    Authorization: `TC3-HMAC-SHA256 Credential=${config.secretId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'Content-Type': 'application/json; charset=utf-8', Host: HOST,
    'X-TC-Action': action, 'X-TC-Timestamp': String(timestamp), 'X-TC-Version': '2018-11-19',
    ...(config.region.trim() ? { 'X-TC-Region': config.region.trim() } : {})
  };
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < buffer.length; i += 8192) binary += String.fromCharCode(...buffer.subarray(i, i + 8192));
  return btoa(binary);
}
async function sha256(value: string) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))); }
async function hmac(key: Uint8Array, value: string) {
  const imported = await crypto.subtle.importKey('raw', Uint8Array.from(key).buffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', imported, new TextEncoder().encode(value)));
}
function hex(bytes: Uint8Array) { return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join(''); }
function quotaKey(model: WebOcrModel) { return `${new Date().toISOString().slice(0, 7)}:${model}`; }
function loadQuota(): Record<string, number> { try { return JSON.parse(localStorage.getItem(OCR_QUOTA_KEY) || '{}'); } catch { return {}; } }
function recordUsage(model: WebOcrModel) { const quota = loadQuota(); const key = quotaKey(model); quota[key] = (quota[key] || 0) + 1; localStorage.setItem(OCR_QUOTA_KEY, JSON.stringify(quota)); }
function getBaseline(config: WebOcrConfig) {
  if (config.model === 'general-fast') return config.fastQuotaBaseline;
  if (config.model === 'general-accurate') return config.accurateQuotaBaseline;
  if (config.model === 'english') return config.englishQuotaBaseline;
  return config.basicQuotaBaseline;
}
