<template>
  <div class="popup-container" :data-ctp-skin="uiSkin" :data-ctp-theme="resolvedTheme">
    <div class="fixed-shell">
      <header class="popup-header">
        <h1>{{ uiText.title }}</h1>
        <button class="icon-btn" :title="uiText.settings" @click="openSettings">{{ uiText.settings }}</button>
      </header>
      <nav class="tab-nav" :aria-label="uiText.navigation">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
          @click="selectTab(tab.id)"
        >
          <svg v-if="tab.id === 'process'" class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 19.5V15l10.8-10.8a2.1 2.1 0 0 1 3 0l2 2a2.1 2.1 0 0 1 0 3L9 20H4v-.5Z" />
            <path d="m13.5 5.5 5 5M4 20h16" />
          </svg>
          <svg v-else-if="tab.id === 'translate'" class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5h9M8.5 3v2M5.5 8c1.4 3.1 3.6 5.3 6.5 6.8M12 8c-1.4 3.3-4 5.9-7.5 7.5M14 20l3.5-9 3.5 9M15.3 17h4.4" />
          </svg>
          <svg v-else-if="tab.id === 'ocr'" class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M8 20H4v-4M8 9h8M8 12h8M8 15h5" />
          </svg>
          <svg v-else class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 6h12M8 12h12M8 18h12" />
            <path d="M4 6h.01M4 12h.01M4 18h.01" />
          </svg>
          <span>{{ tab.label }}</span>
        </button>
      </nav>
    </div>

    <main class="popup-content">
      <div v-if="statusMessage || errorMessage" :class="['status', errorMessage ? 'error' : '']">
        {{ errorMessage || statusMessage }}
      </div>

      <template v-if="activeTab === 'process'">
        <section class="section copy-unlock-section">
          <button
            :class="['btn', 'full-width', copyUnlockEnabled ? 'success' : 'primary']"
            :disabled="copyUnlockLoading || !copyUnlockAvailable"
            @click="toggleCopyUnlock"
          >
            {{ copyUnlockEnabled ? uiText.restoreCopyRestrictions : uiText.unlockCopyRestrictions }}
          </button>
          <div v-if="copyUnlockError || copyUnlockEnabled" :class="['hint', copyUnlockError ? 'error-text' : '']">
            {{ copyUnlockError || uiText.copyUnlockEnabledHint }}
          </div>
        </section>

        <section class="section">
          <div class="section-title">{{ uiText.textProcessing }}</div>
          <textarea v-model="processInputText" :placeholder="uiText.processInputPlaceholder" rows="5" />
          <div class="toolbar">
            <button class="btn primary" :disabled="isBusy || !processInputText.trim()" @click="processInput">{{ uiText.process }}</button>
            <button class="btn" :disabled="isBusy" @click="pasteProcessText">{{ uiText.paste }}</button>
            <button class="btn" @click="clearProcessText">{{ uiText.clear }}</button>
          </div>
        </section>

        <section class="section feature-card">
          <div class="section-title">{{ uiText.quickActions }}</div>
          <div class="action-grid">
            <button
              v-for="action in displayedQuickActions"
              :key="action.id"
              class="action-btn"
              :disabled="isBusy || !processInputText.trim()"
              @click="executeQuickAction(action)"
            >{{ action.label }}</button>
          </div>
          <button v-if="enabledQuickActions.length > 4" class="more-actions-btn" @click="quickActionsExpanded = !quickActionsExpanded">
            {{ quickActionsExpanded ? uiText.showLess : uiText.showMore }}
          </button>
        </section>

        <section class="section feature-card">
          <div class="section-title">{{ uiText.aiProcessing }}</div>
          <div class="toolbar">
            <select v-model="selectedAiRuleId">
              <option value="">{{ uiText.selectAiRule }}</option>
              <option v-for="rule in aiRules" :key="rule.id" :value="rule.id">{{ rule.name }}</option>
            </select>
            <button class="btn primary" :disabled="isBusy || !processInputText.trim() || !selectedAiRuleId" @click="processInputWithAi">
              {{ uiText.aiProcess }}
            </button>
          </div>
        </section>

        <section v-if="processResultText" class="section result-card">
          <div class="section-title">{{ uiText.processingResult }}</div>
          <pre class="result-content">{{ processResultText }}</pre>
          <button class="btn success" @click="copyText(processResultText)">{{ uiText.copyResult }}</button>
        </section>
      </template>

      <template v-else-if="activeTab === 'translate'">
        <section class="section">
          <div class="section-title">{{ uiText.textTranslation }}</div>
          <textarea v-model="translationInputText" :placeholder="uiText.translationInputPlaceholder" rows="5" />
          <div class="lang-row">
            <select v-model="sourceLang">
              <option v-for="lang in sourceLanguageOptions" :key="lang.value" :value="lang.value">{{ lang.label }}</option>
            </select>
            <button class="swap-btn" :title="uiText.swapLanguages" @click="swapLanguages">⇄</button>
            <select v-model="targetLang">
              <option v-for="lang in targetLanguageOptions" :key="lang.value" :value="lang.value">{{ lang.label }}</option>
            </select>
          </div>
          <div class="hint">{{ uiText.currentApi }}: {{ currentApiTypeLabel }}</div>
          <div class="toolbar">
            <button class="btn primary" :disabled="isBusy || !translationInputText.trim()" @click="translateInput">{{ uiText.translate }}</button>
            <button class="btn" :disabled="isBusy" @click="pasteTranslationText">{{ uiText.paste }}</button>
            <button class="btn" @click="clearTranslationText">{{ uiText.clear }}</button>
          </div>
        </section>

        <section v-if="translationResultText" class="section result-card">
          <div class="section-title">{{ uiText.translationResult }}</div>
          <pre class="result-content">{{ translationResultText }}</pre>
          <button class="btn success" @click="copyText(translationResultText)">{{ uiText.copyTranslation }}</button>
        </section>

        <section class="section">
          <div class="section-title">{{ uiText.imageTranslation }}</div>
          <button class="btn primary full-width" :disabled="isBusy" @click="startScreenshotImageTranslation">{{ uiText.screenshotTranslate }}</button>
          <div class="file-row">
            <input type="file" accept="image/*" @change="onImageSelected" />
            <button class="btn" :disabled="isBusy || !imageDataUrl" @click="translateSelectedImage">{{ uiText.translateUploadedImage }}</button>
          </div>
          <div v-if="imageFileName" class="hint">{{ imageFileName }}</div>
        </section>

        <section v-if="imageTranslationResultText" class="section result-card">
          <div class="section-title">{{ uiText.imageTranslationResult }}</div>
          <pre class="result-content">{{ imageTranslationResultText }}</pre>
          <button class="btn success" @click="copyText(imageTranslationResultText)">{{ uiText.copyTranslation }}</button>
        </section>

        <section v-if="lastScreenshotResult" class="section screenshot-result">
          <div class="section-title">{{ uiText.recentScreenshot }}</div>
          <div class="meta">{{ formatTime(lastScreenshotResult.timestamp) }}</div>
          <div v-if="lastScreenshotResult.error" class="sub-result error-text">{{ lastScreenshotResult.error }}</div>
          <div v-if="lastScreenshotResult.sourceText" class="sub-result"><strong>{{ uiText.recognized }}:</strong> {{ lastScreenshotResult.sourceText }}</div>
          <div v-if="lastScreenshotResult.translatedText" class="sub-result"><strong>{{ uiText.translation }}:</strong> {{ lastScreenshotResult.translatedText }}</div>
          <button class="btn success" :disabled="!lastScreenshotResult.translatedText" @click="copyScreenshotTranslation">{{ uiText.copyTranslation }}</button>
        </section>
      </template>

      <template v-else-if="activeTab === 'ocr'">
        <section class="section">
          <div class="section-title">{{ uiText.ocrRecognition }}</div>
          <button class="btn primary full-width" :disabled="isBusy" @click="startScreenshotOcr">{{ uiText.recognizePageArea }}</button>
          <div class="file-row">
            <input type="file" accept="image/png,image/jpeg,image/bmp" @change="onOcrImageSelected" />
            <button class="btn" :disabled="isBusy || !ocrImageDataUrl" @click="recognizeSelectedImage">{{ uiText.recognizeUploadedImage }}</button>
          </div>
          <div v-if="ocrImageFileName" class="hint">{{ ocrImageFileName }}</div>
        </section>

        <section v-if="lastOcrResult" class="section screenshot-result">
          <div class="section-title">{{ uiText.recentOcrResult }}</div>
          <div class="meta">{{ formatTime(lastOcrResult.timestamp) }} · {{ lastOcrResult.model }}</div>
          <div v-if="lastOcrResult.error" class="sub-result error-text">{{ lastOcrResult.error }}</div>
          <pre v-else-if="lastOcrResult.text" class="result-content ocr-result-content">{{ lastOcrResult.text }}</pre>
          <div v-else class="hint">{{ uiText.noTextDetected }}</div>
          <button class="btn success" :disabled="!lastOcrResult.text" @click="copyOcrResult">{{ uiText.copyOcrText }}</button>
        </section>
      </template>

      <template v-else>
        <section class="section history-section">
          <div class="section-title">{{ uiText.recentHistory }}</div>
          <div v-if="recentHistory.length === 0" class="empty">{{ uiText.emptyHistory }}</div>
          <button v-for="item in recentHistory" :key="item.id" class="history-item" @click="copyHistoryItem(item)">
            <span>{{ item.preview }}</span>
            <small>{{ formatTime(item.timestamp) }}</small>
          </button>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { getErrorMessage, sendRuntimeMessage } from '../shared/runtime-message';
import { normalizeQuickActions } from '../shared/quick-actions';
import {
  normalizeSkin,
  normalizeTheme,
  resolveTheme,
  systemPrefersDark,
  watchSystemTheme,
  type ResolvedUiTheme,
  type UiThemePreference
} from '../theme/skins';
import type { QuickActionConfig, QuickActionPresetName, UiSkin } from '@clipboard-processor/core';
import type { AiProcessingRule } from '../shared/ai-processing-types';

type QuickAction = {
  id: string;
  label: string;
  processorIds: string[];
  customRuleIds: string[];
};

type PopupTab = 'process' | 'translate' | 'ocr' | 'history';

type HistoryPreview = {
  id: string;
  preview: string;
  timestamp: number;
  text: string;
};

type LastScreenshotTranslation = {
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

type LastOcrResult = {
  timestamp: number;
  text: string;
  model: string;
  clipboardWritten: boolean;
  error?: string;
};

const LAST_TAB_STORAGE_KEY = 'popupLastActiveTab';
const activeTab = ref<PopupTab>('process');
const processInputText = ref('');
const processResultText = ref('');
const translationInputText = ref('');
const translationResultText = ref('');
const imageTranslationResultText = ref('');
const statusMessage = ref('');
const errorMessage = ref('');
const isBusy = ref(false);
const recentHistory = ref<HistoryPreview[]>([]);
const sourceLang = ref('auto');
const targetLang = ref('zh');
const currentApiType = ref('general');
const imageDataUrl = ref('');
const imageFileName = ref('');
const lastScreenshotResult = ref<LastScreenshotTranslation | null>(null);
const lastOcrResult = ref<LastOcrResult | null>(null);
const ocrImageDataUrl = ref('');
const ocrImageFileName = ref('');
const uiLanguage = ref<'zh-CN' | 'en-US'>('zh-CN');
const uiSkin = ref<UiSkin>('classic');
const uiThemePreference = ref<UiThemePreference>('auto');
const resolvedTheme = ref<ResolvedUiTheme>('light');
const aiRules = ref<AiProcessingRule[]>([]);
const selectedAiRuleId = ref('');
const copyUnlockEnabled = ref(false);
const copyUnlockAvailable = ref(false);
const copyUnlockLoading = ref(false);
const copyUnlockError = ref('');
const quickActionConfigs = ref<QuickActionConfig[]>([]);
const quickActionsExpanded = ref(false);
let stopWatchingSystemTheme: () => void = () => {};

const popupMessages = {
  'zh-CN': {
    title: '文本处理器',
    settings: '设置',
    text: '文本',
    inputPlaceholder: '粘贴或输入要处理的文本',
    process: '处理',
    translate: '翻译',
    paste: '粘贴',
    clear: '清空',
    copyUnlock: '网页复制限制',
    unlockCopyRestrictions: '解除当前页面复制限制',
    restoreCopyRestrictions: '恢复当前页面复制限制',
    copyUnlockEnabledHint: '当前页面已解除选中、复制和右键限制；刷新页面后自动关闭。',
    copyUnlockDisabledHint: '默认关闭，仅作用于当前已加载页面。',
    copyUnlockUnavailable: '当前页面不支持解除复制限制',
    copyUnlockFailed: '切换复制限制失败',
    quickActions: '快速处理',
    aiProcessing: 'AI 处理',
    selectAiRule: '选择 AI 处理要求',
    aiProcess: 'AI处理',
    aiProcessingHint: 'AI 处理独立执行，不会运行普通处理器或基础规则。',
    aiProcessingRunning: '正在进行 AI 处理...',
    aiProcessingDone: 'AI 处理完成',
    translationSettings: '翻译设置',
    swapLanguages: '交换语言',
    currentApi: '当前 API',
    imageTranslation: '图片翻译',
    screenshotTranslate: '截图翻译当前页面区域',
    screenshotHint: '点击后在页面中框选区域，截图会复制到剪贴板，并自动调用图片翻译。',
    translateUploadedImage: '翻译上传图片',
    recentScreenshot: '最近截图翻译',
    screenshotCopied: '截图已复制',
    recognized: '识别',
    translation: '译文',
    copyTranslation: '复制译文',
    result: '结果',
    copyResult: '复制结果',
    recentHistory: '最近记录',
    emptyHistory: '暂无记录',
    detectLanguage: '检测语言',
    chinese: '中文',
    english: '英语',
    japanese: '日语',
    korean: '韩语',
    french: '法语',
    german: '德语',
    russian: '俄语',
    traditionalChinese: '繁体中文',
    spanish: '西班牙语',
    portuguese: '葡萄牙语',
    italian: '意大利语',
    vietnamese: '越南语',
    thai: '泰语',
    generalApi: '通用文本翻译',
    largeModelApi: '大模型文本翻译',
    domainApi: '领域文本翻译',
    imageApi: '图片翻译',
    cleanAll: '一键清理',
    fullToHalf: '全角转半角',
    removeRefs: '删除引用',
    addSpace: '中英加空格',
    loadFailed: '加载插件设置失败',
    processing: '正在处理...',
    processTimeout: '处理超时，请检查启用的处理器或重新加载插件后重试',
    processDone: '处理完成，使用 {count} 个处理器',
    actionDone: '{action}完成',
    quickProcessTimeout: '处理超时，请重新加载插件后重试',
    imageApiSelected: '当前 API 是图片翻译，请在设置中切换到文本翻译 API，或使用图片翻译入口',
    translating: '正在翻译...',
    translateTimeout: '翻译超时，请检查网络、百度 API 配置，或重新加载插件后重试',
    translateCached: '翻译完成，来自缓存',
    translateDone: '翻译完成',
    readingClipboard: '正在读取剪贴板...',
    clipboardPasted: '已粘贴剪贴板文本',
    autoCannotSwap: '检测语言不能交换到目标语言',
    screenshotSelecting: '请在页面中框选要翻译的区域...',
    screenshotStartTimeout: '启动截图翻译超时，请确认当前页面允许插件脚本运行',
    screenshotStarted: '已进入页面框选模式；完成后重新打开插件可查看最近截图翻译结果',
    imageTranslating: '正在翻译图片...',
    imageTranslateTimeout: '图片翻译超时，请检查图片大小、网络或百度图片翻译配置',
    imageTranslateDone: '图片翻译完成',
    resultCopied: '结果已复制',
    screenshotTranslationCopied: '截图译文已复制',
    operationFailed: '操作失败',
    navigation: '功能导航',
    processTab: '文本处理',
    translateTab: '翻译',
    ocrTab: 'OCR',
    historyTab: '记录',
    textProcessing: '文本处理',
    processInputPlaceholder: '粘贴或输入要处理的文本',
    processingResult: '处理结果',
    textTranslation: '文本翻译',
    translationInputPlaceholder: '粘贴或输入要翻译的文本',
    translationResult: '翻译结果',
    imageTranslationResult: '图片翻译结果',
    ocrRecognition: 'OCR 文字识别',
    recognizePageArea: '框选网页区域识别',
    recognizeUploadedImage: '识别上传图片',
    recentOcrResult: '最近 OCR 结果',
    noTextDetected: '未识别到文字',
    copyOcrText: '复制识别文字'
    ,
    showMore: '更多',
    showLess: '收起',
    skippedQuickItems: '，跳过 {count} 个失效项目'
    ,
    quickActionReloadRequired: '插件后台仍是旧版本。此按钮包含基础规则，请在扩展管理页重新加载插件后重试'
  },
  'en-US': {
    title: 'Text Processor',
    settings: 'Settings',
    text: 'Text',
    inputPlaceholder: 'Paste or enter text to process',
    process: 'Process',
    translate: 'Translate',
    paste: 'Paste',
    clear: 'Clear',
    copyUnlock: 'Page Copy Restrictions',
    unlockCopyRestrictions: 'Unlock Copying on This Page',
    restoreCopyRestrictions: 'Restore Page Copy Restrictions',
    copyUnlockEnabledHint: 'Selection, copying, and context menu restrictions are unlocked until the page reloads.',
    copyUnlockDisabledHint: 'Disabled by default and applies only to the currently loaded page.',
    copyUnlockUnavailable: 'Copy unlocking is unavailable on this page',
    copyUnlockFailed: 'Failed to change copy restrictions',
    quickActions: 'Quick Actions',
    aiProcessing: 'AI Processing',
    selectAiRule: 'Select an AI instruction',
    aiProcess: 'AI Process',
    aiProcessingHint: 'AI processing runs independently from normal processors and basic rules.',
    aiProcessingRunning: 'Processing with AI...',
    aiProcessingDone: 'AI processing complete',
    translationSettings: 'Translation Settings',
    swapLanguages: 'Swap languages',
    currentApi: 'Current API',
    imageTranslation: 'Image Translation',
    screenshotTranslate: 'Translate page area screenshot',
    screenshotHint: 'Select an area on the page. The screenshot will be copied to the clipboard and sent to image translation.',
    translateUploadedImage: 'Translate uploaded image',
    recentScreenshot: 'Recent Screenshot Translation',
    screenshotCopied: 'Screenshot copied',
    recognized: 'Detected',
    translation: 'Translation',
    copyTranslation: 'Copy translation',
    result: 'Result',
    copyResult: 'Copy result',
    recentHistory: 'Recent History',
    emptyHistory: 'No history',
    detectLanguage: 'Detect language',
    chinese: 'Chinese',
    english: 'English',
    japanese: 'Japanese',
    korean: 'Korean',
    french: 'French',
    german: 'German',
    russian: 'Russian',
    traditionalChinese: 'Traditional Chinese',
    spanish: 'Spanish',
    portuguese: 'Portuguese',
    italian: 'Italian',
    vietnamese: 'Vietnamese',
    thai: 'Thai',
    generalApi: 'General text translation',
    largeModelApi: 'Large-model text translation',
    domainApi: 'Domain text translation',
    imageApi: 'Image translation',
    cleanAll: 'Clean all',
    fullToHalf: 'Full-width to half-width',
    removeRefs: 'Remove references',
    addSpace: 'Add Chinese-English spacing',
    loadFailed: 'Failed to load extension settings',
    processing: 'Processing...',
    processTimeout: 'Processing timed out. Check enabled processors or reload the extension and try again.',
    processDone: 'Processed with {count} processors',
    actionDone: '{action} complete',
    quickProcessTimeout: 'Processing timed out. Reload the extension and try again.',
    imageApiSelected: 'The current API is image translation. Switch to a text translation API in settings, or use the image translation entry.',
    translating: 'Translating...',
    translateTimeout: 'Translation timed out. Check network, Baidu API settings, or reload the extension and try again.',
    translateCached: 'Translation complete, from cache',
    translateDone: 'Translation complete',
    readingClipboard: 'Reading clipboard...',
    clipboardPasted: 'Clipboard text pasted',
    autoCannotSwap: 'Detect language cannot be swapped to the target language',
    screenshotSelecting: 'Select the page area to translate...',
    screenshotStartTimeout: 'Starting screenshot translation timed out. Make sure the current page allows extension scripts.',
    screenshotStarted: 'Page selection mode started. Reopen the popup after selecting to view the latest screenshot translation.',
    imageTranslating: 'Translating image...',
    imageTranslateTimeout: 'Image translation timed out. Check image size, network, or Baidu image translation settings.',
    imageTranslateDone: 'Image translation complete',
    resultCopied: 'Result copied',
    screenshotTranslationCopied: 'Screenshot translation copied',
    operationFailed: 'Operation failed',
    navigation: 'Feature navigation',
    processTab: 'Process',
    translateTab: 'Translate',
    ocrTab: 'OCR',
    historyTab: 'History',
    textProcessing: 'Text Processing',
    processInputPlaceholder: 'Paste or enter text to process',
    processingResult: 'Processing Result',
    textTranslation: 'Text Translation',
    translationInputPlaceholder: 'Paste or enter text to translate',
    translationResult: 'Translation Result',
    imageTranslationResult: 'Image Translation Result',
    ocrRecognition: 'OCR Text Recognition',
    recognizePageArea: 'Recognize page area',
    recognizeUploadedImage: 'Recognize uploaded image',
    recentOcrResult: 'Recent OCR Result',
    noTextDetected: 'No text detected',
    copyOcrText: 'Copy OCR text'
    ,
    showMore: 'More',
    showLess: 'Show less',
    skippedQuickItems: ', skipped {count} unavailable items'
    ,
    quickActionReloadRequired: 'The extension background is still an older version. Reload the extension before running an action with basic rules.'
  }
} as const;

const uiText = computed(() => popupMessages[uiLanguage.value]);
const tabs = computed(() => [
  { id: 'process' as const, label: uiText.value.processTab },
  { id: 'translate' as const, label: uiText.value.translateTab },
  { id: 'ocr' as const, label: uiText.value.ocrTab },
  { id: 'history' as const, label: uiText.value.historyTab }
]);

const languageOptions = computed(() => [
  { label: uiText.value.detectLanguage, value: 'auto' },
  { label: uiText.value.chinese, value: 'zh' },
  { label: uiText.value.english, value: 'en' },
  { label: uiText.value.japanese, value: 'jp' },
  { label: uiText.value.korean, value: 'kor' },
  { label: uiText.value.french, value: 'fra' },
  { label: uiText.value.german, value: 'de' },
  { label: uiText.value.russian, value: 'ru' },
  { label: uiText.value.traditionalChinese, value: 'cht' },
  { label: uiText.value.spanish, value: 'spa' },
  { label: uiText.value.portuguese, value: 'pt' },
  { label: uiText.value.italian, value: 'it' },
  { label: uiText.value.vietnamese, value: 'vie' },
  { label: uiText.value.thai, value: 'th' }
]);

const apiTypeLabels = computed<Record<string, string>>(() => ({
  general: uiText.value.generalApi,
  'large-model': uiText.value.largeModelApi,
  domain: uiText.value.domainApi,
  image: uiText.value.imageApi
}));

const sourceLanguageOptions = computed(() => languageOptions.value);
const targetLanguageOptions = computed(() => languageOptions.value.filter(option => option.value !== 'auto'));
const currentApiTypeLabel = computed(() => apiTypeLabels.value[currentApiType.value] || currentApiType.value);

const presetQuickActionLabels = computed<Record<QuickActionPresetName, string>>(() => ({
  'clean-all': uiText.value.cleanAll,
  'full-to-half': uiText.value.fullToHalf,
  'remove-refs': uiText.value.removeRefs,
  'add-space': uiText.value.addSpace
}));
const enabledQuickActions = computed<QuickAction[]>(() => quickActionConfigs.value
  .filter(action => action.enabled)
  .map(action => ({
    id: action.id,
    label: action.name || (action.presetName ? presetQuickActionLabels.value[action.presetName] : action.id),
    processorIds: action.processorIds,
    customRuleIds: action.customRuleIds
  })));
const displayedQuickActions = computed(() => quickActionsExpanded.value
  ? enabledQuickActions.value
  : enabledQuickActions.value.slice(0, 4));

onMounted(async () => {
  stopWatchingSystemTheme = watchSystemTheme(() => updateResolvedTheme());
  await loadLastActiveTab();
  try {
    await loadConfig();
  } catch (error) {
    errorMessage.value = `${uiText.value.loadFailed}: ${getErrorMessage(error)}`;
  }

  await loadCopyUnlockState();
  await refreshSecondaryData();
});

onUnmounted(() => stopWatchingSystemTheme());

async function loadLastActiveTab() {
  try {
    const stored = await chrome.storage.local.get(LAST_TAB_STORAGE_KEY);
    const savedTab = stored[LAST_TAB_STORAGE_KEY];
    if (savedTab === 'process' || savedTab === 'translate' || savedTab === 'ocr' || savedTab === 'history') {
      activeTab.value = savedTab;
    }
  } catch (error) {
    console.warn('Failed to load the last popup tab:', error);
  }
}

async function selectTab(tab: PopupTab) {
  activeTab.value = tab;
  statusMessage.value = '';
  errorMessage.value = '';
  try {
    await chrome.storage.local.set({ [LAST_TAB_STORAGE_KEY]: tab });
  } catch (error) {
    console.warn('Failed to save the last popup tab:', error);
  }
}

async function loadConfig() {
  const response = await sendRuntimeMessage<any>({ type: 'GET_CONFIG' }, {
    timeoutMs: 10000
  });
  const translation = response?.config?.translation;
  const ui = response?.config?.ui;
  quickActionConfigs.value = normalizeQuickActions(response?.config?.quickActions);

  uiLanguage.value = ui?.language === 'en-US' ? 'en-US' : 'zh-CN';
  uiSkin.value = normalizeSkin(ui?.skin);
  uiThemePreference.value = normalizeTheme(ui?.theme);
  updateResolvedTheme();

  if (!translation) {
    return;
  }

  sourceLang.value = translation.defaultSourceLang || 'auto';
  targetLang.value = translation.defaultTargetLang === 'auto' ? 'zh' : translation.defaultTargetLang || 'zh';
  currentApiType.value = translation.apiKeys?.baidu?.apiType || 'general';
}

function updateResolvedTheme() {
  resolvedTheme.value = resolveTheme(uiSkin.value, uiThemePreference.value, systemPrefersDark());
}

async function loadCopyUnlockState() {
  copyUnlockLoading.value = true;
  copyUnlockError.value = '';

  try {
    const response = await sendRuntimeMessage<{ success?: boolean; enabled?: boolean; error?: string }>({
      type: 'GET_COPY_UNLOCK_STATE'
    }, { timeoutMs: 15000 });
    if (response?.success === false) {
      throw new Error(response.error || uiText.value.copyUnlockUnavailable);
    }

    copyUnlockEnabled.value = Boolean(response?.enabled);
    copyUnlockAvailable.value = true;
  } catch (error) {
    copyUnlockEnabled.value = false;
    copyUnlockAvailable.value = false;
    copyUnlockError.value = `${uiText.value.copyUnlockUnavailable}: ${getErrorMessage(error)}`;
  } finally {
    copyUnlockLoading.value = false;
  }
}

async function toggleCopyUnlock() {
  copyUnlockLoading.value = true;
  copyUnlockError.value = '';

  try {
    const response = await sendRuntimeMessage<{ success?: boolean; enabled?: boolean; error?: string }>({
      type: 'SET_COPY_UNLOCK_STATE',
      enabled: !copyUnlockEnabled.value
    }, { timeoutMs: 30000 });
    if (response?.success === false) {
      throw new Error(response.error || uiText.value.copyUnlockFailed);
    }

    copyUnlockEnabled.value = Boolean(response?.enabled);
    copyUnlockAvailable.value = true;
  } catch (error) {
    copyUnlockError.value = `${uiText.value.copyUnlockFailed}: ${getErrorMessage(error)}`;
  } finally {
    copyUnlockLoading.value = false;
  }
}

async function loadHistory() {
  const response = await sendRuntimeMessage<any>({
    type: 'GET_HISTORY',
    limit: 6
  }, {
    timeoutMs: 10000
  });

  if (response?.history) {
    recentHistory.value = response.history.map((entry: any) => ({
      id: entry.id,
      preview: createPreview(entry.processedText),
      timestamp: entry.timestamp,
      text: entry.processedText
    }));
  }
}

async function loadAiRules() {
  const response = await sendRuntimeMessage<{ rules?: AiProcessingRule[] }>({ type: 'GET_AI_RULES' }, { timeoutMs: 10000 });
  aiRules.value = (response.rules || []).filter(rule => rule.isActive);
  if (!aiRules.value.some(rule => rule.id === selectedAiRuleId.value)) {
    selectedAiRuleId.value = aiRules.value[0]?.id || '';
  }
}

async function loadLastScreenshotTranslation() {
  const response = await sendRuntimeMessage<any>({
    type: 'GET_LAST_SCREENSHOT_IMAGE_TRANSLATION'
  }, {
    timeoutMs: 10000
  });

  if (response?.success && response.result) {
    lastScreenshotResult.value = response.result;
  }
}

async function processInput() {
  await runTask(uiText.value.processing, async () => {
    const response = await sendRuntimeMessage<any>({
      type: 'PROCESS_TEXT',
      text: processInputText.value,
      options: {
        context: { source: 'manual' }
      }
    }, {
      timeoutMs: 90000,
      timeoutMessage: uiText.value.processTimeout
    });

    processResultText.value = response.result.text;
    statusMessage.value = uiText.value.processDone.replace('{count}', String(response.result.processorsUsed.length));
  });
}

async function executeQuickAction(action: QuickAction) {
  await runTask(uiText.value.processing, async () => {
    let response: { result: { text: string; processorsUsed: string[] }; skippedItems?: unknown[] };
    try {
      response = await sendRuntimeMessage({
        type: 'RUN_QUICK_ACTION',
        actionId: action.id,
        text: processInputText.value,
      }, {
        timeoutMs: 90000,
        timeoutMessage: uiText.value.quickProcessTimeout
      });
    } catch (error) {
      if (!isUnknownMessageError(error)) throw error;
      if (action.customRuleIds.length > 0) {
        throw new Error(uiText.value.quickActionReloadRequired);
      }
      response = await sendRuntimeMessage({
        type: 'PROCESS_TEXT',
        text: processInputText.value,
        options: {
          processors: action.processorIds,
          context: { source: 'manual' }
        }
      }, {
        timeoutMs: 90000,
        timeoutMessage: uiText.value.quickProcessTimeout
      });
    }

    processResultText.value = response.result.text;
    const skipped = response.skippedItems?.length || 0;
    statusMessage.value = uiText.value.actionDone.replace('{action}', action.label) +
      (skipped ? uiText.value.skippedQuickItems.replace('{count}', String(skipped)) : '');
  });
}

function isUnknownMessageError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return message.includes('未知消息类型') || message.includes('Unknown message type');
}

async function processInputWithAi() {
  await runTask(uiText.value.aiProcessingRunning, async () => {
    const response = await sendRuntimeMessage<any>({
      type: 'AI_PROCESS_TEXT',
      text: processInputText.value,
      ruleId: selectedAiRuleId.value
    }, {
      timeoutMs: 190000,
      timeoutMessage: 'AI 处理超时'
    });
    processResultText.value = response.result.text;
    statusMessage.value = uiText.value.aiProcessingDone;
  });
}

async function translateInput() {
  await runTask(uiText.value.translating, async () => {
    if (currentApiType.value === 'image') {
      throw new Error(uiText.value.imageApiSelected);
    }

    const response = await sendRuntimeMessage<any>({
      type: 'TRANSLATE_TEXT',
      text: translationInputText.value,
      from: sourceLang.value,
      to: targetLang.value
    }, {
      timeoutMs: 90000,
      timeoutMessage: uiText.value.translateTimeout
    });

    translationResultText.value = response.result.text;
    statusMessage.value = response.result.cached ? uiText.value.translateCached : uiText.value.translateDone;
  });
}

async function pasteProcessText() {
  await runTask(uiText.value.readingClipboard, async () => {
    processInputText.value = await navigator.clipboard.readText();
    statusMessage.value = uiText.value.clipboardPasted;
  });
}

async function pasteTranslationText() {
  await runTask(uiText.value.readingClipboard, async () => {
    translationInputText.value = await navigator.clipboard.readText();
    statusMessage.value = uiText.value.clipboardPasted;
  });
}

function clearProcessText() {
  processInputText.value = '';
  processResultText.value = '';
  statusMessage.value = '';
  errorMessage.value = '';
}

function clearTranslationText() {
  translationInputText.value = '';
  translationResultText.value = '';
  statusMessage.value = '';
  errorMessage.value = '';
}

function swapLanguages() {
  if (sourceLang.value === 'auto') {
    errorMessage.value = uiText.value.autoCannotSwap;
    return;
  }

  const previousSource = sourceLang.value;
  sourceLang.value = targetLang.value;
  targetLang.value = previousSource;

  const previousText = translationInputText.value;
  translationInputText.value = translationResultText.value;
  translationResultText.value = previousText;
}

async function startScreenshotImageTranslation() {
  await runTask(uiText.value.screenshotSelecting, async () => {
    const response = await sendRuntimeMessage<any>({
      type: 'START_SCREENSHOT_IMAGE_TRANSLATION',
      from: sourceLang.value,
      to: targetLang.value
    }, {
      timeoutMs: 15000,
      timeoutMessage: uiText.value.screenshotStartTimeout
    });

    statusMessage.value = uiText.value.screenshotStarted;
  });
}

async function startScreenshotOcr() {
  await runTask(uiLanguage.value === 'en-US' ? 'Select a page area...' : '请框选需要识别的网页区域...', async () => {
    await sendRuntimeMessage({ type: 'START_SCREENSHOT_OCR' }, {
      timeoutMs: 15000,
      timeoutMessage: uiLanguage.value === 'en-US' ? 'Starting screenshot OCR timed out' : '启动截图 OCR 超时'
    });
    statusMessage.value = uiLanguage.value === 'en-US'
      ? 'Selection mode started. Reopen the popup after selecting.'
      : '已进入框选模式，完成后重新打开弹窗查看结果';
  });
}

async function onImageSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) {
    imageDataUrl.value = '';
    imageFileName.value = '';
    return;
  }

  imageFileName.value = file.name;
  imageDataUrl.value = await fileToDataUrl(file);
}

async function translateSelectedImage() {
  await runTask(uiText.value.imageTranslating, async () => {
    const response = await sendRuntimeMessage<any>({
      type: 'TRANSLATE_IMAGE',
      dataUrl: imageDataUrl.value,
      from: sourceLang.value,
      to: targetLang.value
    }, {
      timeoutMs: 120000,
      timeoutMessage: uiText.value.imageTranslateTimeout
    });

    imageTranslationResultText.value = response.result.translatedText || response.result.imageUrl || '';
    statusMessage.value = uiText.value.imageTranslateDone;
  });
}

async function onOcrImageSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  ocrImageDataUrl.value = file ? await fileToDataUrl(file) : '';
  ocrImageFileName.value = file?.name || '';
}

async function recognizeSelectedImage() {
  await runTask(uiLanguage.value === 'en-US' ? 'Recognizing image...' : '正在识别图片...', async () => {
    const response = await sendRuntimeMessage<any>({
      type: 'OCR_IMAGE',
      dataUrl: ocrImageDataUrl.value,
      sourceName: ocrImageFileName.value || '[OCR uploaded image]'
    }, {
      timeoutMs: 60000,
      timeoutMessage: uiLanguage.value === 'en-US' ? 'OCR timed out' : 'OCR 识别超时'
    });
    lastOcrResult.value = response.result;
    statusMessage.value = response.result.text
      ? (uiLanguage.value === 'en-US' ? 'OCR text copied' : '识别文字已复制')
      : (uiLanguage.value === 'en-US' ? 'No text detected' : '未识别到文字');
  });
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
  statusMessage.value = uiText.value.resultCopied;
}

async function copyScreenshotTranslation() {
  if (!lastScreenshotResult.value?.translatedText) {
    return;
  }

  await navigator.clipboard.writeText(lastScreenshotResult.value.translatedText);
  statusMessage.value = uiText.value.screenshotTranslationCopied;
}

async function copyOcrResult() {
  if (!lastOcrResult.value?.text) return;
  await navigator.clipboard.writeText(lastOcrResult.value.text);
  statusMessage.value = uiLanguage.value === 'en-US' ? 'OCR text copied' : '识别文字已复制';
}

async function copyHistoryItem(item: HistoryPreview) {
  try {
    await navigator.clipboard.writeText(item.text);
    statusMessage.value = uiText.value.resultCopied;
    errorMessage.value = '';
  } catch (error) {
    errorMessage.value = `${uiText.value.operationFailed}: ${getErrorMessage(error)}`;
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(uiLanguage.value, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

async function runTask(loadingMessage: string, task: () => Promise<void>) {
  isBusy.value = true;
  statusMessage.value = loadingMessage;
  errorMessage.value = '';

  try {
    await task();
    await refreshSecondaryData();
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error) || uiText.value.operationFailed;
  } finally {
    isBusy.value = false;
  }
}

async function refreshSecondaryData() {
  const results = await Promise.allSettled([
    loadHistory(),
    loadLastScreenshotTranslation(),
    loadLastOcrResult(),
    loadAiRules()
  ]);

  results.forEach(result => {
    if (result.status === 'rejected') {
      console.warn('刷新插件辅助数据失败:', result.reason);
    }
  });
}

async function loadLastOcrResult() {
  const response = await sendRuntimeMessage<any>({ type: 'GET_LAST_OCR_RESULT' }, { timeoutMs: 10000 });
  lastOcrResult.value = response.result || null;
}

function createPreview(text: string): string {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  return normalized.length > 42 ? `${normalized.slice(0, 42)}...` : normalized;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}
</script>

<style scoped>
.popup-container {
  display: flex;
  flex-direction: column;
  width: 440px;
  height: 600px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--ctp-bg);
  color: var(--ctp-text);
}

.fixed-shell {
  flex: 0 0 auto;
  padding: 12px 14px 0;
  border-bottom: 1px solid var(--ctp-border);
  background: var(--ctp-bg);
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.popup-header h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.icon-btn,
.btn,
.action-btn,
.swap-btn,
.history-item {
  border: 1px solid var(--ctp-border);
  background: var(--ctp-surface);
  color: var(--ctp-text);
  cursor: pointer;
}

.icon-btn {
  padding: 6px 11px;
  border-radius: 8px;
  color: var(--ctp-text-muted);
  font-size: 12px;
}

.tab-nav {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.tab-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 42px;
  padding: 7px 4px 8px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--ctp-text-muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.tab-btn:hover {
  border-radius: 8px 8px 0 0;
  background: var(--ctp-surface-soft);
  color: var(--ctp-text);
}

.tab-btn.active {
  border-bottom-color: var(--ctp-primary);
  color: var(--ctp-primary);
  font-weight: 600;
}

.tab-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.popup-content {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 2px 14px 14px;
}

.section {
  margin-top: 12px;
}

.copy-unlock-section {
  margin-top: 10px;
}

.copy-unlock-section .btn {
  min-height: 44px;
  border-radius: 9px;
  font-weight: 600;
}

.feature-card,
.result-card {
  padding: 9px;
  border: 1px solid var(--ctp-border);
  border-radius: 8px;
  background: var(--ctp-surface);
}

.section-title {
  margin-bottom: 6px;
  color: var(--ctp-text-muted);
  font-size: 13px;
  font-weight: 600;
}

textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid var(--ctp-border);
  border-radius: 6px;
  resize: vertical;
  font-size: 13px;
  line-height: 1.5;
  background: var(--ctp-surface);
  color: var(--ctp-text);
}

.toolbar,
.lang-row,
.file-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.toolbar select {
  min-width: 0;
  flex: 1;
  padding: 7px;
  border: 1px solid var(--ctp-border);
  border-radius: 6px;
  background: var(--ctp-surface);
  color: var(--ctp-text);
}

.file-row {
  align-items: center;
}

.file-row input {
  min-width: 0;
  flex: 1;
  font-size: 12px;
}

.btn,
.swap-btn {
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 13px;
}

.full-width {
  width: 100%;
}

.btn.primary {
  border-color: var(--ctp-primary);
  background: var(--ctp-primary);
  color: var(--ctp-primary-text);
}

.btn.success {
  border-color: var(--ctp-success);
  background: var(--ctp-success);
  color: #fff;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.more-actions-btn {
  width: 100%;
  margin-top: 7px;
  padding: 6px;
  border: 0;
  background: transparent;
  color: var(--ctp-primary);
  cursor: pointer;
  font-size: 12px;
}

.action-btn {
  min-height: 34px;
  border-radius: 6px;
  font-size: 13px;
}

.lang-row select {
  flex: 1;
  min-width: 0;
  padding: 7px;
  border: 1px solid var(--ctp-border);
  border-radius: 6px;
  background: var(--ctp-surface);
  color: var(--ctp-text);
}

.hint,
.empty,
.meta {
  margin-top: 6px;
  color: var(--ctp-text-muted);
  font-size: 12px;
}

.screenshot-result {
  padding: 9px;
  border: 1px solid var(--ctp-border);
  border-radius: 8px;
  background: var(--ctp-surface-soft);
}

.sub-result {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.error-text {
  color: var(--ctp-error);
}

.status {
  margin-top: 10px;
  padding: 8px;
  border-radius: 6px;
  background: var(--ctp-secondary-soft);
  color: var(--ctp-secondary);
  font-size: 12px;
}

.status.error {
  background: #fff1f2;
  color: var(--ctp-error);
}

.result-content {
  max-height: 160px;
  overflow: auto;
  padding: 9px;
  border-radius: 6px;
  background: var(--ctp-surface-soft);
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  color: var(--ctp-text);
}

.ocr-result-content {
  max-height: 250px;
}

.history-section {
  margin-top: 10px;
}

.history-item {
  display: grid;
  gap: 3px;
  width: 100%;
  margin-bottom: 5px;
  padding: 7px;
  border-radius: 6px;
  text-align: left;
}

.history-item small {
  color: var(--ctp-text-muted);
}

.popup-container[data-ctp-skin='sunflower'] {
  border: 1px solid var(--ctp-border);
}

.popup-container[data-ctp-skin='sunflower']::before {
  display: none;
}

.popup-container[data-ctp-skin='sunflower'] .fixed-shell {
  background: rgba(255, 250, 240, 0.94);
}

.popup-container[data-ctp-skin='sunflower'] .section {
  padding: 9px;
  border: 1px solid rgba(228, 215, 182, 0.72);
  border-radius: 8px;
  background: rgba(255, 253, 247, 0.72);
}

.popup-container[data-ctp-skin='sunflower'] .copy-unlock-section {
  padding: 0;
  border: 0;
  background: transparent;
}

.popup-container[data-ctp-skin='sunflower'] .icon-btn,
.popup-container[data-ctp-skin='sunflower'] .btn,
.popup-container[data-ctp-skin='sunflower'] .action-btn,
.popup-container[data-ctp-skin='sunflower'] .swap-btn,
.popup-container[data-ctp-skin='sunflower'] .history-item {
  border-color: var(--ctp-border);
}

.popup-container {
  background: var(--ctp-bg);
}

.fixed-shell {
  position: relative;
  overflow: hidden;
  background: color-mix(in srgb, var(--ctp-bg) 92%, var(--ctp-surface));
}

.popup-header,
.tab-nav {
  position: relative;
  z-index: 1;
}

.popup-header h1 {
  color: var(--ctp-text);
}

.popup-content {
  scrollbar-color: var(--ctp-border-strong) transparent;
}

.section,
.feature-card,
.result-card,
.screenshot-result {
  padding: 10px;
  border: 1px solid var(--ctp-border);
  border-top: 2px solid var(--ctp-border-strong);
  border-radius: 8px;
  background: var(--ctp-surface);
  box-shadow: var(--ctp-shadow);
}

.copy-unlock-section {
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.result-card,
.screenshot-result {
  border-top-color: var(--ctp-secondary);
}

.section-title {
  color: var(--ctp-text-soft);
  letter-spacing: 0.02em;
}

textarea,
select,
.result-content {
  border-color: var(--ctp-border);
  background: var(--ctp-surface-clean);
  color: var(--ctp-text);
}

textarea:focus,
select:focus,
button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--ctp-secondary) 52%, transparent);
  outline-offset: 2px;
}

.btn,
.action-btn,
.swap-btn,
.icon-btn,
.history-item {
  border-color: var(--ctp-border);
  background: var(--ctp-surface-clean);
  color: var(--ctp-text);
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.btn:hover:not(:disabled),
.action-btn:hover:not(:disabled),
.swap-btn:hover:not(:disabled),
.icon-btn:hover:not(:disabled),
.history-item:hover {
  border-color: var(--ctp-border-strong);
  background: var(--ctp-surface-soft);
}

.btn.primary {
  color: var(--ctp-primary-text);
}

.btn.success {
  border-color: var(--ctp-success);
  background: var(--ctp-success);
  color: var(--ctp-primary-text);
}

.status {
  border-left: 3px solid var(--ctp-secondary);
  border-radius: 0 6px 6px 0;
  background: var(--ctp-secondary-soft);
}

.status.error {
  border-left-color: var(--ctp-error);
  background: var(--ctp-error-soft);
}

.history-item {
  border-width: 0 0 1px;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.empty {
  min-height: 96px;
  padding: 18px 120px 18px 4px;
  background-position: right center;
  background-repeat: no-repeat;
  background-size: 112px auto;
}

.popup-container[data-ctp-skin='sunflower'] .fixed-shell::after {
  content: '';
  position: absolute;
  top: -6px;
  right: -10px;
  width: 250px;
  height: 100px;
  pointer-events: none;
  background: url('/themes/sunflower/extension/popup-botanical.webp') right top / 250px 100px no-repeat;
  opacity: 0.48;
  -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.38) 45%, #000 78%);
  mask-image: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.38) 45%, #000 78%);
}

.popup-container[data-ctp-skin='sunflower'] .fixed-shell {
  background:
    linear-gradient(rgba(251, 248, 240, 0.9), rgba(251, 248, 240, 0.95)),
    url('/themes/sunflower/extension/paper-grain.webp') center / 480px;
}

.popup-container[data-ctp-skin='sunflower'] .tab-btn.active {
  position: relative;
  border-bottom-color: var(--ctp-secondary);
  color: var(--ctp-secondary);
}

.popup-container[data-ctp-skin='sunflower'] .tab-btn.active::after {
  content: '';
  position: absolute;
  right: 10px;
  bottom: -5px;
  left: 10px;
  height: 10px;
  pointer-events: none;
  background: url('/themes/sunflower/extension/paint-stroke.webp') center / 100% 100% no-repeat;
  opacity: 0.32;
}

.popup-container[data-ctp-skin='sunflower'] .section,
.popup-container[data-ctp-skin='sunflower'] .feature-card,
.popup-container[data-ctp-skin='sunflower'] .result-card,
.popup-container[data-ctp-skin='sunflower'] .screenshot-result {
  border-color: var(--ctp-border);
  border-top-color: var(--ctp-border-strong);
  background:
    linear-gradient(rgba(255, 253, 248, 0.965), rgba(255, 253, 248, 0.965)),
    url('/themes/sunflower/extension/paper-grain.webp') center / 480px;
}

.popup-container[data-ctp-skin='sunflower'] .result-card,
.popup-container[data-ctp-skin='sunflower'] .screenshot-result {
  border-top-color: var(--ctp-secondary);
}

.popup-container[data-ctp-skin='sunflower'] .copy-unlock-section {
  border: 0;
  background: transparent;
}

.popup-container[data-ctp-skin='sunflower'] .empty {
  background-image: url('/themes/sunflower/extension/compact-empty.webp');
}
</style>
