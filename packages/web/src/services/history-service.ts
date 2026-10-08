import type { HistoryEntry } from '@clipboard-processor/core';

export const HISTORY_STORAGE_KEY = 'clipboard-text-processor-history-v1';
const MAX_HISTORY_ENTRIES = 100;

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as Partial<HistoryEntry>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.timestamp === 'number' &&
    typeof entry.originalText === 'string' &&
    typeof entry.processedText === 'string' &&
    Array.isArray(entry.processorsUsed) &&
    entry.processorsUsed.every(processor => typeof processor === 'string') &&
    ['clipboard', 'selection', 'manual'].includes(entry.source || '')
  );
}

function saveHistory(entries: HistoryEntry[]): HistoryEntry[] {
  const normalizedEntries = [...entries]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_HISTORY_ENTRIES);

  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(normalizedEntries));
  } catch (error) {
    console.error('保存处理历史失败:', error);
  }

  return normalizedEntries;
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isHistoryEntry)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_HISTORY_ENTRIES);
  } catch (error) {
    console.error('加载处理历史失败:', error);
    return [];
  }
}

export function addHistoryEntry(entry: HistoryEntry): HistoryEntry[] {
  return saveHistory([entry, ...loadHistory().filter(item => item.id !== entry.id)]);
}

export function deleteHistoryEntry(id: string): HistoryEntry[] {
  return saveHistory(loadHistory().filter(entry => entry.id !== id));
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (error) {
    console.error('清空处理历史失败:', error);
  }
}
