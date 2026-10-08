import { CustomRulesManager } from './custom-rules';
import { ruleTemplates, RuleTemplate } from './rule-templates';
import { CustomRule } from '../types';

export class RuleEngine {
  private customRulesManager: CustomRulesManager;
  private templates: RuleTemplate[];

  constructor() {
    this.customRulesManager = new CustomRulesManager();
    this.templates = [...ruleTemplates];
  }

  // 添加自定义规则
  addRule(rule: CustomRule): void {
    this.customRulesManager.addRule(rule);
  }

  // 删除规则
  removeRule(ruleId: string): void {
    this.customRulesManager.removeRule(ruleId);
  }

  // 更新规则
  updateRule(ruleId: string, updates: Partial<CustomRule>): void {
    this.customRulesManager.updateRule(ruleId, updates);
  }

  // 获取规则
  getRule(ruleId: string): CustomRule | undefined {
    return this.customRulesManager.getRule(ruleId);
  }

  // 获取所有规则
  getAllRules(): CustomRule[] {
    return this.customRulesManager.getAllRules();
  }

  // 获取激活的规则
  getActiveRules(): CustomRule[] {
    return this.customRulesManager.getActiveRules();
  }

  // 应用规则到文本
  applyRules(text: string, ruleIds?: string[]): string {
    return this.customRulesManager.applyRules(text, ruleIds);
  }

  // 验证规则
  validateRule(rule: CustomRule): { valid: boolean; error?: string } {
    return this.customRulesManager.validateRule(rule);
  }

  // 获取模板列表
  getTemplates(): RuleTemplate[] {
    return [...this.templates];
  }

  // 根据模板创建规则
  createRuleFromTemplate(templateId: string): CustomRule[] {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) {
      return [];
    }

    return template.rules.map((rule, index) => ({
      id: `${templateId}-${index}`,
      name: `${template.name} - 规则 ${index + 1}`,
      description: template.description,
      pattern: rule.pattern,
      replacement: rule.replacement,
      flags: rule.flags,
      isActive: true
    }));
  }

  // 从模板导入规则
  importRulesFromTemplate(templateId: string): void {
    const rules = this.createRuleFromTemplate(templateId);
    rules.forEach(rule => this.addRule(rule));
  }
}
