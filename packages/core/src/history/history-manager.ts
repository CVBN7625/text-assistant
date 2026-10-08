import { HistoryEntry } from '../types';

export class HistoryManager {
  private entries: HistoryEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries: number = 100) {
    this.maxEntries = maxEntries;
  }

  // 添加条目
  addEntry(entry: HistoryEntry): void {
    this.entries.unshift(entry);

    // 限制历史记录数量
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }
  }

  // 获取条目
  loadEntries(entries: HistoryEntry[]): void {
    this.entries = [...entries]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, this.maxEntries);
  }

  getEntries(limit?: number): HistoryEntry[] {
    if (limit) {
      return this.entries.slice(0, limit);
    }
    return [...this.entries];
  }

  // 根据 ID 获取条目
  getEntryById(id: string): HistoryEntry | undefined {
    return this.entries.find(entry => entry.id === id);
  }

  // 删除条目
  deleteEntry(id: string): void {
    this.entries = this.entries.filter(entry => entry.id !== id);
  }

  // 清空历史
  clear(): void {
    this.entries = [];
  }

  // 获取条目数量
  getCount(): number {
    return this.entries.length;
  }

  // 搜索条目
  searchEntries(query: string): HistoryEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.entries.filter(
      entry =>
        entry.originalText.toLowerCase().includes(lowerQuery) ||
        entry.processedText.toLowerCase().includes(lowerQuery)
    );
  }
}
