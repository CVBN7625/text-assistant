import { computed, reactive, ref } from 'vue';
import {
  IMAGE_TRANSLATION_MAX_SIZE,
  translateImage,
  type ImageTranslateResult,
  type ImageTranslationLanguageCode
} from '../services/image-translation-service';
import {
  getTranslationQuotaState,
  resetTranslationQuotaUsage,
  type TranslationQuotaState
} from '../services/translation-service';

export interface ImageTranslatorConfig {
  baiduAppId: string;
  baiduSecretKey: string;
  endpoint: string;
  cuid: string;
  mac: string;
  quotaBaseline: number;
}

const TEXT_TRANSLATOR_STORAGE_KEY = 'clipboard-translator-config';
const IMAGE_STORAGE_KEY = 'clipboard-image-translator-config';
const LEGACY_BAIDU_IMAGE_ENDPOINT = 'https://fanyi-api.baidu.com/api/trans/sdk/picture';

function loadTextTranslatorDefaults(): Partial<ImageTranslatorConfig> {
  const raw = localStorage.getItem(TEXT_TRANSLATOR_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const config = JSON.parse(raw);
    return {
      baiduAppId: config.baiduAppId || '',
      baiduSecretKey: config.baiduSecretKey || '',
      quotaBaseline: Number(config.quotaBaseline) || 0
    };
  } catch (error) {
    console.error('加载文本翻译配置失败:', error);
    return {};
  }
}

function loadConfig(): ImageTranslatorConfig {
  const defaults: ImageTranslatorConfig = {
    baiduAppId: import.meta.env.VITE_BAIDU_TRANSLATE_APP_ID || '',
    baiduSecretKey: import.meta.env.VITE_BAIDU_TRANSLATE_SECRET_KEY || '',
    endpoint: '',
    cuid: '',
    mac: '',
    quotaBaseline: 0,
    ...loadTextTranslatorDefaults()
  };

  const raw = localStorage.getItem(IMAGE_STORAGE_KEY);
  if (!raw) {
    return defaults;
  }

  try {
    const storedConfig = JSON.parse(raw);
    return {
      ...defaults,
      ...storedConfig,
      endpoint: storedConfig.endpoint === LEGACY_BAIDU_IMAGE_ENDPOINT ? '' : storedConfig.endpoint || ''
    };
  } catch (error) {
    console.error('加载图片翻译配置失败:', error);
    return defaults;
  }
}

function saveConfig(config: ImageTranslatorConfig): void {
  localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(config));
}

export function useImageTranslator() {
  const config = reactive<ImageTranslatorConfig>(loadConfig());
  const sourceLang = ref<ImageTranslationLanguageCode>('auto');
  const targetLang = ref<Exclude<ImageTranslationLanguageCode, 'auto'>>('zh');
  const selectedFile = ref<File | null>(null);
  const previewUrl = ref('');
  const result = ref<ImageTranslateResult | null>(null);
  const isTranslating = ref(false);
  const errorMsg = ref('');
  const quotaStats = ref<TranslationQuotaState>(
    getTranslationQuotaState('image', config.baiduAppId, config.quotaBaseline)
  );

  const canTranslate = computed(() =>
    Boolean(
      selectedFile.value &&
      config.baiduAppId &&
      config.baiduSecretKey &&
      !isTranslating.value &&
      !quotaStats.value.stopped
    )
  );

  const maxSizeLabel = computed(() => `${Math.floor(IMAGE_TRANSLATION_MAX_SIZE / 1024 / 1024)} MB`);

  const refreshQuotaStats = () => {
    quotaStats.value = getTranslationQuotaState('image', config.baiduAppId, config.quotaBaseline);
  };

  const updateConfig = (newConfig: Partial<ImageTranslatorConfig>) => {
    Object.assign(config, newConfig);
    saveConfig(config);
    refreshQuotaStats();
  };

  const resetQuotaUsage = () => {
    resetTranslationQuotaUsage('image', config.baiduAppId);
    refreshQuotaStats();
  };

  const selectFile = (file: File | null) => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
    }

    selectedFile.value = file;
    result.value = null;
    errorMsg.value = '';
    previewUrl.value = file ? URL.createObjectURL(file) : '';
  };

  const clearFile = () => {
    selectFile(null);
  };

  const translateSelectedImage = async () => {
    if (!selectedFile.value) {
      errorMsg.value = '请先选择图片';
      return;
    }

    if (!config.baiduAppId || !config.baiduSecretKey) {
      errorMsg.value = '请先配置百度翻译 APP ID 和 Secret Key';
      return;
    }

    isTranslating.value = true;
    errorMsg.value = '';
    result.value = null;

    try {
      result.value = await translateImage(selectedFile.value, sourceLang.value, targetLang.value, {
        appId: config.baiduAppId,
        secretKey: config.baiduSecretKey,
        endpoint: config.endpoint || undefined,
        cuid: config.cuid || undefined,
        mac: config.mac || undefined,
        quotaBaseline: config.quotaBaseline
      });
      refreshQuotaStats();
    } catch (error: any) {
      errorMsg.value = error.message || '图片翻译失败';
      console.error('图片翻译失败:', error);
    } finally {
      isTranslating.value = false;
    }
  };

  const copyTranslatedText = async () => {
    if (!result.value?.translatedText) {
      return false;
    }

    await navigator.clipboard.writeText(result.value.translatedText);
    return true;
  };

  return {
    config,
    sourceLang,
    targetLang,
    selectedFile,
    previewUrl,
    result,
    isTranslating,
    errorMsg,
    quotaStats,
    canTranslate,
    maxSizeLabel,
    updateConfig,
    resetQuotaUsage,
    selectFile,
    clearFile,
    translateSelectedImage,
    copyTranslatedText,
    refreshQuotaStats
  };
}
