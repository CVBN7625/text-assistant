import { describe, expect, it } from 'vitest';
import type { CustomRule } from '@clipboard-processor/core';
import { applyCustomRules, validateCustomRule } from './custom-rules';

function rule(overrides: Partial<CustomRule>): CustomRule {
  return {
    id: overrides.id || 'rule',
    name: overrides.name || 'rule',
    type: 'regex',
    stage: 'before-processors',
    pattern: 'foo',
    replacement: 'bar',
    flags: 'g',
    isActive: true,
    priority: 100,
    createdAt: 1,
    ...overrides
  };
}

describe('extension custom rules', () => {
  it('applies active rules by stage and priority', () => {
    const rules = [
      rule({ id: 'second', priority: 20, pattern: 'bar', replacement: 'baz' }),
      rule({ id: 'first', priority: 10, pattern: 'foo', replacement: 'bar' }),
      rule({ id: 'after', stage: 'after-processors', pattern: 'baz', replacement: 'done' })
    ];

    const before = applyCustomRules('foo', rules, 'before-processors');
    const after = applyCustomRules(before.text, rules, 'after-processors');

    expect(before.text).toBe('baz');
    expect(after.text).toBe('done');
    expect(before.matches.map(match => match.ruleId)).toEqual(['first', 'second']);
  });

  it('supports text replacement and delete rules', () => {
    const rules = [
      rule({ id: 'text', type: 'text', pattern: 'Hello', replacement: 'Hi' }),
      rule({ id: 'delete', type: 'delete', pattern: '\\[\\d+\\]', replacement: '' })
    ];
    expect(applyCustomRules('Hello [1]', rules, 'before-processors').text).toBe('Hi ');
  });

  it('validates invalid regular expressions', () => {
    expect(validateCustomRule(rule({ pattern: '[' }))).toContain('Invalid');
  });
});
