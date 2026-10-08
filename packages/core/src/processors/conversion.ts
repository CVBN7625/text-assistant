import { TextProcessor } from '../types';
import OpenCC from 'opencc-js';

// 全角转半角
export const fullWidthToHalfWidth: TextProcessor = {
  id: 'full-width-to-half-width',
  name: '全角转半角',
  description: '将全角字符转换为半角字符',
  category: 'conversion',
  isActive: false,
  priority: 1,
  execute: (text: string) => {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      // 中文空格替换为英文空格
      if (char === 12288) {
        result += ' ';
      } else if (char > 65280 && char < 65375) {
        // 全角字符转换为半角
        result += String.fromCharCode(char - 65248);
      } else {
        result += String.fromCharCode(char);
      }
    }
    return result;
  }
};

// 半角转全角
export const halfWidthToFullWidth: TextProcessor = {
  id: 'half-width-to-full-width',
  name: '半角转全角',
  description: '将半角字符转换为全角字符',
  category: 'conversion',
  isActive: false,
  priority: 2,
  execute: (text: string) => {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      // 英文空格替换为中文空格
      if (char === 32) {
        result += '　';
      } else if (char > 32 && char < 127) {
        // 半角字符转换为全角
        result += String.fromCharCode(char + 65248);
      } else {
        result += String.fromCharCode(char);
      }
    }
    return result;
  }
};

// 大写转小写
export const uppercaseToLowerCase: TextProcessor = {
  id: 'uppercase-to-lowercase',
  name: '大写转小写',
  description: '将大写字母转换为小写字母',
  category: 'conversion',
  isActive: false,
  priority: 3,
  execute: (text: string) => {
    return text.toLowerCase();
  }
};

// 小写转大写
export const lowercaseToUpperCase: TextProcessor = {
  id: 'lowercase-to-uppercase',
  name: '小写转大写',
  description: '将小写字母转换为大写字母',
  category: 'conversion',
  isActive: false,
  priority: 4,
  execute: (text: string) => {
    return text.toUpperCase();
  }
};

// 英文标点转中文标点
export const englishToChinesePunctuation: TextProcessor = {
  id: 'english-to-chinese-punctuation',
  name: '英文标点转中文',
  description: '将英文标点转换为中文标点',
  category: 'conversion',
  isActive: false,
  priority: 5,
  execute: (text: string) => {
    const punctuationMap: { [key: string]: string } = {
      ',': '，',
      '.': '。',
      ':': '：',
      ';': '；',
      '?': '？',
      '!': '！',
      '(': '（',
      ')': '）',
      '[': '【',
      ']': '】'
    };

    let result = text;
    for (const [eng, chn] of Object.entries(punctuationMap)) {
      result = result.replace(new RegExp('\\' + eng, 'g'), chn);
    }
    return result
      .replace(/([，。！？；：])\s+/g, '$1')
      .replace(/\s+([（【])/g, '$1');
  }
};

// 中文标点转英文标点
export const chineseToEnglishPunctuation: TextProcessor = {
  id: 'chinese-to-english-punctuation',
  name: '中文标点转英文',
  description: '将中文标点转换为英文标点',
  category: 'conversion',
  isActive: false,
  priority: 6,
  execute: (text: string) => {
    const punctuationMap: { [key: string]: string } = {
      '，': ',',
      '。': '.',
      '：': ':',
      '；': ';',
      '？': '?',
      '！': '!',
      '（': '(',
      '）': ')',
      '【': '[',
      '】': ']'
    };

    let result = text;
    for (const [chn, eng] of Object.entries(punctuationMap)) {
      result = result.replace(new RegExp(chn, 'g'), eng);
    }
    return result
      .replace(/([,?:;])(?=\S)/g, '$1 ')
      .replace(/([)\]])(?=[A-Za-z0-9([])/g, '$1 ');
  }
};

// 简体转繁体
export const simplifiedToTraditional: TextProcessor = {
  id: 'simplified-to-traditional',
  name: '简体转繁体',
  description: '将简体中文转换为繁体中文',
  category: 'conversion',
  isActive: false,
  priority: 7,
  execute: (text: string) => {
    const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
    return converter(text);
  }
};

// 繁体转简体
export const traditionalToSimplified: TextProcessor = {
  id: 'traditional-to-simplified',
  name: '繁体转简体',
  description: '将繁体中文转换为简体中文',
  category: 'conversion',
  isActive: false,
  priority: 8,
  execute: (text: string) => {
    const converter = OpenCC.Converter({ from: 'tw', to: 'cn' });
    return converter(text);
  }
};

// 康熙部首替换
export const replaceKangxiRadicals: TextProcessor = {
  id: 'replace-kangxi-radicals',
  name: '康熙部首替换',
  description: '将康熙部首字符替换为对应的常规汉字部件',
  category: 'conversion',
  isActive: false,
  priority: 9,
  execute: (text: string) => {
    return text.replace(/[\u2F00-\u2FD5]/g, char => char.normalize('NFKC'));
  }
};

// 导出所有转换类处理器
export const conversionProcessors: TextProcessor[] = [
  fullWidthToHalfWidth,
  halfWidthToFullWidth,
  uppercaseToLowerCase,
  lowercaseToUpperCase,
  englishToChinesePunctuation,
  chineseToEnglishPunctuation,
  simplifiedToTraditional,
  traditionalToSimplified,
  replaceKangxiRadicals
];
