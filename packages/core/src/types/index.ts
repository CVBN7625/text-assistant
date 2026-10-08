// 核心类型定义

// 处理器类别
export type ProcessorCategory = 'cleanup' | 'conversion' | 'enhancement' | 'translation';
export type UiSkin = 'classic' | 'sunflower';
export type OcrModel = 'general-basic' | 'general-fast' | 'general-accurate' | 'english';
export type QuickActionPresetName = 'clean-all' | 'full-to-half' | 'remove-refs' | 'add-space';

export interface QuickActionConfig {
  id: string;
  enabled: boolean;
  name?: string;
  presetName?: QuickActionPresetName;
  processorIds: string[];
  customRuleIds: string[];
}

// 处理上下文
export interface ProcessingContext {
  source: 'clipboard' | 'selection' | 'manual';
  language?: string;
  customRules?: CustomRule[];
  translationConfig?: ProcessorConfig['translation'];
  translateText?: (
    text: string,
    from: string,
    to: string,
    translationConfig: ProcessorConfig['translation']
  ) => Promise<string>;
}

// 自定义规则
export type CustomRuleType = 'regex' | 'text' | 'delete';
export type CustomRuleExecutionStage = 'before-processors' | 'after-processors';

export interface CustomRule {
  id: string;
  name: string;
  description?: string;
  type?: CustomRuleType;
  stage?: CustomRuleExecutionStage;
  pattern: string;
  replacement: string;
  flags?: string;
  isActive: boolean;
  priority?: number;
  createdAt?: number;
  updatedAt?: number;
}

// 文本处理器接口
export interface TextProcessor {
  id: string;
  name: string;
  description: string;
  category: ProcessorCategory;
  isActive: boolean;
  priority: number;
  execute: (text: string, context?: ProcessingContext) => string | Promise<string>;
}

// 处理选项
export interface ProcessingOptions {
  processors?: string[];
  context?: ProcessingContext;
}

// 处理结果
export interface ProcessingResult {
  text: string;
  originalText: string;
  processorsUsed: string[];
  processingTime: number;
}

// 处理器配置
export interface ProcessorConfig {
  quickActions: QuickActionConfig[];
  processors: {
    [processorId: string]: {
      isActive: boolean;
      priority: number;
      customSettings?: Record<string, any>;
    };
  };
  shortcuts: {
    processSelection: string;
    processClipboard: string;
    quickClean: string;
  };
  translation: {
    defaultEngine: 'baidu' | 'google' | 'deepl';
    apiKeys: {
      baidu?: {
        appId: string;
        secretKey: string;
        apiType?: 'general' | 'large-model' | 'domain' | 'image';
        domain?: string;
        largeModelApiKey?: string;
        largeModelEndpoint?: string;
        largeModelModel?: string;
        largeModelAuthMode?: 'api-key' | 'sign';
        largeModelModelType?: 'llm' | 'nmt';
        largeModelReference?: string;
        largeModelNeedIntervene?: boolean;
        largeModelTagHandling?: boolean;
        largeModelIgnoreTags?: string;
        largeModelRequestMode?: 'baidu-translate' | 'openai-compatible';
        quotaBaseline?: number;
        imageCuid?: string;
        imageMac?: string;
        imageEndpoint?: string;
        imageQuotaBaseline?: number;
      };
      google?: { apiKey: string };
      deepl?: { apiKey: string };
    };
    defaultSourceLang: string;
    defaultTargetLang: string;
    autoTranslate?: boolean;
    cacheEnabled?: boolean;
    quotaBaseline?: number;
  };
  ocr: {
    engine: 'tencent';
    model: OcrModel;
    tencent?: {
      secretId: string;
      secretKey: string;
      region?: string;
      basicQuotaBaseline: number;
      fastQuotaBaseline: number;
      accurateMonthlyLimit: number;
      accurateQuotaBaseline: number;
      englishQuotaBaseline: number;
    };
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    skin?: UiSkin;
    language: string;
    showNotifications: boolean;
    autoProcessClipboard: boolean;
    floatingMenuEnabled: boolean;
    selectionAutomationEnabled?: boolean;
    selectionAutoProcessEnabled?: boolean;
    selectionAutoTranslateEnabled?: boolean;
    selectionActionMaxLength?: number;
    selectionAutoTranslateMaxLength?: number;
    historyRetentionMode?: 'day' | 'week' | 'month' | 'count';
    historyRetentionCount?: number;
  };
}

// 历史记录条目
export interface HistoryEntry {
  id: string;
  timestamp: number;
  originalText: string;
  processedText: string;
  processorsUsed: string[];
  source: 'clipboard' | 'selection' | 'manual';
  metadata?: {
    url?: string;
    pageTitle?: string;
    processingTime?: number;
  };
}

// 核心处理引擎接口
export interface TextProcessorCoreInterface {
  registerProcessor(processor: TextProcessor): void;
  unregisterProcessor(processorId: string): void;
  process(text: string, options?: ProcessingOptions): ProcessingResult;
  processAsync(text: string, options?: ProcessingOptions): Promise<ProcessingResult>;
  processWithChain(text: string, processorIds: string[]): ProcessingResult;
  getProcessor(id: string): TextProcessor | undefined;
  getProcessorsByCategory(category: ProcessorCategory): TextProcessor[];
  loadConfig(config: ProcessorConfig): void;
  exportConfig(): ProcessorConfig;
  addToHistory(entry: HistoryEntry): void;
  loadHistory(entries: HistoryEntry[]): void;
  getHistory(limit?: number): HistoryEntry[];
  clearHistory(): void;
}
