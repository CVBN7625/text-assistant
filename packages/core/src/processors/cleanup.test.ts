import { describe, it, expect } from 'vitest';
import {
  deleteDuplicateNewlines,
  deleteAllNewlines,
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
} from './cleanup';

describe('Cleanup Processors', () => {
  describe('deleteDuplicateNewlines (仅保留段落换行)', () => {
    it('应该保留在句号后的换行', () => {
      const input = '第一段。\n第二段。';
      const expected = '第一段。\n第二段。';
      expect(deleteDuplicateNewlines.execute(input)).toBe(expected);
    });

    it('应该删除非段落结尾的换行', () => {
      const input = '这是一段很长的文本，\n需要换行显示。';
      const expected = '这是一段很长的文本，需要换行显示。';
      expect(deleteDuplicateNewlines.execute(input)).toBe(expected);
    });

    it('应该保留感叹号后的换行', () => {
      const input = '太棒了！\n继续努力。';
      const expected = '太棒了！\n继续努力。';
      expect(deleteDuplicateNewlines.execute(input)).toBe(expected);
    });

    it('应该保留问号后的换行', () => {
      const input = '你好吗？\n我很好。';
      const expected = '你好吗？\n我很好。';
      expect(deleteDuplicateNewlines.execute(input)).toBe(expected);
    });

    it('应该保留省略号后的换行', () => {
      const input = '等等……\n还有更多。';
      const expected = '等等……\n还有更多。';
      expect(deleteDuplicateNewlines.execute(input)).toBe(expected);
    });

    it('应该保留下引号后的换行', () => {
      const input = '他说："你好"\n然后离开了。';
      const expected = '他说："你好"\n然后离开了。';
      expect(deleteDuplicateNewlines.execute(input)).toBe(expected);
    });

    it('应该保留中文下引号后的换行', () => {
      const input = '他说：“你好”\n然后离开了。';
      const expected = '他说：“你好”\n然后离开了。';
      expect(deleteDuplicateNewlines.execute(input)).toBe(expected);
    });

    it('应该处理多个连续换行', () => {
      const input = '第一段。\n\n\n第二段。';
      const expected = '第一段。\n第二段。';
      expect(deleteDuplicateNewlines.execute(input)).toBe(expected);
    });

    it('应该处理 Windows 换行符', () => {
      const input = '第一段。\r\n第二段。';
      const expected = '第一段。\n第二段。';
      expect(deleteDuplicateNewlines.execute(input)).toBe(expected);
    });
  });

  describe('deleteAllNewlines (删除所有换行)', () => {
    it('应该删除所有换行符', () => {
      const input = '第一行\n第二行\n第三行';
      const expected = '第一行第二行第三行';
      expect(deleteAllNewlines.execute(input)).toBe(expected);
    });

    it('应该处理 Windows 换行符', () => {
      const input = '第一行\r\n第二行\r\n第三行';
      const expected = '第一行第二行第三行';
      expect(deleteAllNewlines.execute(input)).toBe(expected);
    });

    it('应该保留段落结尾标记', () => {
      const input = '第一段。\n第二段！';
      const expected = '第一段。第二段！';
      expect(deleteAllNewlines.execute(input)).toBe(expected);
    });

    it('应该处理空文本', () => {
      const input = '';
      const expected = '';
      expect(deleteAllNewlines.execute(input)).toBe(expected);
    });

    it('应该处理只有换行的文本', () => {
      const input = '\n\n\n';
      const expected = '';
      expect(deleteAllNewlines.execute(input)).toBe(expected);
    });
  });

  describe('deleteDuplicateSpaces', () => {
    it('should be inactive by default', () => {
      expect(deleteDuplicateSpaces.isActive).toBe(false);
    });

    it('should delete duplicate spaces', () => {
      const input = 'Hello   World';
      const expected = 'Hello World';
      expect(deleteDuplicateSpaces.execute(input)).toBe(expected);
    });

    it('should handle multiple spaces', () => {
      const input = 'Hello     World';
      const expected = 'Hello World';
      expect(deleteDuplicateSpaces.execute(input)).toBe(expected);
    });
  });

  describe('removeSpacesBetweenChinese (删除所有空格)', () => {
    it('should be inactive by default', () => {
      expect(removeSpacesBetweenChinese.isActive).toBe(false);
    });

    it('should remove all spaces', () => {
      const input = '你 好 世 界';
      const expected = '你好世界';
      expect(removeSpacesBetweenChinese.execute(input)).toBe(expected);
    });

    it('should remove spaces between Chinese and English', () => {
      const input = 'Hello World';
      const expected = 'HelloWorld';
      expect(removeSpacesBetweenChinese.execute(input)).toBe(expected);
    });

    it('should remove multiple spaces', () => {
      const input = '你   好   世   界';
      const expected = '你好世界';
      expect(removeSpacesBetweenChinese.execute(input)).toBe(expected);
    });

    it('should preserve newlines', () => {
      const input = '第一段。\n第二段。';
      const expected = '第一段。\n第二段。';
      expect(removeSpacesBetweenChinese.execute(input)).toBe(expected);
    });
  });

  describe('keepEnglishWordSpaces (仅保留英文单词间空格)', () => {
    it('should be active by default', () => {
      expect(keepEnglishWordSpaces.isActive).toBe(true);
    });

    it('should keep English word spaces', () => {
      const input = 'Hello World';
      const expected = 'Hello World';
      expect(keepEnglishWordSpaces.execute(input)).toBe(expected);
    });

    it('should collapse duplicate English word spaces', () => {
      const input = 'Hello   World';
      const expected = 'Hello World';
      expect(keepEnglishWordSpaces.execute(input)).toBe(expected);
    });

    it('should remove spaces between Chinese characters', () => {
      const input = '你 好 世 界';
      const expected = '你好世界';
      expect(keepEnglishWordSpaces.execute(input)).toBe(expected);
    });

    it('should remove spaces between Chinese and English', () => {
      const input = '你好 World 世界 Hello';
      const expected = '你好World世界Hello';
      expect(keepEnglishWordSpaces.execute(input)).toBe(expected);
    });

    it('should preserve newlines', () => {
      const input = 'First paragraph.\nSecond paragraph.';
      const expected = 'First paragraph.\nSecond paragraph.';
      expect(keepEnglishWordSpaces.execute(input)).toBe(expected);
    });
  });

  describe('deleteReferenceBadges', () => {
    it('should delete reference badges', () => {
      const input = 'This is a reference [1] and [2, 3]';
      const expected = 'This is a reference  and ';
      expect(deleteReferenceBadges.execute(input)).toBe(expected);
    });

    it('should delete Chinese reference badges', () => {
      const input = 'This is a reference 【1】 and 【2, 3】';
      const expected = 'This is a reference  and ';
      expect(deleteReferenceBadges.execute(input)).toBe(expected);
    });

    it('should delete curved reference badges', () => {
      const input = 'This is a reference (1) and (2, 3)';
      const expected = 'This is a reference  and ';
      expect(deleteReferenceBadges.execute(input)).toBe(expected);
    });
  });

  describe('deleteFootnotes', () => {
    it('should delete footnotes', () => {
      const input = 'This is a footnote ① and ②';
      const expected = 'This is a footnote  and ';
      expect(deleteFootnotes.execute(input)).toBe(expected);
    });
  });

  describe('cleanCajSpecialCharacters', () => {
    it('should be inactive by default', () => {
      expect(cleanCajSpecialCharacters.isActive).toBe(false);
    });

    it('should clean CAJ private-use special characters', () => {
      const input = '文本内容\uE000\u200B';
      const expected = '文本内容';
      expect(cleanCajSpecialCharacters.execute(input)).toBe(expected);
    });
  });

  describe('deleteEmoji', () => {
    it('should be inactive by default', () => {
      expect(deleteEmoji.isActive).toBe(false);
    });

    it('should delete common emoji', () => {
      const input = 'Hello 😀 World 👍';
      const expected = 'Hello  World ';
      expect(deleteEmoji.execute(input)).toBe(expected);
    });
  });

  describe('deleteSpecialSymbols', () => {
    it('should be inactive by default', () => {
      expect(deleteSpecialSymbols.isActive).toBe(false);
    });

    it('should delete copyright and trademark symbols', () => {
      const input = 'Paper © 2026 ® ™';
      const expected = 'Paper  2026  ';
      expect(deleteSpecialSymbols.execute(input)).toBe(expected);
    });
  });

  describe('deleteDuplicatePunctuation', () => {
    it('should be inactive by default', () => {
      expect(deleteDuplicatePunctuation.isActive).toBe(false);
    });

    it('should collapse duplicate punctuation', () => {
      const input = '你好！！！真的吗？？Hello,,world';
      const expected = '你好！真的吗？Hello,world';
      expect(deleteDuplicatePunctuation.execute(input)).toBe(expected);
    });
  });

  describe('stripHtmlTags', () => {
    it('should strip HTML tags', () => {
      const input = '<p>Hello <b>World</b></p>';
      const expected = 'Hello World';
      expect(stripHtmlTags.execute(input)).toBe(expected);
    });
  });

  describe('removeUrls', () => {
    it('should remove URLs', () => {
      const input = 'Visit https://example.com for more info';
      const expected = 'Visit  for more info';
      expect(removeUrls.execute(input)).toBe(expected);
    });
  });
});
