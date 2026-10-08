import { TextProcessor } from '../types';

const referenceHeadingPattern = /^\s*(参考文献|参考资料|References|Bibliography)\s*[:：]?\s*$/i;
const referenceMarkerRunPattern =
  /^(?:(?:\[\s*\d+\s*]|【\s*\d+\s*】|\(\s*\d+\s*\)|\d+[.)、])\s*)+/;
const leadingReferenceMarkerPattern =
  /^\s*(?:\[\s*\d+\s*]|【\s*\d+\s*】|\(\s*\d+\s*\)|\d+[.)、])/;
const journalTitleSmallWords = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'via',
  'with'
]);
const preservedAcronyms = new Set([
  'AAAI',
  'ACM',
  'AI',
  'BMJ',
  'CVPR',
  'IEEE',
  'IJCAI',
  'JAMA',
  'MIT',
  'NIPS',
  'PNAS',
  'PLOS',
  'SIAM',
  'SIGIR',
  'WWW'
]);

function splitTextWithLineEndings(text: string): string[] {
  return text.split(/(\r\n|\n|\r)/);
}

function hasReferenceHeading(parts: string[]): boolean {
  return parts.some((part, index) => index % 2 === 0 && referenceHeadingPattern.test(part));
}

function isLikelyReferenceLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    leadingReferenceMarkerPattern.test(trimmed) ||
    /\[[JjDdMmCcPp]\]/.test(trimmed) ||
    /\b(?:18|19|20)\d{2}\b/.test(trimmed) ||
    /\bdoi\s*[:：]/i.test(trimmed)
  );
}

function mapReferenceLines(text: string, mapper: (line: string) => string): string {
  const parts = splitTextWithLineEndings(text);
  const containsHeading = hasReferenceHeading(parts);
  let inReferences = !containsHeading;

  for (let index = 0; index < parts.length; index += 2) {
    const line = parts[index];

    if (referenceHeadingPattern.test(line)) {
      inReferences = true;
      continue;
    }

    if (!inReferences || line.trim() === '' || !isLikelyReferenceLine(line)) {
      continue;
    }

    parts[index] = mapper(line);
  }

  return parts.join('');
}

function capitalizeAsciiWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function normalizeHyphenatedWord(word: string): string {
  return word
    .split('-')
    .map(part => {
      if (part === '') {
        return part;
      }

      return capitalizeAsciiWord(part);
    })
    .join('-');
}

function normalizeAuthorToken(token: string, tokenIndex: number): string {
  const letters = token.replace(/[^A-Za-z]/g, '');

  if (!letters) {
    return token;
  }

  if (/^[A-Za-z]\.?$/.test(token) || (/^[A-Z]{2,3}\.?$/.test(token) && tokenIndex > 0)) {
    return token.toUpperCase();
  }

  if (/[a-z]/.test(token) && /[A-Z]/.test(token.slice(1))) {
    return token;
  }

  return token.replace(/[A-Za-z]+(?:-[A-Za-z]+)*/g, normalizeHyphenatedWord);
}

function normalizeAuthorPart(part: string): string {
  let tokenIndex = 0;

  return part.replace(/[A-Za-z]+(?:-[A-Za-z]+)*\.?/g, token => {
    const normalized = normalizeAuthorToken(token, tokenIndex);
    tokenIndex += 1;
    return normalized;
  });
}

function normalizeAuthorSegment(segment: string): string {
  return segment
    .split(/([,，;；]|&|\band\b)/i)
    .map(part => {
      if (/^([,，;；]|&|\band\b)$/i.test(part)) {
        return part.toLowerCase() === 'and' ? 'and' : part;
      }

      return normalizeAuthorPart(part);
    })
    .join('');
}

function normalizeAuthorsInReferenceLine(line: string): string {
  const leadingWhitespace = line.match(/^\s*/)?.[0] ?? '';
  const body = line.slice(leadingWhitespace.length);
  const marker = body.match(referenceMarkerRunPattern)?.[0] ?? '';
  const contentStart = marker.length;
  const content = body.slice(contentStart);
  const boundary = content.search(/[.。．]\s+/);

  if (boundary <= 0) {
    return line;
  }

  const authorSegment = content.slice(0, boundary);

  if (!/[A-Za-z]/.test(authorSegment)) {
    return line;
  }

  const normalizedAuthorSegment = normalizeAuthorSegment(authorSegment);
  return leadingWhitespace + marker + normalizedAuthorSegment + content.slice(boundary);
}

function normalizeJournalWord(word: string, index: number, total: number): string {
  const match = word.match(/^([^A-Za-z]*)([A-Za-z][A-Za-z-]*)([^A-Za-z]*)$/);

  if (!match) {
    return word;
  }

  const [, prefix, core, suffix] = match;
  const upperCore = core.toUpperCase();
  const lowerCore = core.toLowerCase();

  if (preservedAcronyms.has(upperCore)) {
    return prefix + upperCore + suffix;
  }

  if (/[a-z]/.test(core) && /[A-Z]/.test(core.slice(1))) {
    return word;
  }

  if (index > 0 && index < total - 1 && journalTitleSmallWords.has(lowerCore)) {
    return prefix + lowerCore + suffix;
  }

  return prefix + normalizeHyphenatedWord(lowerCore) + suffix;
}

function normalizeJournalTitle(title: string): string {
  const parts = title.split(/(\s+)/);
  const wordIndexes = parts
    .map((part, index) => (/[A-Za-z]/.test(part) ? index : -1))
    .filter(index => index >= 0);
  const totalWords = wordIndexes.length;
  let currentWordIndex = 0;

  return parts
    .map((part, partIndex) => {
      if (!wordIndexes.includes(partIndex)) {
        return part;
      }

      const normalized = normalizeJournalWord(part, currentWordIndex, totalWords);
      currentWordIndex += 1;
      return normalized;
    })
    .join('');
}

function normalizeJournalNameInReferenceLine(line: string): string {
  return line.replace(
    /(\[[Jj]\]\s*\.?\s*)([^,\r\n]+?)(?=,\s*(?:18|19|20)\d{2}\b)/g,
    (_match, marker: string, journalName: string) => {
      const normalizedMarker = marker.replace(/\[[Jj]\]/, '[J]');
      return normalizedMarker + normalizeJournalTitle(journalName.trim());
    }
  );
}

function removeDoiFromReferenceLine(line: string): string {
  return line
    .replace(
      /\s*([,，;；。.]?\s*(?:doi\s*[:：]?\s*|https?:\/\/(?:dx\.)?doi\.org\/)\s*10\.\d{4,9}\/[-._;()/:A-Z0-9]+)\.?/gi,
      ''
    )
    .replace(/\s*([,，;；。.]?\s*10\.\d{4,9}\/[-._;()/:A-Z0-9]+)\.?/gi, '')
    .replace(/\s+([,，;；。])/g, '$1')
    .replace(/[ \t]+$/g, '');
}

// 中英文间添加空格
export const addSpaceBetweenChineseAndEnglish: TextProcessor = {
  id: 'add-space-between-chinese-and-english',
  name: '中英文间添加空格',
  description: '在中文字符和英文字母之间添加空格',
  category: 'enhancement',
  isActive: false,
  priority: 1,
  execute: (text: string) => {
    return text
      .replace(/([\u4e00-\u9fff])([A-Za-z])/g, '$1 $2')
      .replace(/([A-Za-z])([\u4e00-\u9fff])/g, '$1 $2');
  }
};

// 字母与数字间添加空格
export const addSpaceBetweenLettersAndNumbers: TextProcessor = {
  id: 'add-space-between-letters-and-numbers',
  name: '字母与数字间添加空格',
  description: '在英文字母和数字之间添加空格',
  category: 'enhancement',
  isActive: false,
  priority: 2,
  execute: (text: string) => {
    return text
      .replace(/([A-Za-z])(\d)/g, '$1 $2')
      .replace(/(\d)([A-Za-z])/g, '$1 $2');
  }
};

// 标点后添加空格
export const addSpaceAfterPunctuation: TextProcessor = {
  id: 'add-space-after-punctuation',
  name: '标点后添加空格',
  description: '在英文标点符号后添加空格',
  category: 'enhancement',
  isActive: false,
  priority: 3,
  execute: (text: string) => {
    return text.replace(/([,.?:;])([^\s,.?:;])/g, '$1 $2');
  }
};

// 添加段落缩进
export const addParagraphIndent: TextProcessor = {
  id: 'add-paragraph-indent',
  name: '添加段落缩进',
  description: '为每个段落添加两个空格的缩进',
  category: 'enhancement',
  isActive: false,
  priority: 4,
  execute: (text: string) => {
    return text
      .split('\n\n')
      .map(paragraph => '  ' + paragraph.trim())
      .join('\n\n');
  }
};

// 规范参考文献序号
export const normalizeReferenceNumbering: TextProcessor = {
  id: 'normalize-reference-numbering',
  name: '规范参考文献序号',
  description: '将参考文献列表整理为连续的 [1]、[2] 序号，并保证序号后有一个空格',
  category: 'enhancement',
  isActive: false,
  priority: 5,
  execute: (text: string) => {
    const parts = splitTextWithLineEndings(text);
    const containsHeading = hasReferenceHeading(parts);
    let inReferences = !containsHeading;
    let referenceIndex = 1;

    for (let index = 0; index < parts.length; index += 2) {
      const line = parts[index];

      if (referenceHeadingPattern.test(line)) {
        inReferences = true;
        continue;
      }

      if (!inReferences || line.trim() === '') {
        continue;
      }

      const trimmed = line.trim();
      const hasMarker = leadingReferenceMarkerPattern.test(trimmed);

      if (!hasMarker && !isLikelyReferenceLine(line)) {
        continue;
      }

      const leadingWhitespace = line.match(/^\s*/)?.[0] ?? '';
      const content = line.slice(leadingWhitespace.length).replace(referenceMarkerRunPattern, '').trimStart();

      if (content === '') {
        continue;
      }

      parts[index] = `${leadingWhitespace}[${referenceIndex}] ${content}`;
      referenceIndex += 1;
    }

    return parts.join('');
  }
};

// 规范参考文献作者英文大小写
export const normalizeReferenceAuthorCase: TextProcessor = {
  id: 'normalize-reference-author-case',
  name: '参考文献作者首字母大写',
  description: '将参考文献开头可识别的英文作者姓名整理为首字母大写，并保留缩写字母',
  category: 'enhancement',
  isActive: false,
  priority: 6,
  execute: (text: string) => mapReferenceLines(text, normalizeAuthorsInReferenceLine)
};

// 规范参考文献期刊名大小写
export const normalizeReferenceJournalCase: TextProcessor = {
  id: 'normalize-reference-journal-case',
  name: '参考文献期刊名称首字母大写',
  description: '将 [J] 后可识别的英文期刊名称整理为单词首字母大写，并保留常见缩写',
  category: 'enhancement',
  isActive: false,
  priority: 7,
  execute: (text: string) => mapReferenceLines(text, normalizeJournalNameInReferenceLine)
};

// 删除参考文献 DOI
export const removeReferenceDoi: TextProcessor = {
  id: 'remove-reference-doi',
  name: '删除参考文献 DOI',
  description: '删除参考文献行中的 DOI、doi: 和 doi.org 链接',
  category: 'enhancement',
  isActive: false,
  priority: 8,
  execute: (text: string) => mapReferenceLines(text, removeDoiFromReferenceLine)
};

// 导出所有增强类处理器
export const enhancementProcessors: TextProcessor[] = [
  addSpaceBetweenChineseAndEnglish,
  addSpaceBetweenLettersAndNumbers,
  addSpaceAfterPunctuation,
  addParagraphIndent,
  normalizeReferenceNumbering,
  normalizeReferenceAuthorCase,
  normalizeReferenceJournalCase,
  removeReferenceDoi
];
