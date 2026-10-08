import type { CustomRule, CustomRuleExecutionStage, CustomRuleType } from '@clipboard-processor/core';

export const CUSTOM_RULES_STORAGE_KEY = 'customRules';

export type RuleMatch = {
  ruleId: string;
  ruleName: string;
  stage: CustomRuleExecutionStage;
  count: number;
};

export function createCustomRule(): CustomRule {
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

export function normalizeCustomRules(values: unknown): CustomRule[] {
  if (!Array.isArray(values)) return [];
  return values.map(normalizeCustomRule).filter((rule): rule is CustomRule => Boolean(rule));
}

export function validateCustomRule(rule: CustomRule): string | null {
  if (!rule.name.trim()) return '规则名称不能为空';
  if (!rule.pattern) return '匹配内容不能为空';
  if (!/^[gimsuy]*$/.test(rule.flags || 'g')) return '正则标志只能包含 g、i、m、s、u、y';
  if (new Set((rule.flags || 'g').split('')).size !== (rule.flags || 'g').length) return '正则标志不能重复';
  if (rule.type !== 'text') {
    try {
      new RegExp(rule.pattern, normalizeFlags(rule.flags));
    } catch (error) {
      return (error as Error).message;
    }
  }
  return null;
}

export function applyCustomRules(text: string, rules: CustomRule[], stage: CustomRuleExecutionStage) {
  let output = text;
  const matches: RuleMatch[] = [];
  const activeRules = normalizeCustomRules(rules)
    .filter(rule => rule.isActive && rule.stage === stage && !validateCustomRule(rule))
    .sort(compareRules);

  for (const rule of activeRules) {
    const count = countMatches(output, rule);
    if (count === 0) continue;
    output = replaceByRule(output, rule);
    matches.push({ ruleId: rule.id, ruleName: rule.name, stage, count });
  }

  return { text: output, matches };
}

function normalizeCustomRule(value: unknown): CustomRule | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<CustomRule>;
  const now = Date.now();
  const validTypes: CustomRuleType[] = ['regex', 'text', 'delete'];
  const validStages: CustomRuleExecutionStage[] = ['before-processors', 'after-processors'];
  const type = validTypes.includes(source.type || 'regex') ? source.type || 'regex' : 'regex';
  const stage = validStages.includes(source.stage || 'before-processors') ? source.stage || 'before-processors' : 'before-processors';

  return {
    id: source.id || `rule-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: source.name || '未命名规则',
    description: source.description || '',
    type,
    stage,
    pattern: source.pattern || '',
    replacement: type === 'delete' ? '' : source.replacement || '',
    flags: normalizeFlags(source.flags),
    isActive: source.isActive ?? true,
    priority: Number.isFinite(Number(source.priority)) ? Number(source.priority) : 100,
    createdAt: source.createdAt || now,
    updatedAt: source.updatedAt || now
  };
}

function compareRules(a: CustomRule, b: CustomRule): number {
  return (a.priority ?? 100) - (b.priority ?? 100) || (a.createdAt ?? 0) - (b.createdAt ?? 0);
}

function replaceByRule(text: string, rule: CustomRule): string {
  const replacement = rule.type === 'delete' ? '' : rule.replacement;
  if (rule.type === 'text') {
    if ((rule.flags || '').includes('i')) {
      return text.replace(new RegExp(escapeRegExp(rule.pattern), normalizeFlags(rule.flags)), replacement);
    }
    return text.split(rule.pattern).join(replacement);
  }
  return text.replace(new RegExp(rule.pattern, normalizeFlags(rule.flags)), replacement);
}

function countMatches(text: string, rule: CustomRule): number {
  if (rule.type === 'text' && !(rule.flags || '').includes('i')) {
    return text.split(rule.pattern).length - 1;
  }
  const pattern = rule.type === 'text' ? escapeRegExp(rule.pattern) : rule.pattern;
  return Array.from(text.matchAll(new RegExp(pattern, normalizeFlags(rule.flags)))).length;
}

function normalizeFlags(flags = 'g'): string {
  const normalized = Array.from(new Set(flags.split('').filter(char => 'gimsuy'.includes(char)))).join('');
  return normalized.includes('g') ? normalized : `${normalized}g`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
