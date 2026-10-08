import {
  assertWithinFreeQuota,
  md5,
  md5File,
  recordQuotaUsage,
  type LanguageCode
} from './translation-service';

export const IMAGE_TRANSLATION_MAX_SIZE = 4 * 1024 * 1024;

export const IMAGE_TRANSLATION_LANGUAGES = [
  { code: 'auto', label: '检测语言' },
  { code: 'zh', label: '中文' },
  { code: 'en', label: '英语' },
  { code: 'jp', label: '日语' },
  { code: 'kor', label: '韩语' },
  { code: 'fra', label: '法语' },
  { code: 'de', label: '德语' },
  { code: 'ru', label: '俄语' },
  { code: 'spa', label: '西班牙语' },
  { code: 'pt', label: '葡萄牙语' },
  { code: 'it', label: '意大利语' },
  { code: 'dan', label: '丹麦语' },
  { code: 'nl', label: '荷兰语' },
  { code: 'may', label: '马来语' },
  { code: 'swe', label: '瑞典语' },
  { code: 'id', label: '印尼语' },
  { code: 'pl', label: '波兰语' },
  { code: 'rom', label: '罗马尼亚语' },
  { code: 'tr', label: '土耳其语' },
  { code: 'el', label: '希腊语' },
  { code: 'hu', label: '匈牙利语' }
] as const;

export type ImageTranslationLanguageCode = typeof IMAGE_TRANSLATION_LANGUAGES[number]['code'];

export interface ImageTranslateConfig {
  appId: string;
  secretKey: string;
  endpoint?: string;
  cuid?: string;
  mac?: string;
  quotaBaseline?: number;
}

export interface ImageTranslateResult {
  from: string;
  to: string;
  sourceText: string;
  translatedText: string;
  raw: unknown;
  duration: number;
}

interface ImageTranslateResponse {
  from?: string;
  to?: string;
  data?: {
    sumSrc?: string;
    sumDst?: string;
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
  };
  error_code?: string | number;
  error_msg?: string;
}

const BAIDU_IMAGE_TRANSLATE_API_URL = '/api/baidu-image-translate';
const REQUEST_TIMEOUT_MS = 20000;

const IMAGE_ERROR_MESSAGES: Record<string, string> = {
  '52001': '请求超时，请重试',
  '52002': '系统错误，请稍后重试',
  '52003': '未授权用户，请检查 APP ID',
  '54000': '必填参数为空',
  '54001': '签名错误，请检查 Secret Key',
  '54003': '访问频率受限，请稍后重试',
  '54004': '账户余额不足',
  '58000': '客户端 IP 非法，请检查百度翻译开放平台安全设置',
  '58001': '语言方向不支持，请调整源语言或目标语言',
  '69001': '上传图片数据异常',
  '69002': '图片大小超限，请使用 4 MB 以下图片',
  '69003': '图片识别失败，请换一张更清晰的图片',
  '69004': '图片格式不支持',
  '90107': '认证未通过或服务未开通，请检查百度翻译开放平台配置'
};

function isErrorCode(code: string | number | undefined): boolean {
  return code !== undefined && code !== '' && String(code) !== '0' && String(code) !== '52000';
}

function generateSalt(): string {
  return Math.random().toString(36).substring(2, 10);
}

function assertImageFile(file: File): void {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/webp'];
  const extension = file.name.split('.').pop()?.toLowerCase();
  const supportedExtensions = ['jpg', 'jpeg', 'png', 'bmp', 'webp'];

  if (!supportedTypes.includes(file.type) && !supportedExtensions.includes(extension || '')) {
    throw new Error('图片格式不支持，请选择 JPG、PNG、BMP 或 WebP 图片');
  }

  if (file.size > IMAGE_TRANSLATION_MAX_SIZE) {
    throw new Error('图片大小超过 4 MB，请压缩后再翻译');
  }
}

function extractImageText(response: ImageTranslateResponse): {
  sourceText: string;
  translatedText: string;
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
    translatedText: translatedText.trim()
  };
}

export async function translateImage(
  file: File,
  from: ImageTranslationLanguageCode,
  to: ImageTranslationLanguageCode,
  config: ImageTranslateConfig
): Promise<ImageTranslateResult> {
  const startTime = Date.now();

  if (!config.appId || !config.secretKey) {
    throw new Error('请先在设置页面配置百度翻译 APP ID 和 Secret Key');
  }

  if (to === 'auto') {
    throw new Error('目标语言不能设置为检测语言');
  }

  assertImageFile(file);
  assertWithinFreeQuota('image', config.appId, 'image', config.quotaBaseline);

  const salt = generateSalt();
  const cuid = config.cuid || `clipboard-text-processor-${config.appId}`;
  const mac = config.mac || '00:00:00:00:00:00';
  const imageMd5 = await md5File(file);
  const sign = md5(config.appId + imageMd5 + salt + cuid + mac + config.secretKey);
  const formData = new FormData();

  formData.append('from', from);
  formData.append('to', to);
  formData.append('appid', config.appId);
  formData.append('salt', salt);
  formData.append('cuid', cuid);
  formData.append('mac', mac);
  formData.append('sign', sign);
  formData.append('paste', '0');
  formData.append('image', file);

  const endpoint = config.endpoint?.trim() || BAIDU_IMAGE_TRANSLATE_API_URL;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (error: any) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error('图片翻译请求超时，请检查网络连接');
    }
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('图片翻译请求失败：当前地址无法跨域访问，请使用站点同源代理地址');
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`图片翻译 HTTP 错误: ${response.status}`);
  }

  const data = await response.json() as ImageTranslateResponse;
  if (isErrorCode(data.error_code)) {
    const errorCode = String(data.error_code);
    throw new Error(IMAGE_ERROR_MESSAGES[errorCode] || data.error_msg || `图片翻译错误: ${errorCode}`);
  }

  const extracted = extractImageText(data);
  if (!extracted.translatedText) {
    throw new Error('图片翻译结果为空，请检查图片内容或语言方向');
  }

  recordQuotaUsage('image', config.appId, 'image');

  return {
    from: data.from || from,
    to: data.to || to,
    sourceText: extracted.sourceText,
    translatedText: extracted.translatedText,
    raw: data,
    duration: Date.now() - startTime
  };
}
