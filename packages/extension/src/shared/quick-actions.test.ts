import { describe, expect, it } from 'vitest';
import { normalizeQuickActions } from './quick-actions';

describe('quick action config', () => {
  it('uses the four defaults for legacy configs', () => {
    const actions = normalizeQuickActions(undefined);
    expect(actions).toHaveLength(4);
    expect(actions.map(action => action.presetName)).toEqual([
      'clean-all',
      'full-to-half',
      'remove-refs',
      'add-space'
    ]);
  });

  it('preserves an explicitly empty list and normalizes values', () => {
    expect(normalizeQuickActions([])).toEqual([]);
    expect(normalizeQuickActions([{
      id: 'custom',
      enabled: false,
      name: '  Custom  ',
      processorIds: ['one', 'one'],
      customRuleIds: ['rule']
    }])).toEqual([{
      id: 'custom',
      enabled: false,
      name: 'Custom',
      presetName: undefined,
      processorIds: ['one'],
      customRuleIds: ['rule']
    }]);
  });
});
