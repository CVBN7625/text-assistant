import type { ProcessorConfig } from '@clipboard-processor/core';

type TranslationApiType = 'general' | 'large-model' | 'domain' | 'image';

export type TranslationUnit = 'character' | 'request';

export interface TranslationQuotaState {
  apiType: TranslationApiType;
  month: string;
  used: number;
  localUsed: number;
  baseline: number;
  freeLimit: number;
  stopAt: number;
  remainingBeforeStop: number;
  unit: TranslationUnit;
  stopped: boolean;
}

export interface TextTranslationResult {
  text: string;
  from: string;
  to: string;
  duration: number;
  cached: boolean;
  apiType: TranslationApiType;
}

export interface ImageTranslationResult {
  from: string;
  to: string;
  sourceText: string;
  translatedText: string;
  imageUrl?: string;
  raw: unknown;
  duration: number;
}

interface ClassicTranslationResponse {
  from?: string;
  to?: string;
  trans_result?: Array<{ src?: string; dst?: string }>;
  error_code?: string | number;
  error_msg?: string;
}

interface ImageTranslationResponse {
  from?: string;
  to?: string;
  data?: {
    sumSrc?: string;
    sumDst?: string;
    pasteImg?: string;
    dst?: string;
    src?: string;
    content?: Array<{
      src?: string;
      dst?: string;
    }>;
  };
  trans_result?: Array<{
    src?: string;
    dst?: string;
  }>;
  result?: {
    src?: string;
    dst?: string;
    pasteImg?: string;
  };
  error_code?: string | number;
  error_msg?: string;
}

type BaiduConfig = NonNullable<ProcessorConfig['translation']['apiKeys']['baidu']>;

const TEXT_TRANSLATE_API_URL = 'https://fanyi-api.baidu.com/api/trans/vip/translate';
const FIELD_TRANSLATE_API_URL = 'https://fanyi-api.baidu.com/api/trans/vip/fieldtranslate';
const LARGE_MODEL_TRANSLATE_API_URL = 'https://fanyi-api.baidu.com/ait/api/aiTextTranslate';
const IMAGE_TRANSLATE_API_URL = 'https://fanyi-api.baidu.com/api/trans/sdk/picture';
const CACHE_STORAGE_KEY = 'translationCache';
const QUOTA_STORAGE_KEY = 'translationQuota';
const MAX_CACHE_ITEMS = 300;
const QUOTA_STOP_RATIO = 0.95;
const REQUEST_TIMEOUT_MS = 20000;

const API_LIMITS: Record<TranslationApiType, { freeLimit: number; unit: TranslationUnit }> = {
  general: { freeLimit: 1_000_000, unit: 'character' },
  'large-model': { freeLimit: 1_000_000, unit: 'character' },
  domain: { freeLimit: 500_000, unit: 'character' },
  image: { freeLimit: 1000, unit: 'request' }
};

const TEXT_ERROR_MESSAGES: Record<string, string> = {
  '52001': '请求超时，请重试',
  '52002': '系统错误，请稍后重试',
  '52003': '未授权用户，请检查 APP ID 或服务是否开通',
  '54000': '必填参数为空',
  '54001': '签名错误或 token 错误，请检查密钥',
  '54003': '访问频率受限，请稍后重试',
  '54004': '账户余额不足',
  '54005': '长 query 请求频繁，请缩短文本或稍后重试',
  '58000': '客户端 IP 非法，请检查百度翻译开放平台安全设置',
  '58001': '语言方向不支持，请调整源语言或目标语言',
  '58002': '服务当前已关闭，请前往控制台开启服务',
  '58004': '模型参数错误，请检查 model_type',
  '59002': '翻译指令过长，reference 最多 500 字符',
  '59003': '请求文本过长，q 最多 6000 字符',
  '59004': 'QPS 超限，请降低调用频率',
  '90107': '认证未通过或服务未开通，请检查百度翻译开放平台配置'
};

const IMAGE_ERROR_MESSAGES: Record<string, string> = {
  ...TEXT_ERROR_MESSAGES,
  '69001': '上传图片数据异常',
  '69002': '图片大小超限，请使用 4 MB 以下图片',
  '69003': '图片识别失败，请换一张更清晰的图片',
  '69004': '图片格式不支持'
};

let lastTextRequestTime = 0;

export function splitText(text: string, maxLength = 2000): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      parts.push(remaining);
      break;
    }

    let splitIndex = -1;
    const punctuation = ['。', '！', '？', '\n', '.', '!', '?', '；', ';', '，', ','];

    for (const mark of punctuation) {
      const index = remaining.lastIndexOf(mark, maxLength);
      if (index > 0) {
        splitIndex = index + 1;
        break;
      }
    }

    if (splitIndex === -1) {
      splitIndex = maxLength;
    }

    parts.push(remaining.substring(0, splitIndex));
    remaining = remaining.substring(splitIndex);
  }

  return parts;
}

export async function translateConfiguredText(
  text: string,
  from: string,
  to: string,
  translationConfig: ProcessorConfig['translation']
): Promise<TextTranslationResult> {
  const baiduConfig = translationConfig.apiKeys.baidu;
  if (translationConfig.defaultEngine !== 'baidu') {
    throw new Error('插件当前仅实现百度翻译，请在设置中选择百度翻译');
  }

  if (!baiduConfig) {
    throw new Error('请先在扩展设置中配置百度翻译 API');
  }

  const apiType = baiduConfig.apiType || 'general';
  if (apiType === 'image') {
    throw new Error('图片翻译请使用图片翻译入口，文本处理链不能直接调用图片翻译');
  }

  const chunks = splitText(text.trim());
  const results: TextTranslationResult[] = [];
  const totalStart = Date.now();

  for (const chunk of chunks) {
    results.push(await translateTextChunk(chunk, from, to, translationConfig, baiduConfig, apiType));
  }

  return {
    text: results.map(result => result.text).join('\n'),
    from: results[0]?.from || from,
    to: results[results.length - 1]?.to || to,
    duration: Date.now() - totalStart,
    cached: results.every(result => result.cached),
    apiType
  };
}

export async function translateImageFromDataUrl(
  dataUrl: string,
  from: string,
  to: string,
  translationConfig: ProcessorConfig['translation']
): Promise<ImageTranslationResult> {
  const baiduConfig = translationConfig.apiKeys.baidu;
  if (!baiduConfig?.appId || !baiduConfig.secretKey) {
    throw new Error('请先在扩展设置中配置百度翻译 APP ID 和 Secret Key');
  }

  if (to === 'auto') {
    throw new Error('图片翻译目标语言不能设置为检测语言');
  }

  const start = Date.now();
  const bytes = dataUrlToBytes(dataUrl);

  if (bytes.length > 4 * 1024 * 1024) {
    throw new Error('图片大小超过 4 MB，请压缩后再翻译');
  }

  await assertWithinQuota('image', baiduConfig.appId, 'image', getImageQuotaBaseline(translationConfig));

  const salt = createSalt();
  const cuid = baiduConfig.imageCuid || `clipboard-text-processor-${baiduConfig.appId}`;
  const mac = baiduConfig.imageMac || '00:00:00:00:00:00';
  const imageMd5 = await md5Bytes(bytes);
  const sign = await md5(`${baiduConfig.appId}${imageMd5}${salt}${cuid}${mac}${baiduConfig.secretKey}`);
  const formData = new FormData();

  formData.append('from', from);
  formData.append('to', to);
  formData.append('appid', baiduConfig.appId);
  formData.append('salt', salt);
  formData.append('cuid', cuid);
  formData.append('mac', mac);
  formData.append('sign', sign);
  formData.append('paste', '1');
  formData.append('image', new Blob([bytes.buffer as ArrayBuffer], { type: getDataUrlMimeType(dataUrl) }), 'image.png');

  const response = await fetchWithTimeout(baiduConfig.imageEndpoint || IMAGE_TRANSLATE_API_URL, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`图片翻译 HTTP 错误: ${response.status}`);
  }

  const data = await response.json() as ImageTranslationResponse;
  if (isErrorCode(data.error_code)) {
    const errorCode = String(data.error_code);
    throw new Error(IMAGE_ERROR_MESSAGES[errorCode] || data.error_msg || `图片翻译错误: ${errorCode}`);
  }

  const extracted = extractImageText(data);
  if (!extracted.translatedText && !extracted.imageUrl) {
    throw new Error('图片翻译结果为空，请检查图片内容或语言方向');
  }

  await recordQuotaUsage('image', baiduConfig.appId, 'image');

  return {
    from: data.from || from,
    to: data.to || to,
    sourceText: extracted.sourceText,
    translatedText: extracted.translatedText,
    imageUrl: extracted.imageUrl,
    raw: data,
    duration: Date.now() - start
  };
}

export async function getQuotaStateForConfig(
  apiType: TranslationApiType,
  translationConfig: ProcessorConfig['translation']
): Promise<TranslationQuotaState> {
  const baiduConfig = translationConfig.apiKeys.baidu;
  const credentialId = getCredentialId(baiduConfig, apiType);
  return getQuotaState(apiType, credentialId, getQuotaBaseline(translationConfig, apiType));
}

export async function resetQuotaForConfig(
  apiType: TranslationApiType,
  translationConfig: ProcessorConfig['translation']
): Promise<void> {
  const baiduConfig = translationConfig.apiKeys.baidu;
  const credentialId = getCredentialId(baiduConfig, apiType);
  const quota = await loadQuotaUsage();
  delete quota[getQuotaKey(apiType, credentialId)];
  await chrome.storage.local.set({ [QUOTA_STORAGE_KEY]: quota });
}

export async function clearTranslationCache(): Promise<void> {
  await chrome.storage.local.remove(CACHE_STORAGE_KEY);
}

async function translateTextChunk(
  text: string,
  from: string,
  to: string,
  translationConfig: ProcessorConfig['translation'],
  baiduConfig: BaiduConfig,
  apiType: Exclude<TranslationApiType, 'image'>
): Promise<TextTranslationResult> {
  const queryText = text.trim();
  const start = Date.now();
  const credentialId = getCredentialId(baiduConfig, apiType);
  const variant = getCacheVariant(baiduConfig, apiType);

  if (!queryText) {
    throw new Error('请输入要翻译的文本');
  }

  if (to === 'auto') {
    throw new Error('目标语言不能设置为检测语言');
  }

  if (translationConfig.cacheEnabled !== false) {
    const cached = await getCachedTranslation(queryText, from, to, credentialId, apiType, variant);
    if (cached) {
      return cached;
    }
  }

  await assertWithinQuota(apiType, credentialId, queryText, getQuotaBaseline(translationConfig, apiType));
  await waitForTextRateLimit(apiType);

  const data = apiType === 'large-model'
    ? await requestLargeModelTranslation(queryText, from, to, baiduConfig)
    : await requestClassicTranslation(queryText, from, to, baiduConfig, apiType);

  const result: TextTranslationResult = {
    text: getTextFromResponse(data, apiType),
    from: data.from || from,
    to: data.to || to,
    duration: Date.now() - start,
    cached: false,
    apiType
  };

  if (translationConfig.cacheEnabled !== false) {
    await saveCachedTranslation(queryText, from, to, credentialId, apiType, variant, result);
  }

  await recordQuotaUsage(apiType, credentialId, queryText);

  return result;
}

async function requestClassicTranslation(
  text: string,
  from: string,
  to: string,
  config: BaiduConfig,
  apiType: Exclude<TranslationApiType, 'large-model' | 'image'>
): Promise<ClassicTranslationResponse> {
  if (!config.appId || !config.secretKey) {
    throw new Error('请先在扩展设置中配置百度翻译 APP ID 和 Secret Key');
  }

  const salt = createSalt();
  const params = new URLSearchParams({
    q: text,
    from,
    to,
    appid: config.appId,
    salt
  });

  if (apiType === 'domain') {
    const domain = config.domain?.trim();
    if (!domain) {
      throw new Error('使用领域文本翻译 API 时，请先选择领域 domain');
    }
    params.set('domain', domain);
    params.set('sign', await md5(`${config.appId}${text}${salt}${domain}${config.secretKey}`));
  } else {
    params.set('sign', await md5(`${config.appId}${text}${salt}${config.secretKey}`));
  }

  const response = await fetchWithTimeout(apiType === 'domain' ? FIELD_TRANSLATE_API_URL : TEXT_TRANSLATE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!response.ok) {
    throw new Error(`百度翻译 HTTP 错误: ${response.status}`);
  }

  return response.json();
}

async function requestLargeModelTranslation(
  text: string,
  from: string,
  to: string,
  config: BaiduConfig
): Promise<ClassicTranslationResponse> {
  const endpoint = config.largeModelEndpoint?.trim() || LARGE_MODEL_TRANSLATE_API_URL;
  const authMode = config.largeModelAuthMode || 'api-key';
  const body: Record<string, unknown> = {
    appid: config.appId,
    q: text,
    from,
    to,
    model_type: config.largeModelModelType || config.largeModelModel || 'llm'
  };

  if (config.largeModelReference?.trim()) {
    body.reference = config.largeModelReference.trim();
  }

  if (config.largeModelNeedIntervene) {
    body.needIntervene = 1;
  }

  if (config.largeModelTagHandling) {
    body.tag_handling = 1;
  }

  const ignoreTags = parseIgnoreTags(config.largeModelIgnoreTags);
  if (ignoreTags.length > 0) {
    body.ignore_tags = ignoreTags;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (authMode === 'api-key') {
    if (!config.largeModelApiKey?.trim()) {
      throw new Error('使用大模型文本翻译 API 时，请填写 API Key 管理页面中的 API Key');
    }
    headers.Authorization = `Bearer ${config.largeModelApiKey.trim()}`;
  } else {
    if (!config.appId || !config.secretKey) {
      throw new Error('使用大模型 Sign 鉴权时，请填写 APP ID 和 Secret Key');
    }
    const salt = createSalt();
    body.salt = salt;
    body.sign = await md5(`${config.appId}${text}${salt}${config.secretKey}`);
  }

  if (!body.appid) {
    throw new Error('大模型文本翻译仍需传入 APP ID，请在设置中填写百度 APP ID');
  }

  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`大模型文本翻译 HTTP 错误: ${response.status}`);
  }

  return response.json();
}

function getTextFromResponse(data: ClassicTranslationResponse, apiType: TranslationApiType): string {
  if (isErrorCode(data.error_code)) {
    const errorCode = String(data.error_code);
    throw new Error(TEXT_ERROR_MESSAGES[errorCode] || data.error_msg || `${apiType} 翻译错误: ${errorCode}`);
  }

  const translated = data.trans_result?.map(item => item.dst).filter(Boolean).join('\n');
  if (!translated) {
    throw new Error('翻译结果为空');
  }

  return translated;
}

function getCredentialId(config: BaiduConfig | undefined, apiType: TranslationApiType): string {
  if (apiType === 'large-model') {
    return config?.largeModelApiKey || config?.appId || 'large-model';
  }

  return config?.appId || 'anonymous';
}

function getCacheVariant(config: BaiduConfig, apiType: TranslationApiType): string {
  if (apiType === 'domain') {
    return config.domain || '';
  }

  if (apiType === 'large-model') {
    return [
      config.largeModelEndpoint || LARGE_MODEL_TRANSLATE_API_URL,
      config.largeModelAuthMode || 'api-key',
      config.largeModelModelType || config.largeModelModel || 'llm',
      config.largeModelReference || ''
    ].join(':');
  }

  return '';
}

function getQuotaBaseline(translationConfig: ProcessorConfig['translation'], apiType: TranslationApiType): number {
  if (apiType === 'image') {
    return getImageQuotaBaseline(translationConfig);
  }

  const baiduConfig = translationConfig.apiKeys.baidu;
  return Math.max(0, Math.floor(Number(baiduConfig?.quotaBaseline ?? translationConfig.quotaBaseline ?? 0) || 0));
}

function getImageQuotaBaseline(translationConfig: ProcessorConfig['translation']): number {
  const baiduConfig = translationConfig.apiKeys.baidu;
  return Math.max(0, Math.floor(Number(baiduConfig?.imageQuotaBaseline ?? 0) || 0));
}

function getQuotaCost(apiType: TranslationApiType, text: string): number {
  return API_LIMITS[apiType].unit === 'request' ? 1 : text.length;
}

async function assertWithinQuota(
  apiType: TranslationApiType,
  credentialId: string,
  text: string,
  baseline = 0
): Promise<void> {
  const quota = await getQuotaState(apiType, credentialId, baseline);
  const cost = getQuotaCost(apiType, text);

  if (quota.stopped || quota.used + cost > quota.stopAt) {
    throw new Error(
      `已达到免费额度保护阈值：${quota.month} 已记录 ${quota.used}/${quota.freeLimit}，` +
      `插件会在 ${quota.stopAt}（95%）停止调用。请下月再使用，或在确认百度控制台用量后重置本地额度记录。`
    );
  }
}

async function getQuotaState(
  apiType: TranslationApiType,
  credentialId: string,
  baseline = 0
): Promise<TranslationQuotaState> {
  const quota = await loadQuotaUsage();
  const month = getCurrentMonth();
  const entry = quota[getQuotaKey(apiType, credentialId)];
  const localUsed = entry?.month === month ? entry.used : 0;
  const normalizedBaseline = Math.max(0, Math.floor(Number(baseline) || 0));
  const used = normalizedBaseline + localUsed;
  const freeLimit = API_LIMITS[apiType].freeLimit;
  const stopAt = Math.floor(freeLimit * QUOTA_STOP_RATIO);

  return {
    apiType,
    month,
    used,
    localUsed,
    baseline: normalizedBaseline,
    freeLimit,
    stopAt,
    remainingBeforeStop: Math.max(stopAt - used, 0),
    unit: API_LIMITS[apiType].unit,
    stopped: used >= stopAt
  };
}

async function recordQuotaUsage(apiType: TranslationApiType, credentialId: string, text: string): Promise<void> {
  const quota = await loadQuotaUsage();
  const key = getQuotaKey(apiType, credentialId);
  const month = getCurrentMonth();
  const current = quota[key];
  quota[key] = {
    month,
    used: current?.month === month ? current.used + getQuotaCost(apiType, text) : getQuotaCost(apiType, text)
  };

  await chrome.storage.local.set({ [QUOTA_STORAGE_KEY]: quota });
}

async function loadQuotaUsage(): Promise<Record<string, { month: string; used: number }>> {
  const stored = await chrome.storage.local.get(QUOTA_STORAGE_KEY);
  return stored[QUOTA_STORAGE_KEY] || {};
}

function getQuotaKey(apiType: TranslationApiType, credentialId: string): string {
  return `${credentialId || 'anonymous'}:${apiType}`;
}

async function getCachedTranslation(
  text: string,
  from: string,
  to: string,
  credentialId: string,
  apiType: TranslationApiType,
  variant: string
): Promise<TextTranslationResult | null> {
  const cache = await loadCache();
  const key = await createCacheKey(text, from, to, credentialId, apiType, variant);
  const cached = cache[key];

  if (!cached) {
    return null;
  }

  cached.lastUsed = Date.now();
  await saveCache(cache);

  return {
    ...cached.result,
    duration: 0,
    cached: true
  };
}

async function saveCachedTranslation(
  text: string,
  from: string,
  to: string,
  credentialId: string,
  apiType: TranslationApiType,
  variant: string,
  result: TextTranslationResult
): Promise<void> {
  const cache = await loadCache();
  const key = await createCacheKey(text, from, to, credentialId, apiType, variant);
  const now = Date.now();

  cache[key] = {
    result: {
      ...result,
      cached: false
    },
    timestamp: now,
    lastUsed: now
  };

  await saveCache(cache);
}

async function loadCache(): Promise<Record<string, {
  result: TextTranslationResult;
  timestamp: number;
  lastUsed: number;
}>> {
  const stored = await chrome.storage.local.get(CACHE_STORAGE_KEY);
  return stored[CACHE_STORAGE_KEY] || {};
}

async function saveCache(cache: Record<string, {
  result: TextTranslationResult;
  timestamp: number;
  lastUsed: number;
}>): Promise<void> {
  const entries = Object.entries(cache)
    .sort(([, a], [, b]) => b.lastUsed - a.lastUsed)
    .slice(0, MAX_CACHE_ITEMS);

  await chrome.storage.local.set({
    [CACHE_STORAGE_KEY]: Object.fromEntries(entries)
  });
}

async function createCacheKey(
  text: string,
  from: string,
  to: string,
  credentialId: string,
  apiType: TranslationApiType,
  variant: string
): Promise<string> {
  return md5([credentialId, apiType, variant, from, to, text].join('\u0000'));
}

async function waitForTextRateLimit(apiType: TranslationApiType): Promise<void> {
  const minInterval = apiType === 'large-model' ? 120 : 1000;
  const now = Date.now();
  const elapsed = now - lastTextRequestTime;

  if (elapsed < minInterval) {
    await new Promise(resolve => setTimeout(resolve, minInterval - elapsed));
  }

  lastTextRequestTime = Date.now();
}

async function md5(input: string): Promise<string> {
  return md5Bytes(new TextEncoder().encode(input));
}

async function md5Bytes(bytes: Uint8Array): Promise<string> {
  return md5BytesHex(bytes);
}

function md5BytesHex(input: Uint8Array): string {
  const originalLength = input.length;
  const paddedLength = (((originalLength + 8) >>> 6) + 1) * 64;
  const bytes = new Uint8Array(paddedLength);
  const view = new DataView(bytes.buffer);

  bytes.set(input);
  bytes[originalLength] = 0x80;
  view.setUint32(paddedLength - 8, (originalLength * 8) >>> 0, true);
  view.setUint32(paddedLength - 4, Math.floor((originalLength * 8) / 0x100000000), true);

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;
  const shifts = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ];
  const constants = Array.from({ length: 64 }, (_, index) =>
    Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0
  );

  for (let offset = 0; offset < paddedLength; offset += 64) {
    const words = Array.from({ length: 16 }, (_, index) =>
      view.getUint32(offset + index * 4, true)
    );
    let aa = a;
    let bb = b;
    let cc = c;
    let dd = d;

    for (let i = 0; i < 64; i += 1) {
      let f = 0;
      let g = 0;

      if (i < 16) {
        f = (bb & cc) | (~bb & dd);
        g = i;
      } else if (i < 32) {
        f = (dd & bb) | (~dd & cc);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = bb ^ cc ^ dd;
        g = (3 * i + 5) % 16;
      } else {
        f = cc ^ (bb | ~dd);
        g = (7 * i) % 16;
      }

      const temp = dd;
      dd = cc;
      cc = bb;
      bb = (bb + leftRotate((aa + f + constants[i] + words[g]) >>> 0, shifts[i])) >>> 0;
      aa = temp;
    }

    a = (a + aa) >>> 0;
    b = (b + bb) >>> 0;
    c = (c + cc) >>> 0;
    d = (d + dd) >>> 0;
  }

  return [a, b, c, d].map(wordToHex).join('');
}

function leftRotate(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function wordToHex(word: number): string {
  let hex = '';

  for (let i = 0; i < 4; i += 1) {
    hex += ((word >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
  }

  return hex;
}

function createSalt(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function isErrorCode(code: string | number | undefined): boolean {
  return code !== undefined && code !== '' && String(code) !== '0' && String(code) !== '52000';
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseIgnoreTags(value?: string): string[] {
  return (value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  if (!base64) {
    throw new Error('图片数据格式错误');
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function getDataUrlMimeType(dataUrl: string): string {
  return dataUrl.match(/^data:(.*?);base64,/)?.[1] || 'image/png';
}

function normalizeImageUrl(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  if (/^https?:\/\//.test(value) || value.startsWith('data:image/')) {
    return value;
  }

  return `data:image/png;base64,${value}`;
}

function extractImageText(response: ImageTranslationResponse): {
  sourceText: string;
  translatedText: string;
  imageUrl?: string;
} {
  const sourceText = [
    response.data?.sumSrc,
    response.data?.src,
    response.result?.src,
    response.trans_result?.map(item => item.src).filter(Boolean).join('\n'),
    response.data?.content?.map(item => item.src).filter(Boolean).join('\n')
  ].find(text => typeof text === 'string' && text.trim()) || '';

  const translatedText = [
    response.data?.sumDst,
    response.data?.dst,
    response.result?.dst,
    response.trans_result?.map(item => item.dst).filter(Boolean).join('\n'),
    response.data?.content?.map(item => item.dst).filter(Boolean).join('\n')
  ].find(text => typeof text === 'string' && text.trim()) || '';

  return {
    sourceText: sourceText.trim(),
    translatedText: translatedText.trim(),
    imageUrl: normalizeImageUrl(response.data?.pasteImg || response.result?.pasteImg)
  };
}
