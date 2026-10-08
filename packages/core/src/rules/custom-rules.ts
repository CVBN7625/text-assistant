import { CustomRule } from '../types';

export class CustomRulesManager {
  private rules: CustomRule[] = [];

  // 添加规则
  addRule(rule: CustomRule): void {
    this.rules.push(rule);
  }

  // 删除规则
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  // 更新规则
  updateRule(ruleId: string, updates: Partial<CustomRule>): void {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
    }
  }

  // 获取规则
  getRule(ruleId: string): CustomRule | undefined {
    return this.rules.find(rule => rule.id === ruleId);
  }

  // 获取所有规则
  getAllRules(): CustomRule[] {
    return [...this.rules];
  }

  // 获取激活的规则
  getActiveRules(): CustomRule[] {
    return this.rules.filter(rule => rule.isActive);
  }

  // 应用规则到文本
  applyRules(text: string, ruleIds?: string[]): string {
    const rulesToApply = ruleIds
      ? this.rules.filter(rule => ruleIds.includes(rule.id) && rule.isActive)
      : this.getActiveRules();

    let result = text;
    for (const rule of rulesToApply) {
      try {
        const regex = new RegExp(rule.pattern, rule.flags || 'g');
        result = result.replace(regex, rule.replacement);
      } catch (error) {
        console.error(`Rule ${rule.id} failed:`, error);
      }
    }
    return result;
  }

  // 验证规则
  validateRule(rule: CustomRule): { valid: boolean; error?: string } {
    try {
      new RegExp(rule.pattern, rule.flags || 'g');
      return { valid: true };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }
}
