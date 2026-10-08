import { describe, it, expect } from 'vitest';
import {
  addSpaceBetweenChineseAndEnglish,
  addSpaceBetweenLettersAndNumbers,
  addSpaceAfterPunctuation,
  addParagraphIndent,
  normalizeReferenceNumbering,
  normalizeReferenceAuthorCase,
  normalizeReferenceJournalCase,
  removeReferenceDoi
} from './enhancement';

describe('Enhancement Processors', () => {
  describe('addSpaceBetweenChineseAndEnglish', () => {
    it('should be inactive by default', () => {
      expect(addSpaceBetweenChineseAndEnglish.isActive).toBe(false);
    });

    it('should add space between Chinese and English', () => {
      const input = '你好World';
      const expected = '你好 World';
      expect(addSpaceBetweenChineseAndEnglish.execute(input)).toBe(expected);
    });

    it('should add space between English and Chinese', () => {
      const input = 'Hello世界';
      const expected = 'Hello 世界';
      expect(addSpaceBetweenChineseAndEnglish.execute(input)).toBe(expected);
    });

    it('should handle multiple Chinese and English', () => {
      const input = '你好World世界Hello';
      const expected = '你好 World 世界 Hello';
      expect(addSpaceBetweenChineseAndEnglish.execute(input)).toBe(expected);
    });
  });

  describe('addSpaceBetweenLettersAndNumbers', () => {
    it('should be inactive by default', () => {
      expect(addSpaceBetweenLettersAndNumbers.isActive).toBe(false);
    });

    it('should add space between letters and numbers', () => {
      const input = 'A1B2';
      const expected = 'A 1 B 2';
      expect(addSpaceBetweenLettersAndNumbers.execute(input)).toBe(expected);
    });

    it('should add space between numbers and letters', () => {
      const input = '2024year';
      const expected = '2024 year';
      expect(addSpaceBetweenLettersAndNumbers.execute(input)).toBe(expected);
    });
  });

  describe('addSpaceAfterPunctuation', () => {
    it('should be inactive by default', () => {
      expect(addSpaceAfterPunctuation.isActive).toBe(false);
    });

    it('should add space after punctuation', () => {
      const input = 'Hello,World';
      const expected = 'Hello, World';
      expect(addSpaceAfterPunctuation.execute(input)).toBe(expected);
    });

    it('should not add space if already exists', () => {
      const input = 'Hello, World';
      const expected = 'Hello, World';
      expect(addSpaceAfterPunctuation.execute(input)).toBe(expected);
    });
  });

  describe('addParagraphIndent', () => {
    it('should add paragraph indent', () => {
      const input = 'Hello\n\nWorld';
      const expected = '  Hello\n\n  World';
      expect(addParagraphIndent.execute(input)).toBe(expected);
    });
  });

  describe('normalizeReferenceNumbering', () => {
    it('should keep already normalized reference numbers', () => {
      const input = [
        '参考文献',
        '[1] Smith J. Title one[J]. Nature, 2020.',
        '[2] Wang L. Title two[J]. Science, 2021.',
        '[3] Li M. Title three[J]. Cell, 2022.'
      ].join('\n');

      expect(normalizeReferenceNumbering.execute(input)).toBe(input);
    });

    it('should normalize duplicated leading reference numbers', () => {
      const input = [
        '参考文献',
        '[1][1][1]Smith J. Title one[J]. Nature, 2020.',
        '[1][1][1]Wang L. Title two[J]. Science, 2021.'
      ].join('\n');
      const expected = [
        '参考文献',
        '[1] Smith J. Title one[J]. Nature, 2020.',
        '[2] Wang L. Title two[J]. Science, 2021.'
      ].join('\n');

      expect(normalizeReferenceNumbering.execute(input)).toBe(expected);
    });

    it('should add missing reference numbers', () => {
      const input = [
        '参考文献',
        'Smith J. Title one[J]. Nature, 2020.',
        'Wang L. Title two[J]. Science, 2021.'
      ].join('\n');
      const expected = [
        '参考文献',
        '[1] Smith J. Title one[J]. Nature, 2020.',
        '[2] Wang L. Title two[J]. Science, 2021.'
      ].join('\n');

      expect(normalizeReferenceNumbering.execute(input)).toBe(expected);
    });

    it('should normalize alternate numbering styles and add one space after the number', () => {
      const input = [
        '参考文献',
        '1.Smith J. Title one[J]. Nature, 2020.',
        '2)  Wang L. Title two[J]. Science, 2021.',
        '3、Li M. Title three[J]. Cell, 2022.'
      ].join('\n');
      const expected = [
        '参考文献',
        '[1] Smith J. Title one[J]. Nature, 2020.',
        '[2] Wang L. Title two[J]. Science, 2021.',
        '[3] Li M. Title three[J]. Cell, 2022.'
      ].join('\n');

      expect(normalizeReferenceNumbering.execute(input)).toBe(expected);
    });

    it('should not number non-reference notes after the reference heading', () => {
      const input = [
        '参考文献',
        '以下为补充说明',
        'Smith J. Title one[J]. Nature, 2020.'
      ].join('\n');
      const expected = [
        '参考文献',
        '以下为补充说明',
        '[1] Smith J. Title one[J]. Nature, 2020.'
      ].join('\n');

      expect(normalizeReferenceNumbering.execute(input)).toBe(expected);
    });
  });

  describe('normalizeReferenceAuthorCase', () => {
    it('should normalize English author names at the start of reference lines', () => {
      const input = [
        '参考文献',
        '[1] smith j, DOE J R, van-der-waals p. Title[J]. Nature, 2020.'
      ].join('\n');
      const expected = [
        '参考文献',
        '[1] Smith J, Doe J R, Van-Der-Waals P. Title[J]. Nature, 2020.'
      ].join('\n');

      expect(normalizeReferenceAuthorCase.execute(input)).toBe(expected);
    });

    it('should leave Chinese author segments unchanged', () => {
      const input = '参考文献\n[1] 张三, 李四. 论文题名[J]. 中国科学, 2020.';

      expect(normalizeReferenceAuthorCase.execute(input)).toBe(input);
    });
  });

  describe('normalizeReferenceJournalCase', () => {
    it('should normalize journal title case after [J]', () => {
      const input = [
        '参考文献',
        '[1] Smith J. Title[J]. journal of machine learning research, 2020, 21(1): 1-10.'
      ].join('\n');
      const expected = [
        '参考文献',
        '[1] Smith J. Title[J]. Journal of Machine Learning Research, 2020, 21(1): 1-10.'
      ].join('\n');

      expect(normalizeReferenceJournalCase.execute(input)).toBe(expected);
    });

    it('should preserve common acronyms in journal names', () => {
      const input = '参考文献\n[1] Smith J. Title[J]. ieee transactions on pattern analysis, 2020.';
      const expected = '参考文献\n[1] Smith J. Title[J]. IEEE Transactions on Pattern Analysis, 2020.';

      expect(normalizeReferenceJournalCase.execute(input)).toBe(expected);
    });

    it('should normalize all-uppercase journal names', () => {
      const input = '参考文献\n[1] Smith J. Title[J]. JOURNAL OF MACHINE LEARNING RESEARCH, 2020.';
      const expected = '参考文献\n[1] Smith J. Title[J]. Journal of Machine Learning Research, 2020.';

      expect(normalizeReferenceJournalCase.execute(input)).toBe(expected);
    });
  });

  describe('removeReferenceDoi', () => {
    it('should remove DOI labels from reference lines', () => {
      const input = '参考文献\n[1] Smith J. Title[J]. Nature, 2020, 10(1): 1-10. DOI: 10.1038/s41586-020-2649-2';
      const expected = '参考文献\n[1] Smith J. Title[J]. Nature, 2020, 10(1): 1-10';

      expect(removeReferenceDoi.execute(input)).toBe(expected);
    });

    it('should remove doi.org links from reference lines', () => {
      const input = '参考文献\n[1] Smith J. Title[J]. Nature, 2020. https://doi.org/10.1038/s41586-020-2649-2';
      const expected = '参考文献\n[1] Smith J. Title[J]. Nature, 2020';

      expect(removeReferenceDoi.execute(input)).toBe(expected);
    });

    it('should remove bare DOI values from reference lines', () => {
      const input = '参考文献\n[1] Smith J. Title[J]. Nature, 2020, doi 10.1038/s41586-020-2649-2.';
      const expected = '参考文献\n[1] Smith J. Title[J]. Nature, 2020';

      expect(removeReferenceDoi.execute(input)).toBe(expected);
    });
  });
});
