import { describe, expect, it } from 'vitest';
import type { CustomRule, QuickActionConfig } from '@clipboard-processor/core';
import { executeQuickActionPipeline } from './quick-action-execution';

const action: QuickActionConfig = {
  id: 'quick',
  enabled: true,
  name: 'Quick',
  processorIds: ['processor', 'missing-processor'],
  customRuleIds: ['before', 'after', 'missing-rule']
};

const rules: CustomRule[] = [
  {
    id: 'before',
    name: 'before',
    stage: 'before-processors',
    type: 'text',
    pattern: 'start',
    replacement: 'before',
    isActive: false,
    priority: 1
  },
  {
    id: 'after',
    name: 'after',
    stage: 'after-processors',
    type: 'text',
    pattern: 'processed',
    replacement: 'done',
    isActive: false,
    priority: 1
  }
];

describe('quick action execution', () => {
  it('runs selected inactive rules around selected processors and skips missing references', async () => {
    const result = await executeQuickActionPipeline(
      'start',
      action,
      rules,
      new Set(['processor']),
      async (text, processorIds) => ({
        text: `${text}-processed`,
        processorsUsed: processorIds
      })
    );

    expect(result.text).toBe('before-done');
    expect(result.processorsUsed).toEqual([
      'custom-rule:before',
      'processor',
      'custom-rule:after'
    ]);
    expect(result.skippedItems).toEqual([
      { type: 'processor', id: 'missing-processor' },
      { type: 'custom-rule', id: 'missing-rule' }
    ]);
  });
});
