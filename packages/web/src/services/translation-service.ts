/**
 * 翻译服务模块
 * 封装百度翻译API调用、MD5签名、语言映射、错误处理
 */

// 语言映射（从CopyPlusPlus参考项目提取）
export const LANGUAGES = [
  { code: 'auto', label: '检测语言' },
  { code: 'zh', label: '中文' },
  { code: 'en', label: '英语' },
  { code: 'jp', label: '日语' },
  { code: 'kor', label: '韩语' },
  { code: 'fra', label: '法语' },
  { code: 'de', label: '德语' },
  { code: 'ru', label: '俄语' },
  { code: 'cht', label: '繁体中文' },
  { code: 'spa', label: '西班牙语' },
  { code: 'pt', label: '葡萄牙语' },
  { code: 'it', label: '意大利语' },
  { code: 'vie', label: '越南语' },
  { code: 'th', label: '泰语' }
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];

export type TranslationApiType = 'general' | 'large-model' | 'domain' | 'image';

export interface TranslationApiOption {
  value: TranslationApiType;
  label: string;
  freeLimit: number;
  unit: 'character' | 'request';
  implemented: boolean;
  description: string;
}

export interface FieldDomainOption {
  value: string;
  label: string;
  directions: string;
}

export const TRANSLATION_API_OPTIONS: TranslationApiOption[] = [
  {
    value: 'general',
    label: '通用文本翻译 API',
    freeLimit: 1_000_000,
    unit: 'character',
    implemented: true,
    description: '当前已接入，适合日常文本翻译'
  },
  {
    value: 'large-model',
    label: '大模型文本翻译 API',
    freeLimit: 1_000_000,
    unit: 'character',
    implemented: true,
    description: '使用 API Key 鉴权，端点和请求格式可由用户按控制台文档配置'
  },
  {
    value: 'domain',
    label: '领域文本翻译 API',
    freeLimit: 500_000,
    unit: 'character',
    implemented: true,
    description: '适合论文、医药、金融等垂直领域，需选择 domain'
  },
  {
    value: 'image',
    label: '图片翻译 API',
    freeLimit: 1000,
    unit: 'request',
    implemented: true,
    description: '图片 OCR + 翻译，独立页面调用并按请求次数计量'
  }
];

export const FIELD_DOMAIN_OPTIONS: FieldDomainOption[] = [
  { value: 'academic', label: '学术论文', directions: '中英互译' },
  { value: 'medicine', label: '生物医药', directions: '中英互译' },
  { value: 'finance', label: '金融财经', directions: '中英互译' },
  { value: 'it', label: '信息技术', directions: '中英互译' },
  { value: 'machinery', label: '机械制造', directions: '中英互译' },
  { value: 'electronics', label: '电子科技', directions: '中译英' },
  { value: 'mechanics', label: '水利机械', directions: '中译英' },
  { value: 'novel', label: '网络文学', directions: '中译英' },
  { value: 'news', label: '新闻资讯', directions: '中英互译' },
  { value: 'wiki', label: '人文社科', directions: '中译英' },
  { value: 'aerospace', label: '航空航天', directions: '中英互译' },
  { value: 'law', label: '法律法规', directions: '中英互译' },
  { value: 'contract', label: '合同', directions: '中英互译' }
];

export type LargeModelRequestMode = 'baidu-translate' | 'openai-compatible';
export type LargeModelAuthMode = 'api-key' | 'sign';
export type LargeModelModelType = 'llm' | 'nmt';

// 百度翻译API配置
export interface BaiduTranslateConfig {
  appId: string;
  secretKey: string;
  domain?: string;
  largeModelApiKey?: string;
  largeModelEndpoint?: string;
  largeModelModel?: string;
  largeModelAuthMode?: LargeModelAuthMode;
  largeModelModelType?: LargeModelModelType;
  largeModelReference?: string;
  largeModelNeedIntervene?: boolean;
  largeModelTagHandling?: boolean;
  largeModelIgnoreTags?: string;
  largeModelRequestMode?: LargeModelRequestMode;
  cacheEnabled?: boolean;
  apiType?: TranslationApiType;
  quotaBaseline?: number;
}

// 翻译请求参数
interface TranslateRequest {
  q: string;
  from: LanguageCode;
  to: LanguageCode;
  appid: string;
  salt: string;
  sign: string;
}

// 翻译响应
interface TranslateResponse {
  from: string;
  to: string;
  trans_result: Array<{ src: string; dst: string }>;
  error_code?: string;
  error_msg?: string;
}

interface FieldTranslateRequest extends TranslateRequest {
  domain: string;
}

interface LargeModelTranslationResponse {
  result?: {
    from?: string;
    to?: string;
    trans_result?: Array<{ src?: string; dst?: string }>;
    translated_text?: string;
  };
  trans_result?: Array<{ src?: string; dst?: string }>;
  data?: {
    result?: string;
    translated_text?: string;
    translation?: string;
  };
  choices?: Array<{
    message?: { content?: string };
    text?: string;
  }>;
  translated_text?: string;
  translation?: string;
  error_code?: string | number;
  error_msg?: string;
  message?: string;
}

// 翻译结果
export interface TranslateResult {
  text: string;
  from: string;
  to: string;
  duration: number; // 翻译耗时（毫秒）
  cached?: boolean; // 是否来自本地缓存
}

// 速率限制：上次请求时间
let lastRequestTime = 0;

const BAIDU_TRANSLATE_API_URL = 'https://fanyi-api.baidu.com/api/trans/vip/translate';
const BAIDU_FIELD_TRANSLATE_API_URL = 'https://fanyi-api.baidu.com/api/trans/vip/fieldtranslate';
const BAIDU_LARGE_MODEL_TRANSLATE_API_URL = 'https://fanyi-api.baidu.com/ait/api/aiTextTranslate';
const CACHE_KEY = 'clipboard-translator-cache-v1';
const QUOTA_KEY = 'clipboard-translator-quota-v1';
const MAX_CACHE_ITEMS = 200;
const JSONP_TIMEOUT = 5000;
const QUOTA_STOP_RATIO = 0.95;

interface CachedTranslation {
  result: TranslateResult;
  timestamp: number;
  lastUsed: number;
}

interface TranslationCacheState {
  entries: Record<string, CachedTranslation>;
}

export interface TranslationCacheStats {
  count: number;
  max: number;
}

export interface TranslationQuotaState {
  apiType: TranslationApiType;
  month: string;
  used: number;
  localUsed: number;
  baseline: number;
  freeLimit: number;
  stopAt: number;
  remainingBeforeStop: number;
  unit: 'character' | 'request';
  stopped: boolean;
}

interface QuotaUsageEntry {
  month: string;
  used: number;
}

interface QuotaUsageState {
  entries: Record<string, QuotaUsageEntry>;
}

/**
 * 纯JS MD5实现（RFC 1321标准）
 * 避免引入第三方依赖
 */
function toUtf8Binary(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return bytesToBinary(bytes);
}

function bytesToBinary(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return binary;
}

export function md5(input: string): string {
  return md5Binary(toUtf8Binary(input));
}

export async function md5File(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return md5Binary(bytesToBinary(new Uint8Array(buffer)));
}

function md5Binary(input: string): string {
  const string = input;

  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }

  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }

  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }

  function md51(s: string) {
    const n = s.length;
    let state = [1732584193, -271733879, -1732584194, 271733878];
    let i: number;

    for (i = 64; i <= n; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }

    s = s.substring(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    for (i = 0; i < s.length; i++) {
      tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    }

    tail[i >> 2] |= 0x80 << ((i % 4) << 3);

    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }

    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function md5blk(s: string) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  const hex_chr = '0123456789abcdef'.split('');

  function rhex(n: number) {
    let s = '';
    for (let j = 0; j < 4; j++) {
      s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
    }
    return s;
  }

  function hex(x: number[]) {
    return rhex(x[0]) + rhex(x[1]) + rhex(x[2]) + rhex(x[3]);
  }

  function add32(a: number, b: number) {
    return (a + b) & 0xFFFFFFFF;
  }

  return hex(md51(string));
}

/**
 * 生成随机盐值
 */
function generateSalt(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * 速率限制：确保请求间隔至少1秒
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;

  if (elapsed < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
  }

  lastRequestTime = Date.now();
}

function canUseLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getApiOption(apiType: TranslationApiType): TranslationApiOption {
  return TRANSLATION_API_OPTIONS.find(option => option.value === apiType) || TRANSLATION_API_OPTIONS[0];
}

function loadQuotaUsage(): QuotaUsageState {
  if (!canUseLocalStorage()) {
    return { entries: {} };
  }

  const raw = localStorage.getItem(QUOTA_KEY);
  if (!raw) {
    return { entries: {} };
  }

  try {
    const parsed = JSON.parse(raw) as QuotaUsageState;
    return {
      entries: parsed.entries || {}
    };
  } catch (error) {
    console.error('加载翻译额度记录失败:', error);
    return { entries: {} };
  }
}

function saveQuotaUsage(quota: QuotaUsageState): void {
  if (!canUseLocalStorage()) {
    return;
  }

  localStorage.setItem(QUOTA_KEY, JSON.stringify(quota));
}

function getQuotaKey(apiType: TranslationApiType, appId: string): string {
  return `${appId || 'anonymous'}:${apiType}`;
}

function getQuotaState(
  apiType: TranslationApiType,
  appId: string,
  baseline: number = 0
): TranslationQuotaState {
  const apiOption = getApiOption(apiType);
  const month = getCurrentMonth();
  const quota = loadQuotaUsage();
  const key = getQuotaKey(apiType, appId);
  const entry = quota.entries[key];
  const localUsed = entry?.month === month ? entry.used : 0;
  const normalizedBaseline = Math.max(0, Math.floor(Number(baseline) || 0));
  const used = normalizedBaseline + localUsed;
  const stopAt = Math.floor(apiOption.freeLimit * QUOTA_STOP_RATIO);
  const remainingBeforeStop = Math.max(stopAt - used, 0);

  return {
    apiType,
    month,
    used,
    localUsed,
    baseline: normalizedBaseline,
    freeLimit: apiOption.freeLimit,
    stopAt,
    remainingBeforeStop,
    unit: apiOption.unit,
    stopped: used >= stopAt
  };
}

function getTranslationCost(apiType: TranslationApiType, text: string): number {
  const apiOption = getApiOption(apiType);
  return apiOption.unit === 'request' ? 1 : text.length;
}

export function assertWithinFreeQuota(
  apiType: TranslationApiType,
  appId: string,
  text: string,
  baseline: number = 0
): void {
  const quotaState = getQuotaState(apiType, appId, baseline);
  const cost = getTranslationCost(apiType, text);

  if (quotaState.stopped || quotaState.used + cost > quotaState.stopAt) {
    throw new Error(
      `已达到免费额度保护阈值：${quotaState.month} 已记录 ${quotaState.used}/${quotaState.freeLimit}，` +
      `本工具会在 ${quotaState.stopAt}（95%）停止调用。请下月再使用或在设置中重置本地额度记录。`
    );
  }
}

export function recordQuotaUsage(apiType: TranslationApiType, appId: string, text: string): void {
  const quota = loadQuotaUsage();
  const key = getQuotaKey(apiType, appId);
  const month = getCurrentMonth();
  const cost = getTranslationCost(apiType, text);
  const entry = quota.entries[key];

  quota.entries[key] = {
    month,
    used: entry?.month === month ? entry.used + cost : cost
  };

  saveQuotaUsage(quota);
}

export function getTranslationQuotaState(
  apiType: TranslationApiType = 'general',
  appId: string = '',
  baseline: number = 0
): TranslationQuotaState {
  return getQuotaState(apiType, appId, baseline);
}

export function resetTranslationQuotaUsage(
  apiType: TranslationApiType = 'general',
  appId: string = ''
): void {
  if (!canUseLocalStorage()) {
    return;
  }

  const quota = loadQuotaUsage();
  delete quota.entries[getQuotaKey(apiType, appId)];
  saveQuotaUsage(quota);
}

function loadCache(): TranslationCacheState {
  if (!canUseLocalStorage()) {
    return { entries: {} };
  }

  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) {
    return { entries: {} };
  }

  try {
    const parsed = JSON.parse(raw) as TranslationCacheState;
    return {
      entries: parsed.entries || {}
    };
  } catch (error) {
    console.error('加载翻译缓存失败:', error);
    return { entries: {} };
  }
}

function saveCache(cache: TranslationCacheState): void {
  if (!canUseLocalStorage()) {
    return;
  }

  const entries = Object.entries(cache.entries)
    .sort(([, a], [, b]) => b.lastUsed - a.lastUsed)
    .slice(0, MAX_CACHE_ITEMS);

  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      entries: Object.fromEntries(entries)
    })
  );
}

function createCacheKey(
  text: string,
  from: LanguageCode,
  to: LanguageCode,
  appId: string,
  apiType: TranslationApiType,
  variant: string = ''
): string {
  return md5([appId, apiType, variant, from, to, text].join('\u0000'));
}

function getCachedTranslation(
  text: string,
  from: LanguageCode,
  to: LanguageCode,
  appId: string,
  apiType: TranslationApiType,
  variant: string = ''
): TranslateResult | null {
  const cache = loadCache();
  const cacheKey = createCacheKey(text, from, to, appId, apiType, variant);
  const cached = cache.entries[cacheKey];

  if (!cached) {
    return null;
  }

  cached.lastUsed = Date.now();
  saveCache(cache);

  return {
    ...cached.result,
    duration: 0,
    cached: true
  };
}

function saveCachedTranslation(
  text: string,
  from: LanguageCode,
  to: LanguageCode,
  appId: string,
  apiType: TranslationApiType,
  variant: string,
  result: TranslateResult
): void {
  const cache = loadCache();
  const cacheKey = createCacheKey(text, from, to, appId, apiType, variant);
  const now = Date.now();

  cache.entries[cacheKey] = {
    result: {
      ...result,
      cached: false
    },
    timestamp: now,
    lastUsed: now
  };

  saveCache(cache);
}

export function clearTranslationCache(): void {
  if (canUseLocalStorage()) {
    localStorage.removeItem(CACHE_KEY);
  }
}

export function getTranslationCacheStats(): TranslationCacheStats {
  const cache = loadCache();
  return {
    count: Object.keys(cache.entries).length,
    max: MAX_CACHE_ITEMS
  };
}

/**
 * 百度翻译API错误码映射
 */
const ERROR_MESSAGES: Record<string, string> = {
  '52000': '成功',
  '52001': '请求超时，请重试',
  '52002': '系统错误，请稍后重试',
  '52003': '未授权用户，请检查API Key',
  '54000': '必填参数为空',
  '54001': '签名错误，请检查Secret Key',
  '54003': '访问频率受限，请稍后重试',
  '54004': '账户余额不足',
  '54005': '长query请求频繁，请缩短文本长度',
  '58000': '客户端 IP 非法，请检查百度翻译开放平台安全设置',
  '58001': '译文语言方向不支持，请调整源语言或目标语言',
  '58002': '服务当前已关闭，请前往控制台开启服务',
  '58004': '模型参数错误，请检查 model_type',
  '59002': '翻译指令过长，reference 最多 500 字符',
  '59003': '请求文本过长，q 最多 6000 字符',
  '59004': 'QPS 超限，请降低调用频率',
  '59005': 'tag_handling 参数非法',
  '59006': '标签解析失败',
  '59007': 'ignore_tags 长度超限',
  '90107': '认证未通过或服务未开通，请检查百度翻译开放平台配置'
};

function isErrorCode(code: string | number | undefined): boolean {
  return code !== undefined && code !== '' && String(code) !== '0' && String(code) !== '52000';
}

function normalizeTargetLanguageCode(
  code: string | undefined,
  fallback: Exclude<LanguageCode, 'auto'>
): Exclude<LanguageCode, 'auto'> {
  const language = LANGUAGES.find(item => item.code === code)?.code;
  return language && language !== 'auto' ? language : fallback;
}

function getTextApiUrl(apiType: TranslationApiType): string {
  return apiType === 'domain' ? BAIDU_FIELD_TRANSLATE_API_URL : BAIDU_TRANSLATE_API_URL;
}

function translateWithJsonp(url: string, params: TranslateRequest | FieldTranslateRequest): Promise<TranslateResponse> {
  return new Promise((resolve, reject) => {
    const callbackName = `__ctpBaiduTranslate_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const script = document.createElement('script');
    const query = new URLSearchParams({
      ...params,
      callback: callbackName
    } as any);
    let settled = false;

    const cleanup = () => {
      delete (window as any)[callbackName];
      script.remove();
    };

    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('JSONP 请求超时，请检查网络连接'));
    }, JSONP_TIMEOUT);

    (window as any)[callbackName] = (data: TranslateResponse) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      cleanup();
      reject(new Error('静态页面请求百度翻译失败，请检查网络或百度接口是否允许 JSONP'));
    };

    script.src = `${url}?${query.toString()}`;
    document.head.appendChild(script);
  });
}

async function requestBaiduTranslation(
  url: string,
  params: TranslateRequest | FieldTranslateRequest
): Promise<TranslateResponse> {
  const body = new URLSearchParams(params as any);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body,
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return translateWithJsonp(url, params);
    }

    throw error;
  }
}

function requireBaiduClassicConfig(config: BaiduTranslateConfig): void {
  if (!config.appId || !config.secretKey) {
    throw new Error('请先在设置页面配置百度翻译 APP ID 和 Secret Key');
  }
}

function getCredentialId(config: BaiduTranslateConfig, apiType: TranslationApiType): string {
  if (apiType === 'large-model') {
    return config.largeModelApiKey || config.appId || 'large-model';
  }

  return config.appId;
}

function getCacheVariant(config: BaiduTranslateConfig, apiType: TranslationApiType): string {
  if (apiType === 'domain') {
    return config.domain || '';
  }

  if (apiType === 'large-model') {
    return [
      config.largeModelEndpoint || BAIDU_LARGE_MODEL_TRANSLATE_API_URL,
      config.largeModelAuthMode || 'api-key',
      config.largeModelModelType || config.largeModelModel || 'llm',
      config.largeModelReference || '',
      config.largeModelNeedIntervene ? 'term' : '',
      config.largeModelTagHandling ? 'tag' : '',
      config.largeModelIgnoreTags || ''
    ].join(':');
  }

  return '';
}

function createSignedTextParams(
  text: string,
  from: LanguageCode,
  to: LanguageCode,
  config: BaiduTranslateConfig
): TranslateRequest {
  const salt = generateSalt();
  const sign = md5(config.appId + text + salt + config.secretKey);

  return {
    q: text,
    from,
    to,
    appid: config.appId,
    salt,
    sign
  };
}

function createSignedFieldParams(
  text: string,
  from: LanguageCode,
  to: LanguageCode,
  config: BaiduTranslateConfig
): FieldTranslateRequest {
  const domain = config.domain?.trim();

  if (!domain) {
    throw new Error('使用领域文本翻译 API 时，请先选择领域 domain');
  }

  const salt = generateSalt();
  const sign = md5(config.appId + text + salt + domain + config.secretKey);

  return {
    q: text,
    from,
    to,
    appid: config.appId,
    salt,
    domain,
    sign
  };
}

function getTextFromClassicResponse(data: TranslateResponse): string {
  if (isErrorCode(data.error_code)) {
    const errorMsg = ERROR_MESSAGES[String(data.error_code)] || `未知错误: ${data.error_code}`;
    throw new Error(errorMsg);
  }

  if (!data.trans_result || data.trans_result.length === 0) {
    throw new Error('翻译结果为空');
  }

  return data.trans_result.map(item => item.dst).join('\n');
}

function getTextFromLargeModelResponse(data: LargeModelTranslationResponse): string {
  if (isErrorCode(data.error_code)) {
    const errorCode = String(data.error_code);
    throw new Error(ERROR_MESSAGES[errorCode] || data.error_msg || data.message || `大模型文本翻译错误: ${data.error_code}`);
  }

  const candidates = [
    data.result?.trans_result?.map(item => item.dst).filter(Boolean).join('\n'),
    data.trans_result?.map(item => item.dst).filter(Boolean).join('\n'),
    data.result?.translated_text,
    data.data?.translated_text,
    data.data?.translation,
    data.data?.result,
    data.translated_text,
    data.translation,
    data.choices?.[0]?.message?.content,
    data.choices?.[0]?.text
  ];

  const text = candidates.find(candidate => typeof candidate === 'string' && candidate.trim());
  if (!text) {
    throw new Error('大模型文本翻译结果为空或返回格式无法识别，请检查端点和请求格式设置');
  }

  return text.trim();
}

async function translateWithLargeModel(
  text: string,
  from: LanguageCode,
  to: LanguageCode,
  config: BaiduTranslateConfig
): Promise<{ text: string; from: string; to: string }> {
  const apiKey = config.largeModelApiKey?.trim();
  const endpoint = config.largeModelEndpoint?.trim() || BAIDU_LARGE_MODEL_TRANSLATE_API_URL;
  const authMode = config.largeModelAuthMode || 'api-key';
  const body: Record<string, unknown> = {
    appid: config.appId,
    q: text,
    from,
    to,
    model_type: config.largeModelModelType || config.largeModelModel || 'llm'
  };
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (!config.appId) {
    throw new Error('大模型文本翻译仍需传入 APP ID，请在设置中填写百度 APP ID');
  }

  if (config.largeModelReference?.trim()) {
    body.reference = config.largeModelReference.trim();
  }

  if (config.largeModelNeedIntervene) {
    body.needIntervene = 1;
  }

  if (config.largeModelTagHandling) {
    body.tag_handling = 1;
  }

  const ignoreTags = (config.largeModelIgnoreTags || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 20);

  if (ignoreTags.length > 0) {
    body.ignore_tags = ignoreTags;
  }

  if (authMode === 'api-key') {
    if (!apiKey) {
      throw new Error('使用大模型文本翻译 API 时，请填写 API Key 管理页面中的 API Key');
    }
    headers.Authorization = `Bearer ${apiKey}`;
  } else {
    requireBaiduClassicConfig(config);
    const salt = generateSalt();
    body.salt = salt;
    body.sign = md5(config.appId + text + salt + config.secretKey);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`大模型文本翻译 HTTP 错误: ${response.status}`);
  }

  const data = await response.json() as LargeModelTranslationResponse;
  return {
    text: getTextFromLargeModelResponse(data),
    from,
    to
  };
}

/**
 * 调用百度翻译API
 */
export async function translate(
  text: string,
  from: LanguageCode,
  to: LanguageCode,
  config: BaiduTranslateConfig
): Promise<TranslateResult> {
  const startTime = Date.now();
  const queryText = text.trim();
  const apiType = config.apiType || 'general';
  const credentialId = getCredentialId(config, apiType);
  const cacheVariant = getCacheVariant(config, apiType);

  // 验证文本
  if (!queryText) {
    throw new Error('请输入要翻译的文本');
  }

  if (to === 'auto') {
    throw new Error('目标语言不能设置为检测语言');
  }

  if (config.cacheEnabled !== false) {
    const cachedResult = getCachedTranslation(
      queryText,
      from,
      to,
      credentialId,
      apiType,
      cacheVariant
    );
    if (cachedResult) {
      return cachedResult;
    }
  }

  assertWithinFreeQuota(apiType, credentialId, queryText, config.quotaBaseline);

  // 速率限制
  await waitForRateLimit();

  // 发起请求
  try {
    let translatedText = '';
    let resultFrom = from;
    let resultTo = to;

    if (apiType === 'large-model') {
      const largeModelResult = await translateWithLargeModel(queryText, from, to, config);
      translatedText = largeModelResult.text;
      resultFrom = largeModelResult.from as LanguageCode;
      resultTo = normalizeTargetLanguageCode(largeModelResult.to, to);
    } else {
      requireBaiduClassicConfig(config);
      const params = apiType === 'domain'
        ? createSignedFieldParams(queryText, from, to, config)
        : createSignedTextParams(queryText, from, to, config);
      const data = await requestBaiduTranslation(getTextApiUrl(apiType), params);
      translatedText = getTextFromClassicResponse(data);
      resultFrom = data.from as LanguageCode;
      resultTo = normalizeTargetLanguageCode(data.to, to);
    }

    const duration = Date.now() - startTime;

    const result: TranslateResult = {
      text: translatedText,
      from: resultFrom,
      to: resultTo,
      duration,
      cached: false
    };

    if (config.cacheEnabled !== false) {
      saveCachedTranslation(queryText, from, to, credentialId, apiType, cacheVariant, result);
    }

    recordQuotaUsage(apiType, credentialId, queryText);

    return result;
  } catch (error: any) {
    // 处理特定错误类型
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接');
    }
    throw error;
  }
}

/**
 * 获取语言标签
 */
export function getLanguageLabel(code: LanguageCode): string {
  const lang = LANGUAGES.find(l => l.code === code);
  return lang ? lang.label : code;
}

/**
 * 拆分长文本（百度API限制6000字节）
 */
export function splitText(text: string, maxLength: number = 2000): string[] {
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

    // 尝试在标点符号处拆分
    let splitIndex = -1;
    const punctuation = ['。', '！', '？', '\n', '.', '!', '?', '；', ';', '，', ','];

    for (const p of punctuation) {
      const index = remaining.lastIndexOf(p, maxLength);
      if (index > 0) {
        splitIndex = index + 1;
        break;
      }
    }

    // 如果找不到合适的拆分点，强制在最大长度处拆分
    if (splitIndex === -1) {
      splitIndex = maxLength;
    }

    parts.push(remaining.substring(0, splitIndex));
    remaining = remaining.substring(splitIndex);
  }

  return parts;
}
