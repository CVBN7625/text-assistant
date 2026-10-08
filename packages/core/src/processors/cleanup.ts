import { TextProcessor } from '../types';

// 仅保留段落换行（智能识别段落结尾）
export const deleteDuplicateNewlines: TextProcessor = {
  id: 'delete-duplicate-newlines',
  name: '仅保留段落换行',
  description: '删除多余换行，仅保留在句号、感叹号、省略号、问号、下引号后的换行（视为段落结尾）',
  category: 'cleanup',
  isActive: true,
  priority: 1,
  execute: (text: string) => {
    // 段落结尾标志：。 . ！ ! ？ ? … 以及常见下引号
    const paragraphEndPattern = /[。.！!？?…"'’”」』]$/;

    // 将文本按换行分割成行
    const lines = text.split(/\r?\n/);
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i].trim();
      const prevLine = result.length > 0 ? result[result.length - 1] : '';

      // 跳过空行
      if (!currentLine) {
        continue;
      }

      // 如果是第一行，直接添加
      if (result.length === 0) {
        result.push(currentLine);
        continue;
      }

      // 检查前一行是否以段落结尾标志结束
      if (paragraphEndPattern.test(prevLine)) {
        // 前一行是段落结尾，保留换行（添加换行符）
        result.push('\n' + currentLine);
      } else {
        // 前一行不是段落结尾，删除换行（连接到前一行）
        result[result.length - 1] = prevLine + currentLine;
      }
    }

    return result.join('');
  }
};

// 删除所有换行
export const deleteAllNewlines: TextProcessor = {
  id: 'delete-all-newlines',
  name: '删除所有换行',
  description: '删除文本中的所有换行符，将所有内容合并为一行',
  category: 'cleanup',
  isActive: false,  // 默认关闭
  priority: 1,  // 与 delete-duplicate-newlines 相同优先级
  execute: (text: string) => {
    return text.replace(/[\r\n]+/g, '');
  }
};

// 删除重复空格
export const deleteDuplicateSpaces: TextProcessor = {
  id: 'delete-duplicate-spaces',
  name: '删除重复空格',
  description: '将连续的多个空格合并为单个空格',
  category: 'cleanup',
  isActive: false,
  priority: 2,
  execute: (text: string) => {
    return text.replace(/ +/g, ' ');
  }
};

// 删除所有空格
export const removeSpacesBetweenChinese: TextProcessor = {
  id: 'remove-spaces-between-chinese',
  name: '删除所有空格',
  description: '删除所有空格，保留换行',
  category: 'cleanup',
  isActive: false,
  priority: 3,
  execute: (text: string) => {
    return text.replace(/[^\S\r\n]+/g, '');
  }
};

// 仅保留英文单词间空格
export const keepEnglishWordSpaces: TextProcessor = {
  id: 'keep-english-word-spaces',
  name: '仅保留英文单词间空格',
  description: '删除非英文单词之间的空格，并将英文单词间连续空格合并为单个空格',
  category: 'cleanup',
  isActive: true,
  priority: 4,
  execute: (text: string) => {
    return text.replace(/[^\S\r\n]+/g, (spaces, offset, wholeText) => {
      const previousChar = wholeText[offset - 1] ?? '';
      const nextChar = wholeText[offset + spaces.length] ?? '';
      return /[A-Za-z]/.test(previousChar) && /[A-Za-z]/.test(nextChar) ? ' ' : '';
    });
  }
};

// 删除引用角标
export const deleteReferenceBadges: TextProcessor = {
  id: 'delete-reference-badges',
  name: '删除引用角标',
  description: '删除学术引用角标，如 [1], [2, 3], (4-7)',
  category: 'cleanup',
  isActive: true,
  priority: 5,
  execute: (text: string) => {
    text = text.replace(/\[[\d,\-\s]+]/g, '');
    text = text.replace(/【[\d,\-\s]+】/g, '');
    text = text.replace(/\([\d,\-\s]+\)/g, '');
    return text;
  }
};

// 删除脚注标记
export const deleteFootnotes: TextProcessor = {
  id: 'delete-footnotes',
  name: '删除脚注标记',
  description: '删除脚注标记，如 ①, ②, ③',
  category: 'cleanup',
  isActive: true,
  priority: 6,
  execute: (text: string) => {
    return text.replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/g, '');
  }
};

// CAJ 特殊字符清理
export const cleanCajSpecialCharacters: TextProcessor = {
  id: 'clean-caj-special-characters',
  name: 'CAJ 特殊字符清理',
  description: '清理 CAJViewer 复制文本中常见的异常空白、私用区字符和不可见字符',
  category: 'cleanup',
  isActive: false,
  priority: 7,
  execute: (text: string) => {
    return text
      .replace(//g, '')
      .replace(/[\uE000-\uF8FF\uFFFC]/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '');
  }
};

// 删除 Emoji 表情
export const deleteEmoji: TextProcessor = {
  id: 'delete-emoji',
  name: '删除 Emoji 表情',
  description: '删除常见 Emoji 表情符号',
  category: 'cleanup',
  isActive: false,
  priority: 8,
  execute: (text: string) => {
    return text
      .replace(/[#*0-9]\uFE0F?\u20E3/gu, '')
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]\uFE0F?/gu, '');
  }
};

// 删除特殊符号
export const deleteSpecialSymbols: TextProcessor = {
  id: 'delete-special-symbols',
  name: '删除特殊符号',
  description: '删除版权、注册商标、商标等常见特殊符号',
  category: 'cleanup',
  isActive: false,
  priority: 9,
  execute: (text: string) => {
    return text.replace(/[©®™℠℗]/g, '');
  }
};

// 删除重复标点
export const deleteDuplicatePunctuation: TextProcessor = {
  id: 'delete-duplicate-punctuation',
  name: '删除重复标点',
  description: '将连续重复的常见标点符号合并为单个标点',
  category: 'cleanup',
  isActive: false,
  priority: 10,
  execute: (text: string) => {
    return text.replace(/([，。！？、；：,.!?;:])\1+/g, '$1');
  }
};

// 删除 HTML 标签
export const stripHtmlTags: TextProcessor = {
  id: 'strip-html-tags',
  name: '删除 HTML 标签',
  description: '删除所有 HTML 标签',
  category: 'cleanup',
  isActive: false,
  priority: 11,
  execute: (text: string) => {
    return text.replace(/<[^>]*>/g, '');
  }
};

// 删除 URL 链接
export const removeUrls: TextProcessor = {
  id: 'remove-urls',
  name: '删除 URL 链接',
  description: '删除所有 URL 链接',
  category: 'cleanup',
  isActive: false,
  priority: 12,
  execute: (text: string) => {
    return text.replace(/https?:\/\/[^\s]+/g, '');
  }
};

// 导出所有清理类处理器
export const cleanupProcessors: TextProcessor[] = [
  deleteDuplicateNewlines,  // 仅保留段落换行
  deleteAllNewlines,        // 删除所有换行（新增）
  deleteDuplicateSpaces,
  removeSpacesBetweenChinese,
  keepEnglishWordSpaces,
  deleteReferenceBadges,
  deleteFootnotes,
  cleanCajSpecialCharacters,
  deleteEmoji,
  deleteSpecialSymbols,
  deleteDuplicatePunctuation,
  stripHtmlTags,
  removeUrls
];
