import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryManager } from './history-manager';

describe('HistoryManager', () => {
  let historyManager: HistoryManager;

  beforeEach(() => {
    historyManager = new HistoryManager();
  });

  describe('addEntry', () => {
    it('should add entry', () => {
      const entry = {
        id: 'test-entry',
        timestamp: Date.now(),
        originalText: 'hello',
        processedText: 'HELLO',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      historyManager.addEntry(entry);
      const entries = historyManager.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('test-entry');
    });

    it('should add entry to the beginning', () => {
      const entry1 = {
        id: 'entry-1',
        timestamp: Date.now(),
        originalText: 'hello',
        processedText: 'HELLO',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      const entry2 = {
        id: 'entry-2',
        timestamp: Date.now() + 1000,
        originalText: 'world',
        processedText: 'WORLD',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      historyManager.addEntry(entry1);
      historyManager.addEntry(entry2);
      const entries = historyManager.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].id).toBe('entry-2');
      expect(entries[1].id).toBe('entry-1');
    });

    it('should limit entries', () => {
      const historyManager = new HistoryManager(2);

      const entry1 = {
        id: 'entry-1',
        timestamp: Date.now(),
        originalText: 'hello',
        processedText: 'HELLO',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      const entry2 = {
        id: 'entry-2',
        timestamp: Date.now() + 1000,
        originalText: 'world',
        processedText: 'WORLD',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      const entry3 = {
        id: 'entry-3',
        timestamp: Date.now() + 2000,
        originalText: 'test',
        processedText: 'TEST',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      historyManager.addEntry(entry1);
      historyManager.addEntry(entry2);
      historyManager.addEntry(entry3);
      const entries = historyManager.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].id).toBe('entry-3');
      expect(entries[1].id).toBe('entry-2');
    });
  });

  describe('getEntries', () => {
    it('should get all entries', () => {
      const entry1 = {
        id: 'entry-1',
        timestamp: Date.now(),
        originalText: 'hello',
        processedText: 'HELLO',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      const entry2 = {
        id: 'entry-2',
        timestamp: Date.now() + 1000,
        originalText: 'world',
        processedText: 'WORLD',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      historyManager.addEntry(entry1);
      historyManager.addEntry(entry2);
      const entries = historyManager.getEntries();
      expect(entries).toHaveLength(2);
    });

    it('should get limited entries', () => {
      const entry1 = {
        id: 'entry-1',
        timestamp: Date.now(),
        originalText: 'hello',
        processedText: 'HELLO',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      const entry2 = {
        id: 'entry-2',
        timestamp: Date.now() + 1000,
        originalText: 'world',
        processedText: 'WORLD',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      historyManager.addEntry(entry1);
      historyManager.addEntry(entry2);
      const entries = historyManager.getEntries(1);
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('entry-2');
    });
  });

  describe('getEntryById', () => {
    it('should get entry by id', () => {
      const entry = {
        id: 'test-entry',
        timestamp: Date.now(),
        originalText: 'hello',
        processedText: 'HELLO',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      historyManager.addEntry(entry);
      const found = historyManager.getEntryById('test-entry');
      expect(found).toBeDefined();
      expect(found?.id).toBe('test-entry');
    });

    it('should return undefined for non-existent entry', () => {
      const found = historyManager.getEntryById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('deleteEntry', () => {
    it('should delete entry', () => {
      const entry = {
        id: 'test-entry',
        timestamp: Date.now(),
        originalText: 'hello',
        processedText: 'HELLO',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      historyManager.addEntry(entry);
      historyManager.deleteEntry('test-entry');
      const entries = historyManager.getEntries();
      expect(entries).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      const entry1 = {
        id: 'entry-1',
        timestamp: Date.now(),
        originalText: 'hello',
        processedText: 'HELLO',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      const entry2 = {
        id: 'entry-2',
        timestamp: Date.now() + 1000,
        originalText: 'world',
        processedText: 'WORLD',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      historyManager.addEntry(entry1);
      historyManager.addEntry(entry2);
      historyManager.clear();
      const entries = historyManager.getEntries();
      expect(entries).toHaveLength(0);
    });
  });

  describe('getCount', () => {
    it('should get count', () => {
      const entry1 = {
        id: 'entry-1',
        timestamp: Date.now(),
        originalText: 'hello',
        processedText: 'HELLO',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      const entry2 = {
        id: 'entry-2',
        timestamp: Date.now() + 1000,
        originalText: 'world',
        processedText: 'WORLD',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      historyManager.addEntry(entry1);
      historyManager.addEntry(entry2);
      expect(historyManager.getCount()).toBe(2);
    });
  });

  describe('searchEntries', () => {
    it('should search entries', () => {
      const entry1 = {
        id: 'entry-1',
        timestamp: Date.now(),
        originalText: 'hello world',
        processedText: 'HELLO WORLD',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      const entry2 = {
        id: 'entry-2',
        timestamp: Date.now() + 1000,
        originalText: 'test',
        processedText: 'TEST',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      historyManager.addEntry(entry1);
      historyManager.addEntry(entry2);
      const results = historyManager.searchEntries('hello');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('entry-1');
    });
  });
});
