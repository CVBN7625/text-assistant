/**
 * 翻译功能Vue Composable
 * 管理响应式状态、业务逻辑、localStorage持久化
 */

import { ref, reactive, computed, watch } from 'vue';
import {
  clearTranslationCache,
  getTranslationQuotaState,
  getTranslationCacheStats,
  resetTranslationQuotaUsage,
  translate,
  splitText,
  getLanguageLabel,
  type TranslationCacheStats,
  type TranslationQuotaState,
  type TranslationApiType,
  type LargeModelAuthMode,
  type LargeModelModelType,
  type LargeModelRequestMode,
  type LanguageCode,
} from '../services/translation-service';

// 配置接口
export interface TranslatorConfig {
  baiduAppId: string;
  baiduSecretKey: string;
  domain: string;
  largeModelApiKey: string;
  largeModelEndpoint: string;
  largeModelModel: string;
  largeModelAuthMode: LargeModelAuthMode;
  largeModelModelType: LargeModelModelType;
  largeModelReference: string;
  largeModelNeedIntervene: boolean;
  largeModelTagHandling: boolean;
  largeModelIgnoreTags: string;
  largeModelRequestMode: LargeModelRequestMode;
  apiType: TranslationApiType;
  defaultSourceLang: LanguageCode;
  defaultTargetLang: LanguageCode;
  autoTranslate: boolean;
  cacheEnabled: boolean;
  quotaBaseline: number;
}

// 历史记录接口
export interface TranslationHistory {
  id: string;
  timestamp: number;
  sourceText: string;
  translatedText: string;
  from: LanguageCode;
  to: LanguageCode;
}

// 存储Key
const STORAGE_KEY = 'clipboard-translator-config';
const HISTORY_KEY = 'clipboard-translator-history';
const MAX_HISTORY = 50;
const AUTO_TRANSLATE_DELAY_MS = 3000;

/**
 * 从localStorage加载配置
 */
function loadConfig(): TranslatorConfig {
  const defaults: TranslatorConfig = {
    baiduAppId: import.meta.env.VITE_BAIDU_TRANSLATE_APP_ID || '',
    baiduSecretKey: import.meta.env.VITE_BAIDU_TRANSLATE_SECRET_KEY || '',
    domain: 'academic',
    largeModelApiKey: import.meta.env.VITE_BAIDU_TRANSLATE_LARGE_MODEL_API_KEY || '',
    largeModelEndpoint: import.meta.env.VITE_BAIDU_TRANSLATE_LARGE_MODEL_ENDPOINT || 'https://fanyi-api.baidu.com/ait/api/aiTextTranslate',
    largeModelModel: 'llm',
    largeModelAuthMode: 'api-key',
    largeModelModelType: 'llm',
    largeModelReference: '',
    largeModelNeedIntervene: false,
    largeModelTagHandling: false,
    largeModelIgnoreTags: '',
    largeModelRequestMode: 'baidu-translate',
    apiType: 'general',
    defaultSourceLang: 'auto',
    defaultTargetLang: 'en',
    autoTranslate: true,
    cacheEnabled: true,
    quotaBaseline: 0
  };

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return {
        ...defaults,
        ...JSON.parse(raw)
      };
    } catch (e) {
      console.error('加载翻译配置失败:', e);
    }
  }

  return defaults;
}

/**
 * 保存配置到localStorage
 */
function saveConfig(config: TranslatorConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * 从localStorage加载历史记录
 */
function loadHistory(): TranslationHistory[] {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('加载翻译历史失败:', e);
    }
  }
  return [];
}

/**
 * 保存历史记录到localStorage
 */
function saveHistory(history: TranslationHistory[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/**
 * 防抖函数
 */
type DebouncedFunction<T extends (...args: any[]) => any> = ((...args: Parameters<T>) => void) & {
  cancel: () => void;
};

function useDebounceFn<T extends (...args: any[]) => any>(fn: T, delay: number): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      void fn(...args);
    }, delay);
  }) as DebouncedFunction<T>;

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = undefined;
  };

  return debounced;
}

/**
 * 翻译功能Composable
 */
export function useTranslator() {
  // 响应式状态
  const inputText = ref('');
  const outputText = ref('');
  const sourceLang = ref<LanguageCode>('auto');
  const targetLang = ref<LanguageCode>('en');
  const isTranslating = ref(false);
  const errorMsg = ref('');
  const translationDuration = ref(0);
  const lastResultFromCache = ref(false);
  let latestTranslationRequestId = 0;

  // 配置（从localStorage加载）
  const config = reactive<TranslatorConfig>(loadConfig());

  // 翻译历史
  const history = ref<TranslationHistory[]>(loadHistory());
  const cacheStats = ref<TranslationCacheStats>(getTranslationCacheStats());
  const quotaStats = ref<TranslationQuotaState>(
    getTranslationQuotaState(config.apiType, config.baiduAppId, config.quotaBaseline)
  );

  const normalizeLanguagePair = () => {
    if (config.defaultTargetLang === 'auto') {
      config.defaultTargetLang = 'zh';
    }
  };

  normalizeLanguagePair();

  // 计算属性：状态消息
  const statusMessage = computed(() => {
    if (isTranslating.value) {
      return '翻译中...';
    }

    if (lastResultFromCache.value) {
      return '翻译完成，来自本地缓存';
    }

    if (translationDuration.value > 0) {
      const seconds = (translationDuration.value / 1000).toFixed(1);
      return `翻译完成，耗时 ${seconds}s`;
    }

    return '等待翻译...';
  });

  // 计算属性：是否可以翻译
  const canTranslate = computed(() => {
    const hasClassicCredentials = Boolean(config.baiduAppId && config.baiduSecretKey);
    const hasLargeModelCredentials = Boolean(
      config.baiduAppId &&
      config.largeModelEndpoint &&
      (
        config.largeModelAuthMode === 'sign'
          ? config.baiduSecretKey
          : config.largeModelApiKey
      )
    );

    return Boolean(
      inputText.value.trim() &&
      (config.apiType === 'large-model' ? hasLargeModelCredentials : hasClassicCredentials) &&
      targetLang.value !== 'auto' &&
      !isTranslating.value
    );
  });

  /**
   * 执行翻译
   */
  const translateText = async () => {
    if (!canTranslate.value) {
      if (isTranslating.value && config.autoTranslate && inputText.value.trim()) {
        debouncedTranslate();
      }
      if (!inputText.value.trim()) {
        errorMsg.value = '请输入要翻译的文本';
      } else if (config.apiType === 'large-model' && !config.baiduAppId) {
        errorMsg.value = '请先在设置页面配置百度翻译 APP ID';
      } else if (config.apiType === 'large-model' && config.largeModelAuthMode !== 'sign' && !config.largeModelApiKey) {
        errorMsg.value = '请先在设置页面配置大模型文本翻译 API Key';
      } else if (config.apiType === 'large-model' && config.largeModelAuthMode === 'sign' && !config.baiduSecretKey) {
        errorMsg.value = '请先在设置页面配置 Secret Key，或切换为 API Key 鉴权';
      } else if (config.apiType !== 'large-model' && (!config.baiduAppId || !config.baiduSecretKey)) {
        errorMsg.value = '请先在设置页面配置百度翻译 APP ID 和 Secret Key';
      } else if (targetLang.value === 'auto') {
        errorMsg.value = '目标语言不能设置为检测语言';
      }
      return;
    }

    isTranslating.value = true;
    errorMsg.value = '';
    translationDuration.value = 0;
    lastResultFromCache.value = false;

    try {
      const text = inputText.value.trim();
      const from = sourceLang.value;
      const to = targetLang.value;
      const requestId = ++latestTranslationRequestId;
      const isCurrentRequest = () =>
        requestId === latestTranslationRequestId &&
        inputText.value.trim() === text &&
        sourceLang.value === from &&
        targetLang.value === to;

      // 如果文本过长，进行拆分翻译
      if (text.length > 2000) {
        const parts = splitText(text);
        const translatedParts: string[] = [];
        let totalDuration = 0;

        for (let i = 0; i < parts.length; i++) {
          // 更新进度提示
          errorMsg.value = `翻译进度: ${i + 1}/${parts.length}`;

          const result = await translate(
            parts[i],
            from,
            to,
            {
              appId: config.baiduAppId,
              secretKey: config.baiduSecretKey,
              domain: config.domain,
              largeModelApiKey: config.largeModelApiKey,
              largeModelEndpoint: config.largeModelEndpoint,
              largeModelModel: config.largeModelModel,
              largeModelAuthMode: config.largeModelAuthMode,
              largeModelModelType: config.largeModelModelType,
              largeModelReference: config.largeModelReference,
              largeModelNeedIntervene: config.largeModelNeedIntervene,
              largeModelTagHandling: config.largeModelTagHandling,
              largeModelIgnoreTags: config.largeModelIgnoreTags,
              largeModelRequestMode: config.largeModelRequestMode,
              apiType: config.apiType,
              quotaBaseline: config.quotaBaseline,
              cacheEnabled: config.cacheEnabled
            }
          );

          if (!isCurrentRequest()) {
            return;
          }

          translatedParts.push(result.text);
          if (result.cached) {
            lastResultFromCache.value = true;
          }
          totalDuration += result.cached ? 0 : result.duration;
        }

        if (!isCurrentRequest()) {
          return;
        }

        outputText.value = translatedParts.join('\n');
        translationDuration.value = totalDuration;
        errorMsg.value = '';
      } else {
        // 短文本直接翻译
        const result = await translate(
          text,
          from,
          to,
          {
            appId: config.baiduAppId,
            secretKey: config.baiduSecretKey,
            domain: config.domain,
            largeModelApiKey: config.largeModelApiKey,
            largeModelEndpoint: config.largeModelEndpoint,
            largeModelModel: config.largeModelModel,
            largeModelAuthMode: config.largeModelAuthMode,
            largeModelModelType: config.largeModelModelType,
            largeModelReference: config.largeModelReference,
            largeModelNeedIntervene: config.largeModelNeedIntervene,
            largeModelTagHandling: config.largeModelTagHandling,
            largeModelIgnoreTags: config.largeModelIgnoreTags,
            largeModelRequestMode: config.largeModelRequestMode,
            apiType: config.apiType,
            quotaBaseline: config.quotaBaseline,
            cacheEnabled: config.cacheEnabled
          }
        );

        if (!isCurrentRequest()) {
          return;
        }

        outputText.value = result.text;
        translationDuration.value = result.cached ? 0 : result.duration;
        lastResultFromCache.value = !!result.cached;
      }

      // 保存到历史记录
      saveToHistory(text, outputText.value);
      refreshCacheStats();
      refreshQuotaStats();
    } catch (error: any) {
      errorMsg.value = error.message || '翻译失败';
      console.error('翻译失败:', error);
    } finally {
      isTranslating.value = false;
    }
  };

  // 防抖翻译（输入时自动触发）
  const debouncedTranslate = useDebounceFn(translateText, AUTO_TRANSLATE_DELAY_MS);

  /**
   * 监听输入文本变化，自动翻译
   */
  watch(
    () => inputText.value,
    (newText) => {
      const hasCredentials = config.apiType === 'large-model'
        ? config.baiduAppId && (
          config.largeModelAuthMode === 'sign'
            ? config.baiduSecretKey
            : config.largeModelApiKey
        )
        : config.baiduAppId && config.baiduSecretKey;

      if (!config.autoTranslate || !newText.trim() || !hasCredentials) {
        debouncedTranslate.cancel();
        return;
      }

      debouncedTranslate();
    }
  );

  /**
   * 交换语言
   */
  const swapLanguages = () => {
    if (sourceLang.value === 'auto') {
      errorMsg.value = '检测语言不能交换为目标语言';
      return;
    }

    const tempLang = sourceLang.value;
    sourceLang.value = targetLang.value;
    targetLang.value = tempLang;

    const tempText = inputText.value;
    inputText.value = outputText.value;
    outputText.value = tempText;
  };

  /**
   * 清空输入
   */
  const clearInput = () => {
    inputText.value = '';
    outputText.value = '';
    errorMsg.value = '';
    translationDuration.value = 0;
    lastResultFromCache.value = false;
  };

  /**
   * 从剪贴板粘贴
   */
  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      inputText.value = text;
    } catch (error) {
      console.error('读取剪贴板失败:', error);
      errorMsg.value = '无法读取剪贴板内容';
    }
  };

  /**
   * 复制结果到剪贴板
   */
  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(outputText.value);
      return true;
    } catch (error) {
      console.error('复制失败:', error);
      errorMsg.value = '复制失败';
      return false;
    }
  };

  /**
   * 保存到历史记录
   */
  const saveToHistory = (source: string, translated: string) => {
    const newRecord: TranslationHistory = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      sourceText: source.slice(0, 200),
      translatedText: translated.slice(0, 200),
      from: sourceLang.value,
      to: targetLang.value
    };

    history.value.unshift(newRecord);

    // 限制历史记录数量
    if (history.value.length > MAX_HISTORY) {
      history.value = history.value.slice(0, MAX_HISTORY);
    }

    saveHistory(history.value);
  };

  /**
   * 重用历史记录
   */
  const reuseHistory = (item: TranslationHistory) => {
    inputText.value = item.sourceText;
    outputText.value = item.translatedText;
    sourceLang.value = item.from;
    targetLang.value = item.to;
  };

  /**
   * 删除单条历史记录
   */
  const deleteHistory = (id: string) => {
    history.value = history.value.filter(item => item.id !== id);
    saveHistory(history.value);
  };

  /**
   * 清空所有历史记录
   */
  const clearHistory = () => {
    history.value = [];
    localStorage.removeItem(HISTORY_KEY);
  };

  /**
   * 格式化时间戳
   */
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  /**
   * 更新配置
   */
  const updateConfig = (newConfig: Partial<TranslatorConfig>) => {
    Object.assign(config, newConfig);
    normalizeLanguagePair();
    saveConfig(config);
    sourceLang.value = config.defaultSourceLang;
    targetLang.value = config.defaultTargetLang;
    refreshQuotaStats();
  };

  /**
   * 重置配置
   */
  const resetConfig = () => {
    const defaultConfig: TranslatorConfig = {
      baiduAppId: '',
      baiduSecretKey: '',
      domain: 'academic',
      largeModelApiKey: '',
      largeModelEndpoint: 'https://fanyi-api.baidu.com/ait/api/aiTextTranslate',
      largeModelModel: 'llm',
      largeModelAuthMode: 'api-key',
      largeModelModelType: 'llm',
      largeModelReference: '',
      largeModelNeedIntervene: false,
      largeModelTagHandling: false,
      largeModelIgnoreTags: '',
      largeModelRequestMode: 'baidu-translate',
      apiType: 'general',
      defaultSourceLang: 'auto',
      defaultTargetLang: 'en',
      autoTranslate: true,
      cacheEnabled: true,
      quotaBaseline: 0
    };
    Object.assign(config, defaultConfig);
    saveConfig(config);
    sourceLang.value = config.defaultSourceLang;
    targetLang.value = config.defaultTargetLang;
    refreshQuotaStats();
  };

  /**
   * 保存自动翻译设置
   */
  const saveAutoTranslateSetting = (value: boolean) => {
    config.autoTranslate = value;
    saveConfig(config);
  };

  const saveCacheSetting = (value: boolean) => {
    config.cacheEnabled = value;
    saveConfig(config);
  };

  const refreshCacheStats = () => {
    cacheStats.value = getTranslationCacheStats();
  };

  const refreshQuotaStats = () => {
    quotaStats.value = getTranslationQuotaState(
      config.apiType,
      config.baiduAppId,
      config.quotaBaseline
    );
  };

  const clearCache = () => {
    clearTranslationCache();
    refreshCacheStats();
  };

  const resetQuotaUsage = () => {
    resetTranslationQuotaUsage(config.apiType, config.baiduAppId);
    refreshQuotaStats();
  };

  const testTranslationConfig = async () => {
    const result = await translate('hello', 'en', 'zh', {
      appId: config.baiduAppId,
      secretKey: config.baiduSecretKey,
      domain: config.domain,
      largeModelApiKey: config.largeModelApiKey,
      largeModelEndpoint: config.largeModelEndpoint,
      largeModelModel: config.largeModelModel,
      largeModelAuthMode: config.largeModelAuthMode,
      largeModelModelType: config.largeModelModelType,
      largeModelReference: config.largeModelReference,
      largeModelNeedIntervene: config.largeModelNeedIntervene,
      largeModelTagHandling: config.largeModelTagHandling,
      largeModelIgnoreTags: config.largeModelIgnoreTags,
      largeModelRequestMode: config.largeModelRequestMode,
      apiType: config.apiType,
      quotaBaseline: config.quotaBaseline,
      cacheEnabled: false
    });

    refreshQuotaStats();
    return result;
  };

  sourceLang.value = config.defaultSourceLang;
  targetLang.value = config.defaultTargetLang;

  return {
    // 状态
    inputText,
    outputText,
    sourceLang,
    targetLang,
    isTranslating,
    errorMsg,
    translationDuration,
    lastResultFromCache,
    config,
    history,
    cacheStats,
    quotaStats,

    // 计算属性
    statusMessage,
    canTranslate,

    // 方法
    translateText,
    swapLanguages,
    clearInput,
    pasteFromClipboard,
    copyResult,
    reuseHistory,
    deleteHistory,
    clearHistory,
    formatTime,
    updateConfig,
    resetConfig,
    saveAutoTranslateSetting,
    saveCacheSetting,
    refreshCacheStats,
    refreshQuotaStats,
    clearCache,
    resetQuotaUsage,
    testTranslationConfig,

    // 工具函数
    getLanguageLabel
  };
}
