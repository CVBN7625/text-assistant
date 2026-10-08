import { beforeEach, describe, expect, it } from 'vitest';
import {
  HISTORY_STORAGE_KEY,
  addHistoryEntry,
  clearHistory,
  deleteHistoryEntry,
  loadHistory
} from './history-service';

describe('history-service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and loads entries newest first', () => {
    addHistoryEntry(createEntry('older', 100));
    addHistoryEntry(createEntry('newer', 200));

    expect(loadHistory().map(entry => entry.id)).toEqual(['newer', 'older']);
  });

  it('deletes one entry without clearing the rest', () => {
    addHistoryEntry(createEntry('first', 100));
    addHistoryEntry(createEntry('second', 200));

    deleteHistoryEntry('second');

    expect(loadHistory().map(entry => entry.id)).toEqual(['first']);
  });

  it('ignores invalid stored data and clears history', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([{ id: 'invalid' }]));
    expect(loadHistory()).toEqual([]);

    addHistoryEntry(createEntry('valid', 100));
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });
});

function createEntry(id: string, timestamp: number) {
  return {
    id,
    timestamp,
    originalText: `${id} input`,
    processedText: `${id} output`,
    processorsUsed: ['processor'],
    source: 'manual' as const
  };
}
