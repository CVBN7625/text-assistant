import type { QuickActionConfig, QuickActionPresetName } from '@clipboard-processor/core';

const presetNames: QuickActionPresetName[] = ['clean-all', 'full-to-half', 'remove-refs', 'add-space'];
const defaultQuickActions: QuickActionConfig[] = [
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

export function normalizeQuickActions(value: unknown): QuickActionConfig[] {
  if (!Array.isArray(value)) {
    return cloneDefaultQuickActions();
  }

  const usedIds = new Set<string>();
  return value
    .map((item, index) => normalizeQuickAction(item, index))
    .filter((item): item is QuickActionConfig => Boolean(item))
    .map(item => {
      let id = item.id;
      while (usedIds.has(id)) {
        id = `${item.id}-${Math.random().toString(36).slice(2, 7)}`;
      }
      usedIds.add(id);
      return { ...item, id };
    });
}

export function createQuickAction(): QuickActionConfig {
  return {
    id: `quick-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    enabled: true,
    name: '',
    processorIds: [],
    customRuleIds: []
  };
}

export function cloneDefaultQuickActions(): QuickActionConfig[] {
  return defaultQuickActions.map(action => ({
    ...action,
    processorIds: [...action.processorIds],
    customRuleIds: [...action.customRuleIds]
  }));
}

function normalizeQuickAction(value: unknown, index: number): QuickActionConfig | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<QuickActionConfig>;
  const presetName = presetNames.includes(source.presetName as QuickActionPresetName)
    ? source.presetName as QuickActionPresetName
    : undefined;

  return {
    id: String(source.id || `quick-action-${index + 1}`),
    enabled: source.enabled ?? true,
    name: typeof source.name === 'string' ? source.name.trim() : undefined,
    presetName,
    processorIds: uniqueStrings(source.processorIds),
    customRuleIds: uniqueStrings(source.customRuleIds)
  };
}

function uniqueStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && Boolean(item))))
    : [];
}
