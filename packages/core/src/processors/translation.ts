import { ProcessingContext, TextProcessor } from '../types';

export const translateText: TextProcessor = {
  id: 'translate-text',
  name: '翻译文本',
  description: '使用当前配置的翻译服务翻译文本',
  category: 'translation',
  isActive: false,
  priority: 100,
  execute: async (text: string, context?: ProcessingContext) => {
    const translationConfig = context?.translationConfig;
    const translate = context?.translateText;

    if (!translationConfig || !translate) {
      console.warn('翻译处理器未收到翻译配置或翻译服务');
      return text;
    }

    const from = translationConfig.defaultSourceLang || 'auto';
    const to = translationConfig.defaultTargetLang || 'zh';

    if (to === 'auto') {
      console.warn('目标语言不能为 auto');
      return text;
    }

    return translate(text, from, to, translationConfig);
  }
};

export const translationProcessors: TextProcessor[] = [
  translateText
];
