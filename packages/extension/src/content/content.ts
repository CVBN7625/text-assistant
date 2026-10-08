import { normalizeSkin, normalizeTheme, resolveTheme, systemPrefersDark } from '../theme/skins';

type ContentMessage =
  | { type: 'GET_SELECTION' }
  | { type: 'REPLACE_SELECTION'; text: string }
  | { type: 'PASTE_TEXT'; text: string }
  | { type: 'WRITE_CLIPBOARD'; text: string }
  | { type: 'FETCH_IMAGE_AS_DATA_URL'; srcUrl: string }
  | { type: 'START_SCREENSHOT_SELECTION'; sessionId: string }
  | {
      type: 'CROP_SCREENSHOT_TO_DATA_URL';
      screenshotDataUrl: string;
      rect: ScreenshotRect;
    };

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

type ExtensionConfig = {
  translation?: {
    defaultSourceLang?: string;
    defaultTargetLang?: string;
  };
  ui?: {
    skin?: 'classic' | 'sunflower';
    theme?: 'light' | 'dark' | 'auto';
    selectionAutomationEnabled?: boolean;
    selectionAutoProcessEnabled?: boolean;
    selectionAutoTranslateEnabled?: boolean;
    selectionActionMaxLength?: number;
    selectionAutoTranslateMaxLength?: number;
    language?: string;
  };
};

type ProcessingResult = {
  text: string;
  originalText: string;
  processorsUsed: string[];
  processingTime: number;
};

type TranslationResult = {
  text: string;
  from: string;
  to: string;
  cached?: boolean;
};

type SelectionAction = 'process' | 'translate';

type SelectionTaskState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  text: string;
  detail?: string;
  copied?: boolean;
  copyError?: boolean;
  copyMessage?: string;
};

type SelectionPanelState = {
  text: string;
  range: Range;
  key: string;
  requestId: number;
  process: SelectionTaskState;
  translate: SelectionTaskState;
};

const SELECTION_ACTION_DEBOUNCE_MS = 650;
const SELECTION_ACTION_HOVER_OPEN_MS = 500;
const SELECTION_ACTION_MIN_LENGTH = 2;
const SELECTION_ACTION_DEFAULT_MAX_LENGTH = 1200;
const SELECTION_ACTION_ICON_ID = 'ctp-selection-action-icon';
const SELECTION_ACTION_PANEL_ID = 'ctp-selection-action-panel';
const RUNTIME_MESSAGE_TIMEOUT_MS = 30000;

const contentMessages = {
  'zh-CN': {
    actionTitle: '划词操作',
    actionIcon: '文',
    close: '关闭',
    process: '处理',
    translate: '翻译',
    processResult: '处理结果',
    translationResult: '翻译结果',
    processing: '正在处理...',
    translating: '正在翻译...',
    operationFailed: '操作失败',
    emptyResult: '结果为空',
    copied: '已复制',
    copy: '复制',
    processTimeout: '处理超时，请检查启用的处理器或重新加载插件后重试',
    processorsUsed: '已使用 {count} 个处理器',
    translateTimeout: '翻译超时，请检查网络或重新加载插件后重试',
    fromCache: '来自缓存',
    copiedToClipboard: '已复制到剪贴板',
    copyFailed: '复制失败',
    pluginUpdated: '插件已更新，请刷新当前网页后重试',
    screenshotTip: '拖拽选择要翻译的图片区域，按 Esc 取消'
  },
  'en-US': {
    actionTitle: 'Selection actions',
    actionIcon: 'T',
    close: 'Close',
    process: 'Process',
    translate: 'Translate',
    processResult: 'Processed text',
    translationResult: 'Translation',
    processing: 'Processing...',
    translating: 'Translating...',
    operationFailed: 'Operation failed',
    emptyResult: 'No result',
    copied: 'Copied',
    copy: 'Copy',
    processTimeout: 'Processing timed out. Check enabled processors or reload the extension and try again.',
    processorsUsed: 'Used {count} processors',
    translateTimeout: 'Translation timed out. Check network or reload the extension and try again.',
    fromCache: 'From cache',
    copiedToClipboard: 'Copied to clipboard',
    copyFailed: 'Copy failed',
    pluginUpdated: 'The extension was updated. Refresh this page and try again.',
    screenshotTip: 'Drag to select an image area to translate. Press Esc to cancel.'
  }
} as const;

let activeScreenshotSelectionCleanup: (() => void) | null = null;
let extensionConfig: ExtensionConfig | null = null;
let selectionActionTimer: number | null = null;
let selectionIconHoverTimer: number | null = null;
let lastSelectionText = '';
let lastSelectionKey = '';
let activeSelectionRequestId = 0;
let selectionPanelState: SelectionPanelState | null = null;
let selectionPanelPinned = false;

function getContentText(): (typeof contentMessages)[keyof typeof contentMessages] {
  return extensionConfig?.ui?.language === 'en-US'
    ? contentMessages['en-US']
    : contentMessages['zh-CN'];
}

function getActiveSkin(): 'classic' | 'sunflower' {
  return normalizeSkin(extensionConfig?.ui?.skin);
}

function applySkinClass(element: HTMLElement): void {
  const skin = getActiveSkin();
  const theme = resolveTheme(skin, normalizeTheme(extensionConfig?.ui?.theme), systemPrefersDark());
  const isSunflower = skin === 'sunflower';
  element.classList.toggle('ctp-skin-sunflower', isSunflower);
  element.classList.toggle('ctp-skin-classic', !isSunflower);
  element.classList.toggle('ctp-theme-dark', theme === 'dark');
  element.classList.toggle('ctp-theme-light', theme === 'light');
}

function updateExistingSkinClasses(): void {
  [
    document.getElementById(SELECTION_ACTION_ICON_ID),
    document.getElementById(SELECTION_ACTION_PANEL_ID),
    document.getElementById('ctp-screenshot-overlay')
  ].forEach(element => {
    if (element instanceof HTMLElement) {
      applySkinClass(element);
    }
  });
}

function sendRuntimeMessage<T = unknown>(
  message: unknown,
  options: {
    timeoutMs?: number;
    timeoutMessage?: string;
  } = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? RUNTIME_MESSAGE_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(options.timeoutMessage || '后台服务无响应，请重新加载插件后重试'));
    }, timeoutMs);

    try {
      chrome.runtime.sendMessage<{ success?: boolean; error?: string }>(message, response => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);

        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(formatContentRuntimeError(lastError.message)));
          return;
        }

        if (response == null) {
          reject(new Error('后台没有返回结果，请重新加载插件后重试'));
          return;
        }

        if (response.success === false) {
          reject(new Error(response.error || '后台处理失败'));
          return;
        }

        resolve(response as T);
      });
    } catch (error) {
      settled = true;
      window.clearTimeout(timeoutId);
      reject(new Error(formatContentRuntimeError(getContentErrorMessage(error))));
    }
  });
}

chrome.runtime.onMessage.addListener((message: ContentMessage, sender, sendResponse) => {
  if (
    window.top !== window &&
    (message.type === 'START_SCREENSHOT_SELECTION' || message.type === 'CROP_SCREENSHOT_TO_DATA_URL')
  ) {
    return false;
  }

  void handleMessage(message)
    .then(result => sendResponse(result))
    .catch(error => sendResponse({ success: false, error: getContentErrorMessage(error) }));

  return true;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.processorConfig) {
    extensionConfig = changes.processorConfig.newValue || null;
    updateExistingSkinClasses();
    if (!isSelectionAutomationEnabled()) {
      removeSelectionActionUi();
    }
  }
});

void loadExtensionConfig();
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', updateExistingSkinClasses);
document.addEventListener('selectionchange', () => {
  if (!selectionPanelPinned) {
    scheduleSelectionActionIcon();
  }
}, true);
document.addEventListener('mouseup', event => {
  if (!isSelectionActionTarget(event.target) && !selectionPanelPinned) {
    scheduleSelectionActionIcon();
  }
}, true);
document.addEventListener('keyup', event => {
  if (
    !selectionPanelPinned &&
    (event.shiftKey || event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End')
  ) {
    scheduleSelectionActionIcon();
  }
}, true);
document.addEventListener('mousedown', event => {
  if (isSelectionActionTarget(event.target)) {
    return;
  }

  removeSelectionActionUi();
}, true);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    removeSelectionActionUi();
  }
}, true);

async function handleMessage(message: ContentMessage): Promise<any> {
  switch (message.type) {
    case 'GET_SELECTION':
      return { text: getSelectedText() };
    case 'REPLACE_SELECTION':
      replaceSelection(message.text);
      return { success: true };
    case 'PASTE_TEXT':
      pasteText(message.text);
      return { success: true };
    case 'WRITE_CLIPBOARD':
      await navigator.clipboard.writeText(message.text);
      return { success: true };
    case 'FETCH_IMAGE_AS_DATA_URL':
      return await fetchImageAsDataUrl(message.srcUrl);
    case 'START_SCREENSHOT_SELECTION':
      startScreenshotSelection(message.sessionId);
      return { success: true };
    case 'CROP_SCREENSHOT_TO_DATA_URL':
      return await cropScreenshotToDataUrl(message.screenshotDataUrl, message.rect);
    default:
      return { success: false, error: '未知消息类型' };
  }
}

function getSelectedText(): string {
  const activeElement = document.activeElement;

  if (isTextInput(activeElement)) {
    const start = activeElement.selectionStart ?? 0;
    const end = activeElement.selectionEnd ?? 0;
    return activeElement.value.slice(start, end);
  }

  return window.getSelection()?.toString() || '';
}

async function loadExtensionConfig(): Promise<void> {
  try {
    const response = await sendRuntimeMessage<{ config?: ExtensionConfig }>({ type: 'GET_CONFIG' }, {
      timeoutMs: 10000
    });
    extensionConfig = response?.config || null;
  } catch (error) {
    console.warn('加载划词翻译配置失败:', error);
  }
}

function scheduleSelectionActionIcon(): void {
  clearSelectionActionTimer();
  clearSelectionIconHoverTimer();

  if (!isSelectionAutomationEnabled() || activeScreenshotSelectionCleanup) {
    removeSelectionActionUi();
    return;
  }

  selectionActionTimer = window.setTimeout(() => {
    selectionActionTimer = null;
    handleSelectionActionIcon();
  }, SELECTION_ACTION_DEBOUNCE_MS);
}

function isSelectionActionTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(
    target.closest(`#${SELECTION_ACTION_ICON_ID}`) ||
    target.closest(`#${SELECTION_ACTION_PANEL_ID}`)
  );
}

function handleSelectionActionIcon(): void {
  if (!isSelectionAutomationEnabled() || document.hidden) {
    removeSelectionActionUi();
    return;
  }

  const selection = window.getSelection();
  const text = normalizeSelectedText(selection?.toString() || '');
  const range = getStableSelectionRange(selection);

  if (!text || !range || !shouldOfferSelectionAction(text)) {
    removeSelectionActionUi();
    return;
  }

  const selectionKey = createSelectionKey(text, range);
  if (selectionKey === lastSelectionKey && selectionPanelState) {
    positionSelectionActionUi(selectionPanelState.range);
    return;
  }

  lastSelectionKey = selectionKey;
  lastSelectionText = text;
  selectionPanelState = {
    text,
    range,
    key: selectionKey,
    requestId: ++activeSelectionRequestId,
    process: createIdleTaskState(),
    translate: createIdleTaskState()
  };

  removeSelectionActionPanel();
  showSelectionActionIcon(range);
}

function isSelectionAutomationEnabled(): boolean {
  return Boolean(
    extensionConfig?.ui?.selectionAutomationEnabled ??
      extensionConfig?.ui?.selectionAutoTranslateEnabled
  );
}

function shouldOfferSelectionAction(text: string): boolean {
  const maxLength = extensionConfig?.ui?.selectionActionMaxLength ??
    extensionConfig?.ui?.selectionAutoTranslateMaxLength ??
    SELECTION_ACTION_DEFAULT_MAX_LENGTH;

  if (text.length < SELECTION_ACTION_MIN_LENGTH || text.length > maxLength) {
    return false;
  }

  if (/^[\d\s.,:;!?()[\]{}'"“”‘’\-+*/\\|_]+$/.test(text)) {
    return false;
  }

  const activeElement = document.activeElement;
  if (isTextInput(activeElement)) {
    return false;
  }

  return true;
}

function getStableSelectionRange(selection: Selection | null): Range | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = getSelectionRangeRect(range);

  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return range.cloneRange();
}

function getSelectionRangeRect(range: Range): DOMRect {
  const rect = range.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    return rect;
  }

  return range.getClientRects()[0] || rect;
}

function normalizeSelectedText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeTargetLanguage(language?: string): string {
  return !language || language === 'auto' ? 'zh' : language;
}

function createSelectionKey(text: string, range: Range): string {
  const rect = getSelectionRangeRect(range);
  return `${text}@@${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.right)},${Math.round(rect.bottom)}`;
}

function createIdleTaskState(): SelectionTaskState {
  return {
    status: 'idle',
    text: ''
  };
}

function showSelectionActionIcon(range: Range): void {
  const text = getContentText();
  const icon = getOrCreateSelectionActionIcon();
  icon.title = text.actionTitle;
  icon.textContent = text.actionIcon;
  positionSelectionActionIcon(icon, getSelectionRangeRect(range));
}

function getOrCreateSelectionActionIcon(): HTMLButtonElement {
  const existing = document.getElementById(SELECTION_ACTION_ICON_ID);
  if (existing instanceof HTMLButtonElement) {
    applySkinClass(existing);
    return existing;
  }

  const icon = document.createElement('button');
  icon.id = SELECTION_ACTION_ICON_ID;
  applySkinClass(icon);
  icon.type = 'button';
  icon.addEventListener('mousedown', event => {
    event.preventDefault();
    event.stopPropagation();
  }, true);
  icon.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    openSelectionActionPanel();
  });
  icon.addEventListener('mouseenter', () => {
    clearSelectionIconHoverTimer();
    selectionIconHoverTimer = window.setTimeout(() => {
      selectionIconHoverTimer = null;
      openSelectionActionPanel();
    }, SELECTION_ACTION_HOVER_OPEN_MS);
  });
  icon.addEventListener('mouseleave', clearSelectionIconHoverTimer);
  document.documentElement.appendChild(icon);
  return icon;
}

function openSelectionActionPanel(): void {
  clearSelectionIconHoverTimer();

  if (!selectionPanelState) {
    return;
  }

  selectionPanelPinned = true;
  clearSelectionActionTimer();
  renderSelectionActionPanel();

  if (extensionConfig?.ui?.selectionAutoProcessEnabled && selectionPanelState.process.status === 'idle') {
    void runSelectionAction('process', true);
  }

  if (extensionConfig?.ui?.selectionAutoTranslateEnabled && selectionPanelState.translate.status === 'idle') {
    void runSelectionAction('translate', !extensionConfig?.ui?.selectionAutoProcessEnabled);
  }
}

function renderSelectionActionPanel(): void {
  if (!selectionPanelState) {
    return;
  }

  const panel = getOrCreateSelectionActionPanel();
  const state = selectionPanelState;
  const text = getContentText();
  const processDisabled = state.process.status === 'loading';
  const translateDisabled = state.translate.status === 'loading';

  panel.innerHTML = [
    '<div class="ctp-selection-action-header">',
    `<span>${escapeHtml(text.actionTitle)}</span>`,
    `<button type="button" class="ctp-selection-action-close" title="${escapeHtml(text.close)}">×</button>`,
    '</div>',
    '<div class="ctp-selection-action-toolbar">',
    `<button type="button" data-ctp-action="process" ${processDisabled ? 'disabled' : ''}>${escapeHtml(text.process)}</button>`,
    `<button type="button" data-ctp-action="translate" ${translateDisabled ? 'disabled' : ''}>${escapeHtml(text.translate)}</button>`,
    '</div>',
    renderSelectionTask('process', text.processResult, state.process),
    renderSelectionTask('translate', text.translationResult, state.translate),
  ].join('');

  panel.querySelector<HTMLButtonElement>('.ctp-selection-action-close')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    removeSelectionActionUi();
  });

  panel.querySelectorAll<HTMLButtonElement>('[data-ctp-action]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const action = button.dataset.ctpAction as SelectionAction | undefined;
      if (action) {
        void runSelectionAction(action, true);
      }
    });
  });

  panel.querySelectorAll<HTMLButtonElement>('[data-ctp-copy-action]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const action = button.dataset.ctpCopyAction as SelectionAction | undefined;
      if (action) {
        void copySelectionActionResult(action);
      }
    });
  });

  positionSelectionActionPanel(panel, getSelectionRangeRect(state.range));
}

function renderSelectionTask(action: SelectionAction, title: string, task: SelectionTaskState): string {
  if (task.status === 'idle') {
    return '';
  }

  const text = getContentText();
  const statusClass = task.status === 'error' ? ' ctp-selection-action-result-error' : '';
  const loadingText = action === 'process' ? text.processing : text.translating;
  const bodyText = task.status === 'loading'
    ? loadingText
    : task.text || (task.status === 'error' ? text.operationFailed : text.emptyResult);
  const copyButton = task.status === 'success'
    ? `<button type="button" data-ctp-copy-action="${action}">${task.copied ? escapeHtml(text.copied) : escapeHtml(text.copy)}</button>`
    : '';
  const detail = task.copyMessage || task.detail;
  const detailClass = task.copyError ? ' ctp-selection-action-copy-error' : '';

  return [
    `<section class="ctp-selection-action-result${statusClass}">`,
    '<div class="ctp-selection-action-result-header">',
    `<span>${escapeHtml(title)}</span>`,
    copyButton,
    '</div>',
    `<div class="ctp-selection-action-result-body">${escapeHtml(bodyText)}</div>`,
    detail ? `<div class="ctp-selection-action-result-detail${detailClass}">${escapeHtml(detail)}</div>` : '',
    '</section>'
  ].join('');
}

function getOrCreateSelectionActionPanel(): HTMLDivElement {
  const existing = document.getElementById(SELECTION_ACTION_PANEL_ID);
  if (existing instanceof HTMLDivElement) {
    applySkinClass(existing);
    return existing;
  }

  const panel = document.createElement('div');
  panel.id = SELECTION_ACTION_PANEL_ID;
  applySkinClass(panel);
  panel.addEventListener('mousedown', event => {
    event.preventDefault();
    event.stopPropagation();
  }, true);
  document.documentElement.appendChild(panel);
  return panel;
}

async function runSelectionAction(action: SelectionAction, copyAfterSuccess: boolean): Promise<void> {
  const state = selectionPanelState;
  if (!state || state[action].status === 'loading') {
    return;
  }

  const requestId = state.requestId;
  const text = getContentText();
  state[action] = {
    status: 'loading',
    text: ''
  };
  renderSelectionActionPanel();

  try {
    if (action === 'process') {
      const response = await sendRuntimeMessage<{ result?: ProcessingResult }>({
        type: 'PROCESS_TEXT',
        text: state.text,
        options: {
          context: { source: 'selection' }
        }
      }, {
        timeoutMs: 90000,
        timeoutMessage: text.processTimeout
      });
      updateSelectionTaskResult(requestId, action, {
        status: 'success',
        text: response.result?.text || '',
        detail: text.processorsUsed.replace('{count}', String(response.result?.processorsUsed.length ?? 0))
      });
      if (copyAfterSuccess) {
        await copySelectionActionResult(action, requestId);
      }
      return;
    }

    const response = await sendRuntimeMessage<{ result?: TranslationResult }>({
      type: 'TRANSLATE_TEXT',
      text: state.text,
      from: extensionConfig?.translation?.defaultSourceLang || 'auto',
      to: normalizeTargetLanguage(extensionConfig?.translation?.defaultTargetLang)
    }, {
      timeoutMs: 90000,
      timeoutMessage: text.translateTimeout
    });

    updateSelectionTaskResult(requestId, action, {
      status: 'success',
      text: response.result?.text || '',
      detail: response.result?.cached ? text.fromCache : undefined
    });
    if (copyAfterSuccess) {
      await copySelectionActionResult(action, requestId);
    }
  } catch (error) {
    updateSelectionTaskResult(requestId, action, {
      status: 'error',
      text: getContentErrorMessage(error)
    });
  }
}

function updateSelectionTaskResult(
  requestId: number,
  action: SelectionAction,
  nextTask: SelectionTaskState
): void {
  if (!selectionPanelState || selectionPanelState.requestId !== requestId) {
    return;
  }

  selectionPanelState[action] = nextTask;
  renderSelectionActionPanel();
}

async function copySelectionActionResult(action: SelectionAction, expectedRequestId?: number): Promise<void> {
  const state = selectionPanelState;
  const task = state?.[action];
  if (!state || (expectedRequestId !== undefined && state.requestId !== expectedRequestId) || !task?.text) {
    return;
  }

  try {
    await sendRuntimeMessage({
      type: 'COPY_TEXT',
      text: task.text
    }, {
      timeoutMs: 10000
    });
    task.copied = true;
    task.copyError = false;
    task.copyMessage = getContentText().copiedToClipboard;
  } catch (error) {
    task.copied = false;
    task.copyError = true;
    task.copyMessage = `${getContentText().copyFailed}: ${getContentErrorMessage(error)}`;
  }

  renderSelectionActionPanel();
}

function positionSelectionActionUi(range: Range): void {
  const rect = getSelectionRangeRect(range);
  const icon = document.getElementById(SELECTION_ACTION_ICON_ID);
  const panel = document.getElementById(SELECTION_ACTION_PANEL_ID);

  if (icon instanceof HTMLButtonElement) {
    positionSelectionActionIcon(icon, rect);
  }

  if (panel instanceof HTMLDivElement) {
    positionSelectionActionPanel(panel, rect);
  }
}

function positionSelectionActionIcon(icon: HTMLButtonElement, rect: DOMRect): void {
  const margin = 8;
  const gap = 6;
  const left = clampNumber(rect.right + gap, margin, window.innerWidth - icon.offsetWidth - margin);
  const top = clampNumber(rect.bottom - icon.offsetHeight, margin, window.innerHeight - icon.offsetHeight - margin);

  icon.style.left = `${Math.round(left)}px`;
  icon.style.top = `${Math.round(top)}px`;
}

function positionSelectionActionPanel(panel: HTMLDivElement, rect: DOMRect): void {
  const margin = 8;
  const gap = 10;
  const panelWidth = panel.offsetWidth;
  const panelHeight = panel.offsetHeight;
  let left = rect.right + gap;

  if (left + panelWidth > window.innerWidth - margin) {
    left = rect.left - panelWidth - gap;
  }

  if (left < margin) {
    left = rect.left;
  }

  let top = rect.top;
  if (top + panelHeight > window.innerHeight - margin) {
    top = window.innerHeight - panelHeight - margin;
  }

  panel.style.left = `${Math.round(clampNumber(left, margin, Math.max(margin, window.innerWidth - panelWidth - margin)))}px`;
  panel.style.top = `${Math.round(clampNumber(top, margin, Math.max(margin, window.innerHeight - panelHeight - margin)))}px`;
}

function removeSelectionActionUi(): void {
  clearSelectionActionTimer();
  clearSelectionIconHoverTimer();
  activeSelectionRequestId++;
  lastSelectionKey = '';
  lastSelectionText = '';
  selectionPanelState = null;
  selectionPanelPinned = false;
  document.getElementById(SELECTION_ACTION_ICON_ID)?.remove();
  removeSelectionActionPanel();
}

function removeSelectionActionPanel(): void {
  document.getElementById(SELECTION_ACTION_PANEL_ID)?.remove();
}

function clearSelectionActionTimer(): void {
  if (selectionActionTimer !== null) {
    window.clearTimeout(selectionActionTimer);
    selectionActionTimer = null;
  }
}

function clearSelectionIconHoverTimer(): void {
  if (selectionIconHoverTimer !== null) {
    window.clearTimeout(selectionIconHoverTimer);
    selectionIconHoverTimer = null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function replaceSelection(newText: string): void {
  const activeElement = document.activeElement;

  if (isTextInput(activeElement)) {
    replaceInputSelection(activeElement, newText);
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(newText));
  selection.removeAllRanges();
}

function pasteText(text: string): void {
  const activeElement = document.activeElement;

  if (isTextInput(activeElement)) {
    replaceInputSelection(activeElement, text);
    return;
  }

  document.execCommand('insertText', false, text);
}

function replaceInputSelection(element: HTMLInputElement | HTMLTextAreaElement, newText: string): void {
  const start = element.selectionStart ?? element.value.length;
  const end = element.selectionEnd ?? element.value.length;
  const before = element.value.slice(0, start);
  const after = element.value.slice(end);

  element.value = `${before}${newText}${after}`;
  const caret = before.length + newText.length;
  element.setSelectionRange(caret, caret);
  element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: newText }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function isTextInput(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement {
  return element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLInputElement && !['button', 'checkbox', 'file', 'radio', 'submit'].includes(element.type));
}

async function fetchImageAsDataUrl(srcUrl: string): Promise<string> {
  const absoluteUrl = new URL(srcUrl, window.location.href).href;
  const response = await fetch(absoluteUrl, {
    mode: 'cors',
    credentials: 'omit'
  });

  if (!response.ok) {
    throw new Error(`读取图片失败: ${response.status}`);
  }

  const blob = await response.blob();
  return blobToDataUrl(blob);
}

function startScreenshotSelection(sessionId: string): void {
  activeScreenshotSelectionCleanup?.();

  let startX = 0;
  let startY = 0;
  let currentRect: ScreenshotRect | null = null;
  let dragging = false;
  let resolved = false;

  const overlay = document.createElement('div');
  overlay.id = 'ctp-screenshot-overlay';
  applySkinClass(overlay);
  overlay.innerHTML = [
    `<div class="ctp-screenshot-tip">${escapeHtml(getContentText().screenshotTip)}</div>`,
    '<div class="ctp-screenshot-selection"></div>'
  ].join('');

  const selectionBox = overlay.querySelector<HTMLDivElement>('.ctp-screenshot-selection');
  if (!selectionBox) {
    sendScreenshotSelectionComplete(sessionId, { cancelled: true });
    return;
  }
  const selectionElement = selectionBox;

  document.documentElement.appendChild(overlay);
  document.body.classList.add('ctp-screenshot-selecting');

  const cleanup = () => {
    overlay.removeEventListener('mousedown', onMouseDown, true);
    overlay.removeEventListener('mousemove', onMouseMove, true);
    overlay.removeEventListener('mouseup', onMouseUp, true);
    window.removeEventListener('keydown', onKeyDown, true);
    overlay.remove();
    document.body.classList.remove('ctp-screenshot-selecting');
    if (activeScreenshotSelectionCleanup === cleanup) {
      activeScreenshotSelectionCleanup = null;
    }
  };

  const finish = (result: ScreenshotSelectionResult) => {
    if (resolved) {
      return;
    }

    resolved = true;
    cleanup();
    sendScreenshotSelectionComplete(sessionId, result);
  };

  function onMouseDown(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    currentRect = { x: startX, y: startY, width: 0, height: 0 };
    updateSelectionBox(selectionElement, currentRect);
  }

  function onMouseMove(event: MouseEvent) {
    if (!dragging) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    currentRect = normalizeRect(startX, startY, event.clientX, event.clientY);
    updateSelectionBox(selectionElement, currentRect);
  }

  function onMouseUp(event: MouseEvent) {
    if (!dragging) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragging = false;
    currentRect = normalizeRect(startX, startY, event.clientX, event.clientY);

    if (currentRect.width < 8 || currentRect.height < 8) {
      finish({ cancelled: true });
      return;
    }

    finish({
      rect: currentRect,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      devicePixelRatio: window.devicePixelRatio || 1
    });
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      finish({ cancelled: true });
    }
  }

  overlay.addEventListener('mousedown', onMouseDown, true);
  overlay.addEventListener('mousemove', onMouseMove, true);
  overlay.addEventListener('mouseup', onMouseUp, true);
  window.addEventListener('keydown', onKeyDown, true);
  activeScreenshotSelectionCleanup = cleanup;
}

async function cropScreenshotToDataUrl(
  screenshotDataUrl: string,
  rect: ScreenshotRect
): Promise<ScreenshotCropResult> {
  const image = await loadImage(screenshotDataUrl);
  const scaleX = image.naturalWidth / window.innerWidth;
  const scaleY = image.naturalHeight / window.innerHeight;
  const cropX = clampNumber(Math.round(rect.x * scaleX), 0, image.naturalWidth);
  const cropY = clampNumber(Math.round(rect.y * scaleY), 0, image.naturalHeight);
  const cropWidth = clampNumber(Math.round(rect.width * scaleX), 1, image.naturalWidth - cropX);
  const cropHeight = clampNumber(Math.round(rect.height * scaleY), 1, image.naturalHeight - cropY);
  const canvas = document.createElement('canvas');

  canvas.width = cropWidth;
  canvas.height = cropHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建截图裁剪画布');
  }

  context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  const blob = await canvasToBlob(canvas);
  const dataUrl = await blobToDataUrl(blob);
  const clipboardWritten = await writeImageBlobToClipboard(blob);

  return { dataUrl, clipboardWritten };
}

function normalizeRect(startX: number, startY: number, endX: number, endY: number): ScreenshotRect {
  const x = clampNumber(Math.min(startX, endX), 0, window.innerWidth);
  const y = clampNumber(Math.min(startY, endY), 0, window.innerHeight);
  const right = clampNumber(Math.max(startX, endX), 0, window.innerWidth);
  const bottom = clampNumber(Math.max(startY, endY), 0, window.innerHeight);

  return {
    x,
    y,
    width: right - x,
    height: bottom - y
  };
}

function updateSelectionBox(element: HTMLDivElement, rect: ScreenshotRect): void {
  element.style.left = `${rect.x}px`;
  element.style.top = `${rect.y}px`;
  element.style.width = `${rect.width}px`;
  element.style.height = `${rect.height}px`;
}

function sendScreenshotSelectionComplete(sessionId: string, selection: ScreenshotSelectionResult): void {
  chrome.runtime.sendMessage({
    type: 'SCREENSHOT_SELECTION_COMPLETE',
    sessionId,
    selection
  }, () => {
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      console.warn('截图翻译框选结果发送失败:', lastError.message);
    }
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('截图图片加载失败'));
    image.src = dataUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('截图裁剪失败'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片数据转换失败'));
    reader.readAsDataURL(blob);
  });
}

async function writeImageBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      return false;
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type || 'image/png']: blob
      })
    ]);
    return true;
  } catch {
    return false;
  }
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getContentErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatContentRuntimeError(message?: string): string {
  if (message?.includes('Extension context invalidated')) {
    return getContentText().pluginUpdated;
  }

  return message || getContentText().operationFailed;
}

console.log('Clipboard Text Processor content script loaded');
