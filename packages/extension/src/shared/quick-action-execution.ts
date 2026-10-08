import type { CustomRule, QuickActionConfig } from '@clipboard-processor/core';
import { applyCustomRules } from './custom-rules';

export type SkippedQuickActionItem = {
  type: 'processor' | 'custom-rule';
  id: string;
};

export async function executeQuickActionPipeline(
  text: string,
  action: QuickActionConfig,
  rules: CustomRule[],
  knownProcessorIds: Set<string>,
  executeProcessors: (text: string, processorIds: string[]) => Promise<{ text: string; processorsUsed: string[] }>
) {
  const skippedItems: SkippedQuickActionItem[] = [];
  const processorIds = action.processorIds.filter(id => {
    const exists = knownProcessorIds.has(id);
    if (!exists) skippedItems.push({ type: 'processor', id });
    return exists;
  });
  const selectedRules = action.customRuleIds.flatMap(id => {
    const rule = rules.find(item => item.id === id);
    if (!rule) {
      skippedItems.push({ type: 'custom-rule', id });
      return [];
    }
    return [{ ...rule, isActive: true }];
  });

  const beforeRules = applyCustomRules(text, selectedRules, 'before-processors');
  const processorResult = await executeProcessors(beforeRules.text, processorIds);
  const afterRules = applyCustomRules(processorResult.text, selectedRules, 'after-processors');

  return {
    text: afterRules.text,
    processorsUsed: [
      ...beforeRules.matches.map(match => `custom-rule:${match.ruleId}`),
      ...processorResult.processorsUsed,
      ...afterRules.matches.map(match => `custom-rule:${match.ruleId}`)
    ],
    skippedItems
  };
}
