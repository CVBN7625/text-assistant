import { ProcessorConfig } from '../types';

export const defaultQuickActions: ProcessorConfig['quickActions'] = [
  {
    id: 'quick-clean-all',
    enabled: true,
    presetName: 'clean-all',
    processorIds: [
      'delete-duplicate-newlines',
      'keep-english-word-spaces',
      'delete-reference-badges',
      'delete-footnotes',
      'full-width-to-half-width'
    ],
    customRuleIds: []
  },
  {
    id: 'quick-full-to-half',
    enabled: true,
    presetName: 'full-to-half',
    processorIds: ['full-width-to-half-width'],
    customRuleIds: []
  },
  {
    id: 'quick-remove-refs',
    enabled: true,
    presetName: 'remove-refs',
    processorIds: ['delete-reference-badges', 'delete-footnotes'],
    customRuleIds: []
  },
  {
    id: 'quick-add-space',
    enabled: true,
    presetName: 'add-space',
    processorIds: ['add-space-between-chinese-and-english'],
    customRuleIds: []
  }
];

export const defaultConfig: ProcessorConfig = {
  quickActions: defaultQuickActions,
  processors: {
    'delete-duplicate-newlines': { isActive: true, priority: 1 },
    'delete-all-newlines': { isActive: false, priority: 1 },
    'delete-duplicate-spaces': { isActive: false, priority: 2 },
    'remove-spaces-between-chinese': { isActive: false, priority: 3 },
    'keep-english-word-spaces': { isActive: true, priority: 4 },
    'delete-reference-badges': { isActive: true, priority: 5 },
    'delete-footnotes': { isActive: true, priority: 6 },
    'clean-caj-special-characters': { isActive: false, priority: 7 },
    'delete-emoji': { isActive: false, priority: 8 },
    'delete-special-symbols': { isActive: false, priority: 9 },
    'delete-duplicate-punctuation': { isActive: false, priority: 10 },
    'full-width-to-half-width': { isActive: true, priority: 1 },
    'simplified-to-traditional': { isActive: false, priority: 7 },
    'traditional-to-simplified': { isActive: false, priority: 8 },
    'replace-kangxi-radicals': { isActive: false, priority: 9 },
    'add-space-between-chinese-and-english': { isActive: false, priority: 1 },
    'add-space-between-letters-and-numbers': { isActive: false, priority: 2 },
    'add-space-after-punctuation': { isActive: false, priority: 3 },
    'add-paragraph-indent': { isActive: false, priority: 4 },
    'normalize-reference-numbering': { isActive: false, priority: 5 },
    'normalize-reference-author-case': { isActive: false, priority: 6 },
    'normalize-reference-journal-case': { isActive: false, priority: 7 },
    'remove-reference-doi': { isActive: false, priority: 8 }
  },
  shortcuts: {
    processSelection: 'Ctrl+Shift+P',
    processClipboard: 'Ctrl+Shift+V',
    quickClean: 'Ctrl+Shift+C'
  },
  translation: {
    defaultEngine: 'baidu',
    apiKeys: {},
    defaultSourceLang: 'auto',
    defaultTargetLang: 'zh',
    autoTranslate: true,
    cacheEnabled: true,
    quotaBaseline: 0
  },
  ocr: {
    engine: 'tencent',
    model: 'general-basic',
    tencent: {
      secretId: '',
      secretKey: '',
      region: '',
      basicQuotaBaseline: 0,
      fastQuotaBaseline: 0,
      accurateMonthlyLimit: 0,
      accurateQuotaBaseline: 0,
      englishQuotaBaseline: 0
    }
  },
  ui: {
    theme: 'auto',
    skin: 'classic',
    language: 'zh-CN',
    showNotifications: true,
    autoProcessClipboard: false,
    floatingMenuEnabled: true,
    selectionAutomationEnabled: false,
    selectionAutoProcessEnabled: false,
    selectionAutoTranslateEnabled: false,
    selectionActionMaxLength: 1200,
    selectionAutoTranslateMaxLength: 1200,
    historyRetentionMode: 'count',
    historyRetentionCount: 50
  }
};
