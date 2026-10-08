import { TextProcessor } from '../types';

// 规则模板接口
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  rules: {
    pattern: string;
    replacement: string;
    flags?: string;
  }[];
}

// 学术论文清理模板
export const academicPaperCleanupTemplate: RuleTemplate = {
  id: 'academic-paper-cleanup',
  name: '学术论文清理',
  description: '清理学术论文中的常见格式问题',
  category: 'academic',
  rules: [
    {
      pattern: '\\[[\\d,\\-\\s]+\\]',
      replacement: ''
    },
    {
      pattern: '【[\\d,\\-\\s]+】',
      replacement: ''
    },
    {
      pattern: '\\([\\d,\\-\\s]+\\)',
      replacement: ''
    },
    {
      pattern: '[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]',
      replacement: ''
    }
  ]
};

// 代码格式化模板
export const codeFormattingTemplate: RuleTemplate = {
  id: 'code-formatting',
  name: '代码格式化',
  description: '格式化代码块',
  category: 'code',
  rules: [
    {
      pattern: '\\t',
      replacement: '  '
    },
    {
      pattern: ' +$',
      replacement: '',
      flags: 'gm'
    }
  ]
};

// 日志处理模板
export const logProcessingTemplate: RuleTemplate = {
  id: 'log-processing',
  name: '日志处理',
  description: '处理日志文件',
  category: 'log',
  rules: [
    {
      pattern: '^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}',
      replacement: '',
      flags: 'gm'
    },
    {
      pattern: '\\[INFO\\]|\\[DEBUG\\]|\\[WARN\\]|\\[ERROR\\]',
      replacement: ''
    }
  ]
};

// 通用文本清理模板
export const generalTextCleanupTemplate: RuleTemplate = {
  id: 'general-text-cleanup',
  name: '通用文本清理',
  description: '清理通用文本格式问题',
  category: 'general',
  rules: [
    {
      pattern: '[\\r\\n]+',
      replacement: '\n'
    },
    {
      pattern: ' +',
      replacement: ' '
    },
    {
      pattern: '^ +| +$',
      replacement: '',
      flags: 'gm'
    }
  ]
};

// 导出所有规则模板
export const ruleTemplates: RuleTemplate[] = [
  academicPaperCleanupTemplate,
  codeFormattingTemplate,
  logProcessingTemplate,
  generalTextCleanupTemplate
];
