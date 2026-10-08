import type {
  CustomRule,
  CustomRuleExecutionStage,
  CustomRuleType
} from '@clipboard-processor/core';

export type RuleMatch = {
  ruleId: string;
  ruleName: string;
  stage: CustomRuleExecutionStage;
  count: number;
};

export type RuleApplyResult = {
  text: string;
  matches: RuleMatch[];
};

export type ApplyCustomRulesOptions = {
  stage?: CustomRuleExecutionStage;
  ruleIds?: string[];
};

export type RuleTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  rules: Array<Omit<CustomRule, 'id' | 'createdAt' | 'updatedAt'>>;
};

export type RuleValidationResult = {
  valid: boolean;
  error?: string;
};

const STORAGE_KEY = 'clipboard-custom-rules-v1';
const VALID_RULE_TYPES: CustomRuleType[] = ['regex', 'text', 'delete'];
const VALID_STAGES: CustomRuleExecutionStage[] = ['before-processors', 'after-processors'];

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: 'paper-citation-cleanup',
    name: '论文引用清理',
    description: '删除论文复制文本中的引用角标、脚注编号和多余空白。',
    category: 'academic',
    rules: [
      {
        name: '删除方括号引用',
        description: '匹配 [1]、[2, 3]、[4-7]。',
        type: 'delete',
        stage: 'before-processors',
        pattern: '\\[[\\d,\\-\\s]+\\]',
        replacement: '',
        flags: 'g',
        isActive: true,
        priority: 10
      },
      {
        name: '删除中文方括号引用',
        description: '匹配【1】、【2, 3】、【4-7】。',
        type: 'delete',
        stage: 'before-processors',
        pattern: '【[\\d,\\-\\s]+】',
        replacement: '',
        flags: 'g',
        isActive: true,
        priority: 20
      },
      {
        name: '删除圆括号数字引用',
        description: '匹配 (1)、(2, 3)、(4-7)。',
        type: 'delete',
        stage: 'before-processors',
        pattern: '\\([\\d,\\-\\s]+\\)',
        replacement: '',
        flags: 'g',
        isActive: true,
        priority: 30
      },
      {
        name: '删除脚注圈号',
        description: '删除 1-20 的常见圈号脚注编号。',
        type: 'delete',
        stage: 'before-processors',
        pattern: '[\\u2460-\\u2473]',
        replacement: '',
        flags: 'g',
        isActive: true,
        priority: 40
      }
    ]
  },
  {
    id: 'general-copy-cleanup',
    name: '通用复制清理',
    description: '压缩重复换行和空格，并修剪每行首尾空白。',
    category: 'general',
    rules: [
      {
        name: '压缩重复换行',
        description: '把多个连续换行压缩为一个换行。',
        type: 'regex',
        stage: 'before-processors',
        pattern: '[\\r\\n]+',
        replacement: '\n',
        flags: 'g',
        isActive: true,
        priority: 10
      },
      {
        name: '压缩重复空格',
        description: '把多个普通空格压缩为一个空格。',
        type: 'regex',
        stage: 'before-processors',
        pattern: ' {2,}',
        replacement: ' ',
        flags: 'g',
        isActive: true,
        priority: 20
      },
      {
        name: '修剪每行空白',
        description: '删除每一行开头和结尾的空白。',
        type: 'regex',
        stage: 'after-processors',
        pattern: '^\\s+|\\s+$',
        replacement: '',
        flags: 'gm',
        isActive: true,
        priority: 30
      }
    ]
  },
  {
    id: 'web-noise-cleanup',
    name: '网页噪声清理',
    description: '删除链接、HTML 标签和常见版权符号。',
    category: 'web',
    rules: [
      {
        name: '删除 URL',
        description: '移除 http 和 https 链接。',
        type: 'delete',
        stage: 'before-processors',
        pattern: 'https?:\\/\\/[^\\s]+',
        replacement: '',
        flags: 'g',
        isActive: true,
        priority: 10
      },
      {
        name: '删除 HTML 标签',
        description: '移除复制文本中残留的 HTML 标签。',
        type: 'delete',
        stage: 'before-processors',
        pattern: '<[^>]*>',
        replacement: '',
        flags: 'g',
        isActive: true,
        priority: 20
      },
      {
        name: '删除版权符号',
        description: '移除 ©、®、™ 等常见符号。',
        type: 'delete',
        stage: 'after-processors',
        pattern: '[©®™]',
        replacement: '',
        flags: 'g',
        isActive: true,
        priority: 30
      }
    ]
  },
  {
    id: 'selection-replace-examples',
    name: '选区替换示例',
    description: '参考 CopyPlusPlus 和 paper-assistant 的低门槛字符替换。',
    category: 'replace',
    rules: [
      {
        name: '替换中文冒号',
        description: '把英文冒号替换为中文冒号。',
        type: 'text',
        stage: 'after-processors',
        pattern: ':',
        replacement: '：',
        flags: 'g',
        isActive: false,
        priority: 10
      },
      {
        name: '统一省略号',
        description: '把三个英文句点替换为中文省略号。',
        type: 'text',
        stage: 'after-processors',
        pattern: '...',
        replacement: '……',
        flags: 'g',
        isActive: false,
        priority: 20
      }
    ]
  }
];

export function loadCustomRules(): CustomRule[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizeRule).filter((rule): rule is CustomRule => Boolean(rule));
  } catch (error) {
    console.error('加载自定义规则失败:', error);
    return [];
  }
}

export function saveCustomRules(rules: CustomRule[]): void {
  const normalizedRules = rules
    .map(normalizeRule)
    .filter((rule): rule is CustomRule => Boolean(rule));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedRules));
}

export function createEmptyRule(): CustomRule {
  const now = Date.now();
  return {
    id: `rule-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: '新规则',
    description: '',
    type: 'regex',
    stage: 'before-processors',
    pattern: '',
    replacement: '',
    flags: 'g',
    isActive: true,
    priority: 100,
    createdAt: now,
    updatedAt: now
  };
}

export function createRulesFromTemplate(templateId: string): CustomRule[] {
  const template = RULE_TEMPLATES.find(item => item.id === templateId);
  if (!template) {
    return [];
  }

  const now = Date.now();
  return template.rules.map((rule, index) => normalizeRule({
    ...rule,
    id: `${templateId}-${now}-${index}`,
    createdAt: now,
    updatedAt: now
  }) as CustomRule);
}

export function validateCustomRule(rule: CustomRule): RuleValidationResult {
  if (!rule.name.trim()) {
    return { valid: false, error: '规则名称不能为空' };
  }

  if (!rule.pattern) {
    return { valid: false, error: '匹配内容不能为空' };
  }

  if (!isValidFlags(rule.flags || 'g')) {
    return { valid: false, error: '正则标志只能包含 g、i、m、s、u、y，且不能重复' };
  }

  const type = rule.type || 'regex';
  if (type === 'regex' || type === 'delete') {
    try {
      new RegExp(rule.pattern, normalizeFlags(rule.flags));
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }

  return { valid: true };
}

export function applyCustomRules(
  text: string,
  rules: CustomRule[],
  options: ApplyCustomRulesOptions = {}
): RuleApplyResult {
  const matches: RuleMatch[] = [];
  let output = text;
  const selectedRuleIds = options.ruleIds ? new Set(options.ruleIds) : null;

  if (selectedRuleIds && selectedRuleIds.size === 0) {
    return { text: output, matches };
  }

  const activeRules = rules
    .map(normalizeRule)
    .filter((rule): rule is CustomRule => {
      if (!rule || !rule.isActive || !validateCustomRule(rule).valid) {
        return false;
      }

      if (selectedRuleIds && !selectedRuleIds.has(rule.id)) {
        return false;
      }

      return !options.stage || rule.stage === options.stage;
    })
    .sort(compareRules);

  for (const rule of activeRules) {
    const count = countRuleMatches(output, rule);
    if (count === 0) {
      continue;
    }

    const replacement = rule.type === 'delete' ? '' : rule.replacement;
    output = replaceByRule(output, rule, replacement);
    matches.push({
      ruleId: rule.id,
      ruleName: rule.name,
      stage: rule.stage || 'before-processors',
      count
    });
  }

  return { text: output, matches };
}

export function exportRulesJson(rules: CustomRule[]): string {
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    rules
  }, null, 2);
}

export function parseRulesJson(raw: string): CustomRule[] {
  const parsed = JSON.parse(raw);
  const candidate = Array.isArray(parsed) ? parsed : parsed?.rules;

  if (!Array.isArray(candidate)) {
    throw new Error('导入文件中没有可识别的 rules 数组');
  }

  return candidate.map(normalizeRule).filter((rule): rule is CustomRule => Boolean(rule));
}

export function getRuleTypeLabel(type?: CustomRuleType): string {
  const labels: Record<CustomRuleType, string> = {
    regex: '正则替换',
    text: '文本替换',
    delete: '删除匹配'
  };
  return labels[type || 'regex'];
}

export function getRuleStageLabel(stage?: CustomRuleExecutionStage): string {
  const labels: Record<CustomRuleExecutionStage, string> = {
    'before-processors': '处理前',
    'after-processors': '处理后'
  };
  return labels[stage || 'before-processors'];
}

function normalizeRule(value: Partial<CustomRule> | undefined): CustomRule | null {
  if (!value) {
    return null;
  }

  const now = Date.now();
  const type = (VALID_RULE_TYPES.includes(value.type || 'regex')
    ? value.type
    : 'regex') as CustomRuleType;
  const stage = (VALID_STAGES.includes(value.stage || 'before-processors')
    ? value.stage
    : 'before-processors') as CustomRuleExecutionStage;

  return {
    id: value.id || `rule-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: value.name || '未命名规则',
    description: value.description || '',
    type,
    stage,
    pattern: value.pattern || '',
    replacement: type === 'delete' ? '' : value.replacement || '',
    flags: normalizeFlags(value.flags || 'g'),
    isActive: value.isActive ?? true,
    priority: Number.isFinite(Number(value.priority)) ? Number(value.priority) : 100,
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now
  };
}

function compareRules(a: CustomRule, b: CustomRule): number {
  const stageDiff = getStageOrder(a.stage) - getStageOrder(b.stage);
  if (stageDiff !== 0) {
    return stageDiff;
  }

  const priorityDiff = (a.priority ?? 100) - (b.priority ?? 100);
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return (a.createdAt ?? 0) - (b.createdAt ?? 0);
}

function getStageOrder(stage?: CustomRuleExecutionStage): number {
  return stage === 'after-processors' ? 2 : 0;
}

function replaceByRule(text: string, rule: CustomRule, replacement: string): string {
  if (rule.type === 'text') {
    const source = rule.pattern;
    if (!source) {
      return text;
    }

    if ((rule.flags || 'g').includes('i')) {
      return text.replace(new RegExp(escapeRegExp(source), normalizeFlags(rule.flags)), replacement);
    }

    return text.split(source).join(replacement);
  }

  return text.replace(new RegExp(rule.pattern, normalizeFlags(rule.flags)), replacement);
}

function countRuleMatches(text: string, rule: CustomRule): number {
  if (!rule.pattern) {
    return 0;
  }

  if (rule.type === 'text') {
    if ((rule.flags || 'g').includes('i')) {
      return Array.from(text.matchAll(new RegExp(escapeRegExp(rule.pattern), normalizeFlags(rule.flags)))).length;
    }

    return text.split(rule.pattern).length - 1;
  }

  return Array.from(text.matchAll(new RegExp(rule.pattern, normalizeFlags(rule.flags)))).length;
}

function normalizeFlags(flags = 'g'): string {
  const normalized = Array.from(new Set(flags.split('').filter(Boolean))).join('');
  return normalized.includes('g') ? normalized : `${normalized}g`;
}

function isValidFlags(flags: string): boolean {
  return /^[gimsuy]*$/.test(flags) && new Set(flags.split('')).size === flags.length;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
