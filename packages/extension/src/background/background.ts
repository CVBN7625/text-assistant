import { TextProcessorCore, allProcessors, defaultConfig } from '@clipboard-processor/core';
import type { HistoryEntry, ProcessingOptions, ProcessorConfig, ProcessingResult } from '@clipboard-processor/core';
import type { CustomRule } from '@clipboard-processor/core';
import { toPageMetadata, type PageMetadata, type TabMetadata } from '../shared/page-metadata';
import {
  clearTranslationCache,
  getQuotaStateForConfig,
  resetQuotaForConfig,
  translateConfiguredText,
  translateImageFromDataUrl,
  type ImageTranslationResult,
  type TextTranslationResult
} from './baidu-translation-service';
import { processTextWithAi, testAiProfile } from './ai-processing-service';
import {
  AI_PROFILES_STORAGE_KEY,
  AI_RULES_STORAGE_KEY,
  normalizeAiProfiles,
  normalizeAiRules,
  type AiApiProfile,
  type AiProcessingRule
} from '../shared/ai-processing-types';
import {
  CUSTOM_RULES_STORAGE_KEY,
  applyCustomRules,
  normalizeCustomRules
} from '../shared/custom-rules';
import { normalizeQuickActions } from '../shared/quick-actions';
import { executeQuickActionPipeline, type SkippedQuickActionItem } from '../shared/quick-action-execution';
import {
  getOcrQuotaState,
  recognizeImage,
  resetOcrQuota,
  testOcrConfig,
  type OcrResult
} from './tencent-ocr-service';

type ProcessorConfigPatch = {
  quickActions?: ProcessorConfig['quickActions'];
  processors?: ProcessorConfig['processors'];
  translation?: Partial<Omit<ProcessorConfig['translation'], 'apiKeys'>>;
  ocr?: Partial<ProcessorConfig['ocr']>;
  ui?: Partial<ProcessorConfig['ui']>;
};

type RuntimeMessage =
  | { type: 'PROCESS_TEXT'; text: string; options?: ProcessingOptions }
  | { type: 'RUN_QUICK_ACTION'; actionId: string; text: string }
  | { type: 'COPY_TEXT'; text: string }
  | { type: 'TRANSLATE_TEXT'; text: string; from?: string; to?: string }
  | { type: 'TRANSLATE_IMAGE'; dataUrl: string; from?: string; to?: string }
  | { type: 'OCR_IMAGE'; dataUrl: string; sourceName?: string }
  | { type: 'START_SCREENSHOT_IMAGE_TRANSLATION'; from?: string; to?: string }
  | { type: 'START_SCREENSHOT_OCR' }
  | { type: 'SCREENSHOT_SELECTION_COMPLETE'; sessionId: string; selection: ScreenshotSelectionResult }
  | { type: 'GET_LAST_SCREENSHOT_IMAGE_TRANSLATION' }
  | { type: 'GET_LAST_OCR_RESULT' }
  | { type: 'GET_COPY_UNLOCK_STATE' }
  | { type: 'SET_COPY_UNLOCK_STATE'; enabled: boolean }
  | { type: 'GET_CONFIG' }
  | { type: 'SAVE_CONFIG'; config: ProcessorConfig }
  | { type: 'UPDATE_CONFIG'; patch: ProcessorConfigPatch }
  | { type: 'GET_HISTORY'; limit?: number }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'GET_CUSTOM_RULES' }
  | { type: 'SAVE_CUSTOM_RULES'; rules: CustomRule[] }
  | { type: 'GET_AI_RULES' }
  | { type: 'SAVE_AI_RULES'; rules: AiProcessingRule[] }
  | { type: 'GET_AI_PROFILES' }
  | { type: 'SAVE_AI_PROFILES'; profiles: AiApiProfile[] }
  | { type: 'TEST_AI_PROFILE'; profile: AiApiProfile }
  | { type: 'TEST_AI_RULE'; text: string; ruleId: string }
  | { type: 'AI_PROCESS_TEXT'; text: string; ruleId: string }
  | { type: 'GET_TRANSLATION_QUOTA'; apiType?: 'general' | 'large-model' | 'domain' | 'image' }
  | { type: 'RESET_TRANSLATION_QUOTA'; apiType?: 'general' | 'large-model' | 'domain' | 'image' }
  | { type: 'GET_OCR_QUOTA'; model?: ProcessorConfig['ocr']['model'] }
  | { type: 'RESET_OCR_QUOTA'; model?: ProcessorConfig['ocr']['model'] }
  | { type: 'TEST_OCR_CONFIG'; config?: ProcessorConfig['ocr'] }
  | { type: 'CLEAR_TRANSLATION_CACHE' };

type ScreenshotRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ScreenshotSelectionResult = {
  cancelled?: boolean;
  rect?: ScreenshotRect;
  viewport?: {
    width: number;
    height: number;
  };
  devicePixelRatio?: number;
};

type ScreenshotCropResult = {
  dataUrl: string;
  clipboardWritten: boolean;
};

type StoredScreenshotImageTranslation = {
  timestamp: number;
  pageTitle?: string;
  pageUrl?: string;
  sourceText: string;
  translatedText: string;
  imageUrl?: string;
  from: string;
  to: string;
  duration: number;
  clipboardWritten: boolean;
  error?: string;
};

type PendingScreenshotImageTranslation = {
  taskType?: 'image-translation' | 'ocr';
  sessionId: string;
  tabId: number;
  windowId: number;
  from?: string;
  to?: string;
  pageTitle?: string;
  pageUrl?: string;
  timestamp: number;
};

type StoredOcrResult = OcrResult & {
  timestamp: number;
  pageTitle?: string;
  pageUrl?: string;
  sourceName: string;
  clipboardWritten: boolean;
  error?: string;
};

const processorCore = new TextProcessorCore();
const CONFIG_STORAGE_KEY = 'processorConfig';
const HISTORY_STORAGE_KEY = 'processingHistory';
const LAST_SCREENSHOT_TRANSLATION_KEY = 'lastScreenshotImageTranslation';
const PENDING_SCREENSHOT_TRANSLATION_KEY = 'pendingScreenshotImageTranslation';
const LAST_OCR_RESULT_KEY = 'lastOcrResult';
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
const SCREENSHOT_TASK_TTL_MS = 10 * 60 * 1000;
const MAX_STORED_HISTORY = 500;

const backgroundMessages = {
  'zh-CN': {
    menuProcessSelection: '处理选中文字',
    menuCopyAndProcess: '复制处理结果',
    menuTranslateSelection: '翻译选中文字',
    menuCopyTranslation: '复制译文',
    menuTranslateImage: '翻译图片',
    unknownMessageType: '未知消息类型',
    cannotGetCurrentTab: '无法获取当前标签页',
    internalPageNotSupported: '浏览器内部页面不支持截图翻译，请切换到普通网页后再试',
    copyUnlockUnsupported: '当前页面不支持解除复制限制，请切换到普通网页后再试',
    screenshotTranslation: '截图翻译',
    dragToSelectImageArea: '请在页面中拖拽选择要翻译的区域',
    cannotStartScreenshotSelection: '无法启动截图框选',
    screenshotCancelled: '已取消截图翻译',
    screenshotCropMissingData: '截图裁剪失败，未获得图片数据',
    screenshotImageDone: '图片截图翻译完成',
    screenshotCopiedResultInPopup: '截图已复制到剪贴板，翻译结果可在插件弹窗查看',
    screenshotClipboardMaybeLimited: '翻译完成；截图复制到剪贴板可能被当前页面权限限制',
    screenshotImageFailed: '图片截图翻译失败',
    textProcessDone: '文本处理完成',
    processorsApplied: '已应用 {count} 个处理器',
    copiedProcessResult: '已复制处理结果',
    processedTextCopied: '处理后的文字已复制到剪切板',
    translateDone: '翻译完成',
    cachedTranslationReplaced: '已用缓存译文替换选区',
    translationReplaced: '已替换选区文字',
    cachedTranslationCopied: '缓存译文已复制到剪切板',
    translationCopied: '译文已复制到剪切板',
    translateFailed: '翻译失败',
    imageTranslateDone: '图片翻译完成',
    imageTextCopied: '识别译文已复制到剪切板',
    imageUrlCopied: '译图地址已复制到剪切板',
    imageTranslateFailed: '图片翻译失败',
    screenshotFailedNoData: '截图失败，未获得图片数据',
    screenshotTaskExpired: '截图任务已过期，请重新开始截图翻译',
    screenshotTaskTimeout: '截图任务已超时，请重新开始截图翻译',
    offscreenUnsupported: '当前浏览器不支持 offscreen clipboard 写入',
    clipboardWriteFailed: '写入剪切板失败'
  },
  'en-US': {
    menuProcessSelection: 'Process selected text',
    menuCopyAndProcess: 'Copy processed result',
    menuTranslateSelection: 'Translate selected text',
    menuCopyTranslation: 'Copy translation',
    menuTranslateImage: 'Translate image',
    unknownMessageType: 'Unknown message type',
    cannotGetCurrentTab: 'Unable to get the current tab',
    internalPageNotSupported: 'Browser internal pages do not support screenshot translation. Switch to a normal web page and try again.',
    copyUnlockUnsupported: 'Copy unlocking is unavailable on this page. Switch to a normal web page and try again.',
    screenshotTranslation: 'Screenshot translation',
    dragToSelectImageArea: 'Drag on the page to select the area to translate',
    cannotStartScreenshotSelection: 'Unable to start screenshot selection',
    screenshotCancelled: 'Screenshot translation cancelled',
    screenshotCropMissingData: 'Screenshot crop failed: no image data returned',
    screenshotImageDone: 'Screenshot image translation complete',
    screenshotCopiedResultInPopup: 'Screenshot copied to clipboard. View the translation result in the extension popup.',
    screenshotClipboardMaybeLimited: 'Translation complete. Copying the screenshot to clipboard may be limited by the current page permissions.',
    screenshotImageFailed: 'Screenshot image translation failed',
    textProcessDone: 'Text processing complete',
    processorsApplied: 'Applied {count} processors',
    copiedProcessResult: 'Processed result copied',
    processedTextCopied: 'Processed text copied to clipboard',
    translateDone: 'Translation complete',
    cachedTranslationReplaced: 'Cached translation replaced the selection',
    translationReplaced: 'Selection replaced with translation',
    cachedTranslationCopied: 'Cached translation copied to clipboard',
    translationCopied: 'Translation copied to clipboard',
    translateFailed: 'Translation failed',
    imageTranslateDone: 'Image translation complete',
    imageTextCopied: 'Recognized translation copied to clipboard',
    imageUrlCopied: 'Translated image URL copied to clipboard',
    imageTranslateFailed: 'Image translation failed',
    screenshotFailedNoData: 'Screenshot failed: no image data returned',
    screenshotTaskExpired: 'Screenshot task expired. Start screenshot translation again.',
    screenshotTaskTimeout: 'Screenshot task timed out. Start screenshot translation again.',
    offscreenUnsupported: 'This browser does not support offscreen clipboard writing',
    clipboardWriteFailed: 'Failed to write to clipboard'
  }
} as const;

allProcessors.forEach(processor => {
  processorCore.registerProcessor(processor);
});

let activeConfig: ProcessorConfig = mergeConfig();
let configReady = initializeExtensionState();
let creatingOffscreenDocument: Promise<void> | null = null;
let historyMutationVersion = 0;
let customRules: CustomRule[] = [];
let aiRules: AiProcessingRule[] = [];
let aiProfiles: AiApiProfile[] = [];
const copyUnlockedTabs = new Set<number>();

function getBackgroundText(): (typeof backgroundMessages)[keyof typeof backgroundMessages] {
  return activeConfig.ui.language === 'en-US'
    ? backgroundMessages['en-US']
    : backgroundMessages['zh-CN'];
}

chrome.runtime.onInstalled.addListener(() => {
  createContextMenus();
  console.log('Clipboard Text Processor installed');
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  void handleContextMenuClick(info, tab);
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'process-selection') {
    void processCurrentSelection();
  } else if (command === 'process-clipboard') {
    void processClipboardAndPaste();
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    copyUnlockedTabs.delete(tabId);
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  copyUnlockedTabs.delete(tabId);
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage | { type?: string }, sender, sendResponse) => {
  if (message.type === 'OFFSCREEN_WRITE_IMAGE_TO_CLIPBOARD') {
    return false;
  }

  void handleRuntimeMessage(message as RuntimeMessage, sender)
    .then(response => sendResponse(response))
    .catch(error => sendResponse({ success: false, error: getErrorMessage(error) }));

  return true;
});

function createContextMenus(): void {
  const text = getBackgroundText();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'process-selection',
      title: text.menuProcessSelection,
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'copy-and-process',
      title: text.menuCopyAndProcess,
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'translate-selection',
      title: text.menuTranslateSelection,
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'copy-translation',
      title: text.menuCopyTranslation,
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'translate-image',
      title: text.menuTranslateImage,
      contexts: ['image']
    });

    chrome.contextMenus.create({
      id: 'ocr-image',
      title: activeConfig.ui.language === 'en-US' ? 'Recognize image text' : '识别图片文字',
      contexts: ['image']
    });
  });
}

async function handleRuntimeMessage(message: RuntimeMessage, sender: chrome.runtime.MessageSender) {
  await ensureConfigReady();

  switch (message.type) {
    case 'PROCESS_TEXT': {
      const result = await processText(message.text, message.options);
      return { success: true, result };
    }
    case 'RUN_QUICK_ACTION': {
      const response = await runQuickAction(message.actionId, message.text);
      return { success: true, ...response };
    }
    case 'COPY_TEXT':
      await writeToClipboard(message.text, sender.tab?.id);
      return { success: true };
    case 'TRANSLATE_TEXT': {
      const result = await translateText(message.text, message.from, message.to);
      await addHistory(message.text, result.text, ['translate-text'], 'manual', sender.tab);
      return { success: true, result };
    }
    case 'TRANSLATE_IMAGE': {
      const result = await translateImage(message.dataUrl, message.from, message.to);
      return { success: true, result };
    }
    case 'OCR_IMAGE': {
      const result = await runOcr(message.dataUrl, message.sourceName || '[OCR uploaded image]', sender.tab);
      return { success: true, result };
    }
    case 'START_SCREENSHOT_IMAGE_TRANSLATION': {
      const pending = await startScreenshotImageTranslation(message.from, message.to);
      return { success: true, started: true, sessionId: pending.sessionId };
    }
    case 'START_SCREENSHOT_OCR': {
      const pending = await startScreenshotOcr();
      return { success: true, started: true, sessionId: pending.sessionId };
    }
    case 'SCREENSHOT_SELECTION_COMPLETE': {
      const result = await completeScreenshotImageTranslation(message.sessionId, message.selection);
      return { success: true, result };
    }
    case 'GET_LAST_SCREENSHOT_IMAGE_TRANSLATION':
      return { success: true, result: await getLastScreenshotImageTranslation() };
    case 'GET_LAST_OCR_RESULT':
      return { success: true, result: await getLastOcrResult() };
    case 'GET_COPY_UNLOCK_STATE': {
      const tab = await getCurrentTab();
      return { success: true, enabled: await getCopyUnlockForTab(tab.id!) };
    }
    case 'SET_COPY_UNLOCK_STATE': {
      const tab = await getCurrentTab();
      await setCopyUnlockForTab(tab.id!, message.enabled);
      return { success: true, enabled: await getCopyUnlockForTab(tab.id!) };
    }
    case 'GET_CONFIG':
      return { success: true, config: activeConfig };
    case 'SAVE_CONFIG': {
      const config = await saveStoredConfig(message.config);
      return { success: true, config };
    }
    case 'UPDATE_CONFIG': {
      const config = await updateStoredConfig(message.patch);
      return { success: true, config };
    }
    case 'GET_HISTORY':
      await persistCurrentHistory();
      return { success: true, history: processorCore.getHistory(message.limit) };
    case 'CLEAR_HISTORY':
      historyMutationVersion += 1;
      processorCore.clearHistory();
      await chrome.storage.local.set({ [HISTORY_STORAGE_KEY]: [] });
      return { success: true };
    case 'GET_CUSTOM_RULES':
      return { success: true, rules: customRules };
    case 'SAVE_CUSTOM_RULES':
      customRules = normalizeCustomRules(message.rules);
      await chrome.storage.local.set({ [CUSTOM_RULES_STORAGE_KEY]: customRules });
      return { success: true, rules: customRules };
    case 'GET_AI_RULES':
      return { success: true, rules: aiRules };
    case 'SAVE_AI_RULES':
      aiRules = normalizeAiRules(message.rules);
      await chrome.storage.local.set({ [AI_RULES_STORAGE_KEY]: aiRules });
      return { success: true, rules: aiRules };
    case 'GET_AI_PROFILES':
      return { success: true, profiles: aiProfiles };
    case 'SAVE_AI_PROFILES':
      aiProfiles = normalizeAiProfiles(message.profiles);
      await chrome.storage.local.set({ [AI_PROFILES_STORAGE_KEY]: aiProfiles });
      return { success: true, profiles: aiProfiles };
    case 'TEST_AI_PROFILE':
      return { success: true, result: await testAiProfile(normalizeAiProfiles([message.profile])[0]) };
    case 'TEST_AI_RULE':
      return { success: true, result: await runAiRule(message.text, message.ruleId) };
    case 'AI_PROCESS_TEXT': {
      try {
        const { text: result, rule } = await runAiRule(message.text, message.ruleId);
        await addHistory(message.text, result, [`ai-rule:${rule.id}`], 'manual', sender.tab);
        return { success: true, result: { text: result, ruleId: rule.id, ruleName: rule.name } };
      } catch (error) {
        notify('AI 处理失败', getErrorMessage(error));
        throw error;
      }
    }
    case 'GET_TRANSLATION_QUOTA': {
      const config = await getStoredConfig();
      const apiType = message.apiType || config.translation.apiKeys.baidu?.apiType || 'general';
      return {
        success: true,
        quota: await getQuotaStateForConfig(apiType, config.translation)
      };
    }
    case 'RESET_TRANSLATION_QUOTA': {
      const config = await getStoredConfig();
      const apiType = message.apiType || config.translation.apiKeys.baidu?.apiType || 'general';
      await resetQuotaForConfig(apiType, config.translation);
      return { success: true };
    }
    case 'GET_OCR_QUOTA':
      return { success: true, quota: await getOcrQuotaState(activeConfig.ocr, message.model || activeConfig.ocr.model) };
    case 'RESET_OCR_QUOTA':
      await resetOcrQuota(message.model || activeConfig.ocr.model);
      return { success: true };
    case 'TEST_OCR_CONFIG':
      return { success: true, result: await testOcrConfig(message.config || activeConfig.ocr) };
    case 'CLEAR_TRANSLATION_CACHE':
      await clearTranslationCache();
      return { success: true };
    default:
      return { success: false, error: getBackgroundText().unknownMessageType };
  }
}

async function getCurrentTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error(getBackgroundText().cannotGetCurrentTab);
  }
  if (!isScriptablePage(tab.url)) {
    throw new Error(getBackgroundText().copyUnlockUnsupported);
  }
  return tab;
}

function isScriptablePage(url?: string): boolean {
  if (!url) {
    return false;
  }

  return /^(https?|file):/i.test(url);
}

async function setCopyUnlockForTab(tabId: number, enabled: boolean): Promise<void> {
  if (enabled) {
    await chrome.scripting.insertCSS({
      target: { tabId, allFrames: true },
      files: ['copy-unlock.css'],
      origin: 'USER'
    });
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['copy-unlock.js'],
      injectImmediately: true
    });
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['copy-unlock-main.js'],
      injectImmediately: true,
      world: 'MAIN'
    });
    copyUnlockedTabs.add(tabId);
    return;
  }

  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: releaseCopyUnlock,
    injectImmediately: true
  });
  await chrome.scripting.removeCSS({
    target: { tabId, allFrames: true },
    files: ['copy-unlock.css'],
    origin: 'USER'
  });
  copyUnlockedTabs.delete(tabId);
}

async function getCopyUnlockForTab(tabId: number): Promise<boolean> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: isCopyUnlockActive,
    injectImmediately: true
  });
  const enabled = results.some(result => result.result === true);
  if (enabled) {
    copyUnlockedTabs.add(tabId);
  } else {
    copyUnlockedTabs.delete(tabId);
  }
  return enabled;
}

function isCopyUnlockActive(): boolean {
  return Boolean((window as Window & { __ctpCopyUnlockState?: unknown }).__ctpCopyUnlockState);
}

function releaseCopyUnlock(): void {
  document.documentElement?.dispatchEvent(new Event('ctp-copy-unlock-release'));
}

async function runAiRule(text: string, ruleId: string): Promise<{ text: string; rule: AiProcessingRule }> {
  const rule = aiRules.find(item => item.id === ruleId && item.isActive);
  if (!rule) throw new Error('未找到已启用的 AI 处理要求');
  const profile = aiProfiles.find(item => item.id === rule.profileId);
  if (!profile) throw new Error('AI 处理要求绑定的 API 配置不存在');
  return { text: await processTextWithAi(text, rule, profile), rule };
}

async function handleContextMenuClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): Promise<void> {
  await ensureConfigReady();

  if (info.menuItemId === 'process-selection' && info.selectionText) {
    await processSelectedText(info.selectionText, tab);
  } else if (info.menuItemId === 'copy-and-process' && info.selectionText) {
    await copyAndProcess(info.selectionText, tab);
  } else if (info.menuItemId === 'translate-selection' && info.selectionText) {
    await translateSelectedText(info.selectionText, tab, true);
  } else if (info.menuItemId === 'copy-translation' && info.selectionText) {
    await translateSelectedText(info.selectionText, tab, false);
  } else if (info.menuItemId === 'translate-image' && tab?.id && info.srcUrl) {
    await translateImageFromPage(info.srcUrl, tab);
  } else if (info.menuItemId === 'ocr-image' && tab?.id && info.srcUrl) {
    await ocrImageFromPage(info.srcUrl, tab);
  }
}

function mergeConfig(config?: Partial<ProcessorConfig>): ProcessorConfig {
  return {
    ...defaultConfig,
    ...config,
    quickActions: normalizeQuickActions(config?.quickActions),
    processors: {
      ...defaultConfig.processors,
      ...config?.processors
    },
    shortcuts: {
      ...defaultConfig.shortcuts,
      ...config?.shortcuts
    },
    translation: {
      ...defaultConfig.translation,
      ...config?.translation,
      apiKeys: {
        ...defaultConfig.translation.apiKeys,
        ...config?.translation?.apiKeys
      }
    },
    ocr: {
      ...defaultConfig.ocr,
      ...config?.ocr,
      tencent: {
        ...defaultConfig.ocr.tencent!,
        ...config?.ocr?.tencent
      }
    },
    ui: {
      ...defaultConfig.ui,
      ...config?.ui,
      selectionAutomationEnabled: config?.ui?.selectionAutomationEnabled ??
        config?.ui?.selectionAutoTranslateEnabled ??
        defaultConfig.ui.selectionAutomationEnabled,
      selectionAutoProcessEnabled: config?.ui?.selectionAutoProcessEnabled ?? defaultConfig.ui.selectionAutoProcessEnabled,
      selectionAutoTranslateEnabled: config?.ui?.selectionAutoTranslateEnabled ?? defaultConfig.ui.selectionAutoTranslateEnabled,
      selectionActionMaxLength: config?.ui?.selectionActionMaxLength ??
        config?.ui?.selectionAutoTranslateMaxLength ??
        defaultConfig.ui.selectionActionMaxLength,
      selectionAutoTranslateMaxLength: config?.ui?.selectionAutoTranslateMaxLength ??
        config?.ui?.selectionActionMaxLength ??
        defaultConfig.ui.selectionAutoTranslateMaxLength,
      historyRetentionMode: config?.ui?.historyRetentionMode ?? defaultConfig.ui.historyRetentionMode,
      historyRetentionCount: config?.ui?.historyRetentionCount ?? defaultConfig.ui.historyRetentionCount,
      skin: normalizeSkin(config?.ui?.skin)
    }
  };
}

function normalizeSkin(skin: unknown): ProcessorConfig['ui']['skin'] {
  return skin === 'sunflower' ? 'sunflower' : 'classic';
}

async function getStoredConfig(): Promise<ProcessorConfig> {
  const stored = await chrome.storage.local.get(CONFIG_STORAGE_KEY);
  return mergeConfig(stored[CONFIG_STORAGE_KEY]);
}

async function saveStoredConfig(config: ProcessorConfig): Promise<ProcessorConfig> {
  const nextConfig = mergeConfig(config);

  await chrome.storage.local.set({
    [CONFIG_STORAGE_KEY]: nextConfig
  });

  activeConfig = nextConfig;
  processorCore.loadConfig(activeConfig);
  await persistCurrentHistory();
  createContextMenus();

  return activeConfig;
}

async function updateStoredConfig(patch: ProcessorConfigPatch): Promise<ProcessorConfig> {
  const nextConfig = mergeConfig({
    ...activeConfig,
    quickActions: patch.quickActions ?? activeConfig.quickActions,
    processors: {
      ...activeConfig.processors,
      ...patch.processors
    },
    translation: {
      ...activeConfig.translation,
      ...patch.translation,
      apiKeys: activeConfig.translation.apiKeys
    },
    ocr: {
      ...activeConfig.ocr,
      ...patch.ocr,
      tencent: patch.ocr?.tencent
        ? { ...activeConfig.ocr.tencent!, ...patch.ocr.tencent }
        : activeConfig.ocr.tencent
    },
    ui: {
      ...activeConfig.ui,
      ...patch.ui
    }
  });

  await chrome.storage.local.set({
    [CONFIG_STORAGE_KEY]: nextConfig
  });

  activeConfig = nextConfig;
  processorCore.loadConfig(activeConfig);
  if (patch.ui?.language) {
    createContextMenus();
  }

  return activeConfig;
}

async function loadStoredConfig(): Promise<void> {
  activeConfig = await getStoredConfig();
  processorCore.loadConfig(activeConfig);
}

async function initializeStoredConfig(): Promise<void> {
  try {
    await loadStoredConfig();
  } catch (error) {
    console.warn('Failed to load extension config, using defaults:', error);
    activeConfig = mergeConfig();
    processorCore.loadConfig(activeConfig);
  }
}

async function initializeExtensionState(): Promise<void> {
  await initializeStoredConfig();
  await loadRuleState();
  await loadStoredHistory();
}

async function loadRuleState(): Promise<void> {
  const stored = await chrome.storage.local.get([
    CUSTOM_RULES_STORAGE_KEY,
    AI_RULES_STORAGE_KEY,
    AI_PROFILES_STORAGE_KEY
  ]);
  customRules = normalizeCustomRules(stored[CUSTOM_RULES_STORAGE_KEY]);
  aiRules = normalizeAiRules(stored[AI_RULES_STORAGE_KEY]);
  aiProfiles = normalizeAiProfiles(stored[AI_PROFILES_STORAGE_KEY]);
}

async function ensureConfigReady(): Promise<void> {
  await configReady;
}

async function loadStoredHistory(): Promise<void> {
  const stored = await chrome.storage.local.get(HISTORY_STORAGE_KEY);
  const rawHistory = Array.isArray(stored[HISTORY_STORAGE_KEY])
    ? stored[HISTORY_STORAGE_KEY]
    : [];
  const entries = rawHistory.filter(isHistoryEntry);
  processorCore.loadHistory(applyHistoryRetention(entries));
  await persistCurrentHistory();
}

async function persistCurrentHistory(version = historyMutationVersion): Promise<void> {
  const entries = applyHistoryRetention(processorCore.getHistory());
  processorCore.loadHistory(entries);
  if (version !== historyMutationVersion) {
    return;
  }
  await chrome.storage.local.set({
    [HISTORY_STORAGE_KEY]: entries
  });
}

function applyHistoryRetention(entries: HistoryEntry[]): HistoryEntry[] {
  const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);
  const mode = activeConfig.ui.historyRetentionMode ?? defaultConfig.ui.historyRetentionMode ?? 'count';
  const count = Math.max(1, activeConfig.ui.historyRetentionCount ?? defaultConfig.ui.historyRetentionCount ?? 50);

  if (mode === 'day' || mode === 'week' || mode === 'month') {
    const durationMs = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    }[mode];
    return sortedEntries
      .filter(entry => entry.timestamp >= Date.now() - durationMs)
      .slice(0, MAX_STORED_HISTORY);
  }

  return sortedEntries.slice(0, count);
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as Partial<HistoryEntry>;
  return typeof entry.id === 'string' &&
    typeof entry.timestamp === 'number' &&
    typeof entry.originalText === 'string' &&
    typeof entry.processedText === 'string' &&
    Array.isArray(entry.processorsUsed) &&
    (entry.source === 'clipboard' || entry.source === 'selection' || entry.source === 'manual');
}

async function processText(text: string, options?: ProcessingOptions): Promise<ProcessingResult> {
  const startTime = performance.now();
  const context = {
    source: options?.context?.source || 'manual',
    ...options?.context,
    translationConfig: activeConfig.translation,
    translateText: async (
      input: string,
      from: string,
      to: string,
      translationConfig: ProcessorConfig['translation']
    ) => (await translateConfiguredText(input, from, to, translationConfig)).text
  } satisfies ProcessingOptions['context'];

  const beforeRules = applyCustomRules(text, customRules, 'before-processors');
  const processorResult = await processorCore.processAsync(beforeRules.text, {
    ...options,
    context
  });
  const afterRules = applyCustomRules(processorResult.text, customRules, 'after-processors');
  const customRuleIds = [...beforeRules.matches, ...afterRules.matches].map(match => `custom-rule:${match.ruleId}`);
  const result: ProcessingResult = {
    text: afterRules.text,
    originalText: text,
    processorsUsed: [...processorResult.processorsUsed, ...customRuleIds],
    processingTime: performance.now() - startTime
  };

  await addHistory(text, result.text, result.processorsUsed, context.source);
  return result;
}

async function runQuickAction(
  actionId: string,
  text: string
): Promise<{ result: ProcessingResult; skippedItems: SkippedQuickActionItem[] }> {
  const action = activeConfig.quickActions.find(item => item.id === actionId && item.enabled);
  if (!action) {
    throw new Error(activeConfig.ui.language === 'en-US'
      ? 'Quick action is disabled or no longer exists'
      : '快速处理按钮已停用或不存在');
  }

  const startTime = performance.now();
  const context = {
    source: 'manual' as const,
    translationConfig: activeConfig.translation,
    translateText: async (
      input: string,
      from: string,
      to: string,
      translationConfig: ProcessorConfig['translation']
    ) => (await translateConfiguredText(input, from, to, translationConfig)).text
  };
  const pipelineResult = await executeQuickActionPipeline(
    text,
    action,
    customRules,
    new Set(allProcessors.map(processor => processor.id)),
    async (input, processorIds) => processorCore.processAsync(input, { processors: processorIds, context })
  );
  const result: ProcessingResult = {
    text: pipelineResult.text,
    originalText: text,
    processorsUsed: pipelineResult.processorsUsed,
    processingTime: performance.now() - startTime
  };

  await addHistory(text, result.text, result.processorsUsed, 'manual');
  return { result, skippedItems: pipelineResult.skippedItems };
}

async function translateText(text: string, from?: string, to?: string): Promise<TextTranslationResult> {
  const sourceLang = from || activeConfig.translation.defaultSourceLang || 'auto';
  const targetLang = to || activeConfig.translation.defaultTargetLang || 'zh';
  return translateConfiguredText(text, sourceLang, targetLang, activeConfig.translation);
}

async function translateImage(dataUrl: string, from?: string, to?: string): Promise<ImageTranslationResult> {
  const sourceLang = from || activeConfig.translation.defaultSourceLang || 'auto';
  const targetLang = to || activeConfig.translation.defaultTargetLang || 'zh';
  return translateImageFromDataUrl(dataUrl, sourceLang, targetLang, activeConfig.translation);
}

async function startScreenshotImageTranslation(
  from?: string,
  to?: string,
  taskType: 'image-translation' | 'ocr' = 'image-translation'
): Promise<PendingScreenshotImageTranslation> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || tab.windowId === undefined) {
    throw new Error(getBackgroundText().cannotGetCurrentTab);
  }

  if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://') || tab.url?.startsWith('chrome-extension://')) {
    throw new Error(getBackgroundText().internalPageNotSupported);
  }

  notify(
    taskType === 'ocr'
      ? (activeConfig.ui.language === 'en-US' ? 'Screenshot OCR' : '截图 OCR')
      : getBackgroundText().screenshotTranslation,
    taskType === 'ocr'
      ? (activeConfig.ui.language === 'en-US' ? 'Drag to select the area to recognize' : '请拖拽选择需要识别的区域')
      : getBackgroundText().dragToSelectImageArea
  );

  const pending: PendingScreenshotImageTranslation = {
    taskType,
    sessionId: createSessionId(),
    tabId: tab.id,
    windowId: tab.windowId,
    from,
    to,
    pageTitle: tab.title,
    pageUrl: tab.url,
    timestamp: Date.now()
  };

  await chrome.storage.local.set({ [PENDING_SCREENSHOT_TRANSLATION_KEY]: pending });

  try {
    const response = await sendTabMessage<{ success?: boolean; error?: string }>(tab.id, {
      type: 'START_SCREENSHOT_SELECTION',
      sessionId: pending.sessionId
    });

    if (response?.success === false) {
      throw new Error(response.error || getBackgroundText().cannotStartScreenshotSelection);
    }
  } catch (error) {
    await chrome.storage.local.remove(PENDING_SCREENSHOT_TRANSLATION_KEY);
    throw error;
  }

  return pending;
}

async function startScreenshotOcr(): Promise<PendingScreenshotImageTranslation> {
  return startScreenshotImageTranslation(undefined, undefined, 'ocr');
}

async function completeScreenshotImageTranslation(
  sessionId: string,
  selection: ScreenshotSelectionResult
): Promise<StoredScreenshotImageTranslation | StoredOcrResult> {
  const pending = await getPendingScreenshotImageTranslation(sessionId);

  try {
    if (pending.taskType === 'ocr') {
      return await ocrScreenshotSelection(pending, selection);
    }
    return await translateScreenshotSelection(pending, selection);
  } catch (error) {
    if (pending.taskType === 'ocr') {
      await recordOcrError(getErrorMessage(error), '[OCR screenshot]', pending);
    } else {
      await recordScreenshotImageTranslationError(getErrorMessage(error), pending);
    }
    throw error;
  } finally {
    await clearPendingScreenshotImageTranslation(sessionId);
  }
}

async function ocrScreenshotSelection(
  pending: PendingScreenshotImageTranslation,
  selection: ScreenshotSelectionResult
): Promise<StoredOcrResult> {
  if (selection.cancelled || !selection.rect) {
    throw new Error(getBackgroundText().screenshotCancelled);
  }
  const screenshotDataUrl = await captureVisibleTab(pending.windowId);
  const cropped = await sendTabMessage<ScreenshotCropResult>(pending.tabId, {
    type: 'CROP_SCREENSHOT_TO_DATA_URL',
    screenshotDataUrl,
    rect: selection.rect
  });
  if (!cropped?.dataUrl) throw new Error(getBackgroundText().screenshotCropMissingData);
  return runOcr(cropped.dataUrl, '[OCR screenshot]', {
    id: pending.tabId,
    title: pending.pageTitle,
    url: pending.pageUrl
  });
}

async function translateScreenshotSelection(
  pending: PendingScreenshotImageTranslation,
  selection: ScreenshotSelectionResult
): Promise<StoredScreenshotImageTranslation> {
  if (selection.cancelled || !selection.rect) {
    throw new Error(getBackgroundText().screenshotCancelled);
  }

  const screenshotDataUrl = await captureVisibleTab(pending.windowId);
  const cropped = await sendTabMessage<ScreenshotCropResult>(pending.tabId, {
    type: 'CROP_SCREENSHOT_TO_DATA_URL',
    screenshotDataUrl,
    rect: selection.rect
  });

  if (!cropped?.dataUrl) {
    throw new Error(getBackgroundText().screenshotCropMissingData);
  }

  const clipboardWritten = cropped.clipboardWritten || await writeImageToClipboardOffscreen(cropped.dataUrl);

  const result = await translateImage(cropped.dataUrl, pending.from, pending.to);
  const stored: StoredScreenshotImageTranslation = {
    timestamp: Date.now(),
    pageTitle: pending.pageTitle,
    pageUrl: pending.pageUrl,
    sourceText: result.sourceText,
    translatedText: result.translatedText,
    imageUrl: result.imageUrl,
    from: result.from,
    to: result.to,
    duration: result.duration,
    clipboardWritten
  };

  await chrome.storage.local.set({ [LAST_SCREENSHOT_TRANSLATION_KEY]: stored });

  await addHistory(
    result.sourceText || '[image screenshot]',
    result.translatedText || result.imageUrl || '',
    ['screenshot-image-translate'],
    'manual',
    {
      title: pending.pageTitle,
      url: pending.pageUrl
    }
  );

  notify(
    getBackgroundText().screenshotImageDone,
    clipboardWritten
      ? getBackgroundText().screenshotCopiedResultInPopup
      : getBackgroundText().screenshotClipboardMaybeLimited
  );

  return stored;
}

async function recordScreenshotImageTranslationError(
  error: string,
  pending?: PendingScreenshotImageTranslation
): Promise<void> {
  const stored: StoredScreenshotImageTranslation = {
    timestamp: Date.now(),
    pageTitle: pending?.pageTitle,
    pageUrl: pending?.pageUrl,
    sourceText: '',
    translatedText: '',
    from: pending?.from || '',
    to: pending?.to || '',
    duration: 0,
    clipboardWritten: false,
    error
  };

  await chrome.storage.local.set({ [LAST_SCREENSHOT_TRANSLATION_KEY]: stored });
  notify(getBackgroundText().screenshotImageFailed, error);
}

async function processSelectedText(text: string, tab?: chrome.tabs.Tab): Promise<void> {
  const result = await processText(text, { context: { source: 'selection' } });

  if (tab?.id) {
    await sendTabMessage(tab.id, {
      type: 'REPLACE_SELECTION',
      text: result.text
    });
  }

  notify(
    getBackgroundText().textProcessDone,
    getBackgroundText().processorsApplied.replace('{count}', String(result.processorsUsed.length))
  );
}

async function copyAndProcess(text: string, tab?: chrome.tabs.Tab): Promise<void> {
  const result = await processText(text, { context: { source: 'selection' } });
  await writeToClipboard(result.text, tab?.id);
  notify(getBackgroundText().copiedProcessResult, getBackgroundText().processedTextCopied);
}

async function translateSelectedText(text: string, tab: chrome.tabs.Tab | undefined, replaceSelection: boolean): Promise<void> {
  try {
    const result = await translateText(text);
    await addHistory(text, result.text, ['translate-text'], 'selection', tab);

    if (replaceSelection && tab?.id) {
      await sendTabMessage(tab.id, {
        type: 'REPLACE_SELECTION',
        text: result.text
      });
      notify(
        getBackgroundText().translateDone,
        result.cached ? getBackgroundText().cachedTranslationReplaced : getBackgroundText().translationReplaced
      );
      return;
    }

    await writeToClipboard(result.text, tab?.id);
    notify(
      getBackgroundText().translateDone,
      result.cached ? getBackgroundText().cachedTranslationCopied : getBackgroundText().translationCopied
    );
  } catch (error) {
    notify(getBackgroundText().translateFailed, getErrorMessage(error));
  }
}

async function translateImageFromPage(srcUrl: string, tab: chrome.tabs.Tab): Promise<void> {
  try {
    if (!tab.id) {
      throw new Error(getBackgroundText().cannotGetCurrentTab);
    }

    const dataUrl = await sendTabMessage<string>(tab.id, {
      type: 'FETCH_IMAGE_AS_DATA_URL',
      srcUrl
    });

    const result = await translateImage(dataUrl);
    await writeToClipboard(result.translatedText || result.imageUrl || '', tab.id);
    notify(
      getBackgroundText().imageTranslateDone,
      result.translatedText ? getBackgroundText().imageTextCopied : getBackgroundText().imageUrlCopied
    );
  } catch (error) {
    notify(getBackgroundText().imageTranslateFailed, getErrorMessage(error));
  }
}

async function ocrImageFromPage(srcUrl: string, tab: chrome.tabs.Tab): Promise<void> {
  try {
    if (!tab.id) throw new Error(getBackgroundText().cannotGetCurrentTab);
    const dataUrl = await sendTabMessage<string>(tab.id, {
      type: 'FETCH_IMAGE_AS_DATA_URL',
      srcUrl
    });
    await runOcr(dataUrl, '[OCR page image]', tab);
  } catch (error) {
    await recordOcrError(getErrorMessage(error), '[OCR page image]', tab);
    notify(activeConfig.ui.language === 'en-US' ? 'OCR failed' : 'OCR 识别失败', getErrorMessage(error));
  }
}

async function runOcr(
  dataUrl: string,
  sourceName: string,
  tab?: Pick<chrome.tabs.Tab, 'id' | 'url' | 'title'>
): Promise<StoredOcrResult> {
  const result = await recognizeImage(dataUrl, activeConfig.ocr);
  const clipboardWritten = Boolean(result.text) && await writeOcrText(result.text, tab?.id);
  const stored: StoredOcrResult = {
    ...result,
    timestamp: Date.now(),
    pageTitle: tab?.title,
    pageUrl: tab?.url,
    sourceName,
    clipboardWritten
  };
  await chrome.storage.local.set({ [LAST_OCR_RESULT_KEY]: stored });
  if (result.text) {
    await addHistory(
      sourceName,
      result.text,
      [`ocr:tencent:${result.model}`],
      'manual',
      tab,
      result.duration
    );
  }
  notify(
    activeConfig.ui.language === 'en-US' ? 'OCR complete' : 'OCR 识别完成',
    result.text
      ? (activeConfig.ui.language === 'en-US' ? 'Recognized text copied to clipboard' : '识别文字已复制到剪贴板')
      : (activeConfig.ui.language === 'en-US' ? 'No text detected' : '未识别到文字')
  );
  return stored;
}

async function writeOcrText(text: string, tabId?: number): Promise<boolean> {
  try {
    await writeToClipboard(text, tabId);
    return true;
  } catch {
    return false;
  }
}

async function recordOcrError(
  error: string,
  sourceName: string,
  page?: PageMetadata | TabMetadata
): Promise<void> {
  const metadata = toPageMetadata(page);
  await chrome.storage.local.set({
    [LAST_OCR_RESULT_KEY]: {
      timestamp: Date.now(),
      pageTitle: metadata.pageTitle,
      pageUrl: metadata.pageUrl,
      sourceName,
      text: '',
      lines: [],
      model: activeConfig.ocr.model,
      duration: 0,
      clipboardWritten: false,
      error
    } satisfies StoredOcrResult
  });
}

async function processCurrentSelection(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return;
  }

  const response = await sendTabMessage<{ text: string }>(tab.id, { type: 'GET_SELECTION' });
  if (response?.text) {
    await processSelectedText(response.text, tab);
  }
}

async function processClipboardAndPaste(): Promise<void> {
  const text = await navigator.clipboard.readText();
  const result = await processText(text, { context: { source: 'clipboard' } });
  await navigator.clipboard.writeText(result.text);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await sendTabMessage(tab.id, { type: 'PASTE_TEXT', text: result.text });
  }
}

function captureVisibleTab(windowId: number): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, dataUrl => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      if (!dataUrl) {
        reject(new Error(getBackgroundText().screenshotFailedNoData));
        return;
      }

      resolve(dataUrl);
    });
  });
}

async function getLastScreenshotImageTranslation(): Promise<StoredScreenshotImageTranslation | null> {
  const stored = await chrome.storage.local.get(LAST_SCREENSHOT_TRANSLATION_KEY);
  return stored[LAST_SCREENSHOT_TRANSLATION_KEY] || null;
}

async function getLastOcrResult(): Promise<StoredOcrResult | null> {
  const stored = await chrome.storage.local.get(LAST_OCR_RESULT_KEY);
  return stored[LAST_OCR_RESULT_KEY] || null;
}

async function getPendingScreenshotImageTranslation(sessionId: string): Promise<PendingScreenshotImageTranslation> {
  const stored = await chrome.storage.local.get(PENDING_SCREENSHOT_TRANSLATION_KEY);
  const pending = stored[PENDING_SCREENSHOT_TRANSLATION_KEY] as PendingScreenshotImageTranslation | undefined;

  if (!pending || pending.sessionId !== sessionId) {
    throw new Error(getBackgroundText().screenshotTaskExpired);
  }

  if (Date.now() - pending.timestamp > SCREENSHOT_TASK_TTL_MS) {
    await chrome.storage.local.remove(PENDING_SCREENSHOT_TRANSLATION_KEY);
    throw new Error(getBackgroundText().screenshotTaskTimeout);
  }

  return pending;
}

async function clearPendingScreenshotImageTranslation(sessionId: string): Promise<void> {
  const stored = await chrome.storage.local.get(PENDING_SCREENSHOT_TRANSLATION_KEY);
  const pending = stored[PENDING_SCREENSHOT_TRANSLATION_KEY] as PendingScreenshotImageTranslation | undefined;

  if (pending?.sessionId === sessionId) {
    await chrome.storage.local.remove(PENDING_SCREENSHOT_TRANSLATION_KEY);
  }
}

async function writeImageToClipboardOffscreen(dataUrl: string): Promise<boolean> {
  try {
    await ensureOffscreenDocument();
    const response = await chrome.runtime.sendMessage<{ success?: boolean }>({
      type: 'OFFSCREEN_WRITE_IMAGE_TO_CLIPBOARD',
      dataUrl
    });

    return Boolean(response?.success);
  } catch (error) {
    console.warn('Offscreen clipboard image write failed:', error);
    return false;
  }
}

async function ensureOffscreenDocument(): Promise<void> {
  const offscreen = chrome.offscreen;
  if (!offscreen?.createDocument) {
    throw new Error(getBackgroundText().offscreenUnsupported);
  }

  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const getContexts = chrome.runtime.getContexts;

  if (typeof getContexts === 'function') {
    const existingContexts = await getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl]
    });

    if (existingContexts.length > 0) {
      return;
    }
  }

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ['CLIPBOARD'],
      justification: 'Write cropped screenshot images to the clipboard for image translation.'
    }).catch(error => {
      if (String(error?.message || error).includes('Only a single offscreen document')) {
        return;
      }
      throw error;
    }).finally(() => {
      creatingOffscreenDocument = null;
    });
  }

  await creatingOffscreenDocument;
}

async function writeToClipboard(text: string, tabId?: number): Promise<void> {
  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    if (!tabId) {
      throw new Error(getBackgroundText().clipboardWriteFailed);
    }

    await sendTabMessage(tabId, {
      type: 'WRITE_CLIPBOARD',
      text
    });
  }
}

async function addHistory(
  originalText: string,
  processedText: string,
  processorsUsed: string[],
  source: 'clipboard' | 'selection' | 'manual',
  tab?: Pick<chrome.tabs.Tab, 'url' | 'title'>,
  processingTime?: number
): Promise<void> {
  historyMutationVersion += 1;
  const version = historyMutationVersion;
  processorCore.addToHistory({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    originalText,
    processedText,
    processorsUsed,
    source,
    metadata: {
      url: tab?.url,
      pageTitle: tab?.title,
      processingTime
    }
  });
  await persistCurrentHistory(version);
}

function notify(title: string, message: string): void {
  if (!activeConfig.ui.showNotifications) {
    return;
  }

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title,
    message: message.slice(0, 180)
  });
}

function sendTabMessage<T = any>(tabId: number, message: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, response => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve(response as T);
    });
  });
}

function createSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
