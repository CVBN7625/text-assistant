import { describe, expect, it } from 'vitest';
import type { CustomRule } from '@clipboard-processor/core';
import { applyCustomRules } from './custom-rules-service';

function createRule(overrides: Partial<CustomRule>): CustomRule {
  return {
    id: overrides.id || 'rule',
    name: overrides.name || 'Rule',
    type: overrides.type || 'regex',
    stage: overrides.stage || 'before-processors',
    pattern: overrides.pattern || '',
    replacement: overrides.replacement || '',
    flags: overrides.flags || 'g',
    isActive: overrides.isActive ?? true,
    priority: overrides.priority ?? 100,
    createdAt: overrides.createdAt || 1,
    updatedAt: overrides.updatedAt || 1
  };
}

describe('custom rules service', () => {
  it('applies only rules from the requested execution stage', () => {
    const rules = [
      createRule({
        id: 'before',
        name: 'Before',
        stage: 'before-processors',
        pattern: 'foo',
        replacement: 'bar'
      }),
      createRule({
        id: 'after',
        name: 'After',
        stage: 'after-processors',
        pattern: 'bar',
        replacement: 'baz'
      })
    ];

    const before = applyCustomRules('foo', rules, { stage: 'before-processors' });
    const after = applyCustomRules(before.text, rules, { stage: 'after-processors' });

    expect(before.text).toBe('bar');
    expect(before.matches).toHaveLength(1);
    expect(before.matches[0].stage).toBe('before-processors');
    expect(after.text).toBe('baz');
    expect(after.matches).toHaveLength(1);
    expect(after.matches[0].stage).toBe('after-processors');
  });

  it('filters by selected rule ids and priority', () => {
    const rules = [
      createRule({
        id: 'second',
        name: 'Second',
        pattern: 'bar',
        replacement: 'baz',
        priority: 20
      }),
      createRule({
        id: 'first',
        name: 'First',
        pattern: 'foo',
        replacement: 'bar',
        priority: 10
      })
    ];

    expect(applyCustomRules('foo', rules, { ruleIds: [] }).text).toBe('foo');
    expect(applyCustomRules('foo', rules, { ruleIds: ['first', 'second'] }).text).toBe('baz');
    expect(applyCustomRules('foo', rules, { ruleIds: ['second'] }).text).toBe('foo');
  });
});
