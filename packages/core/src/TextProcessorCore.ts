import {
  TextProcessor,
  ProcessorCategory,
  ProcessingOptions,
  ProcessingResult,
  ProcessorConfig,
  HistoryEntry,
  TextProcessorCoreInterface
} from './types';
import { ConfigManager } from './config/config-manager';
import { HistoryManager } from './history/history-manager';

export class TextProcessorCore implements TextProcessorCoreInterface {
  private processors: Map<string, TextProcessor> = new Map();
  private configManager: ConfigManager;
  private historyManager: HistoryManager;

  constructor() {
    this.configManager = new ConfigManager();
    this.historyManager = new HistoryManager();
  }

  // 注册处理器
  registerProcessor(processor: TextProcessor): void {
    this.processors.set(processor.id, processor);
    this.configManager.updateProcessorConfig(processor.id, {
      isActive: processor.isActive,
      priority: processor.priority
    });
  }

  // 注销处理器
  unregisterProcessor(processorId: string): void {
    this.processors.delete(processorId);
    this.configManager.removeProcessorConfig(processorId);
  }

  // 处理文本
  process(text: string, options?: ProcessingOptions): ProcessingResult {
    const startTime = performance.now();
    const originalText = text;

    // 获取要使用的处理器
    const processorsToUse = this.getProcessorsToUse(options?.processors);

    // 按优先级排序
    const sortedProcessors = processorsToUse.sort((a, b) => a.priority - b.priority);

    // 执行处理器
    const processorsUsed: string[] = [];
    let processedText = text;

    for (const processor of sortedProcessors) {
      try {
        const result = processor.execute(processedText, options?.context);
        if (result instanceof Promise) {
          // 异步处理器需要等待
          // 这里简化处理，实际应该支持异步
          console.warn(`Processor ${processor.id} is async, skipping`);
          continue;
        }
        processedText = result;
        processorsUsed.push(processor.id);
      } catch (error) {
        console.error(`Processor ${processor.id} failed:`, error);
      }
    }

    const processingTime = performance.now() - startTime;

    return {
      text: processedText,
      originalText,
      processorsUsed,
      processingTime
    };
  }

  async processAsync(text: string, options?: ProcessingOptions): Promise<ProcessingResult> {
    const startTime = performance.now();
    const originalText = text;

    const processorsToUse = this.getProcessorsToUse(options?.processors);
    const sortedProcessors = processorsToUse.sort((a, b) => a.priority - b.priority);
    const processorsUsed: string[] = [];
    let processedText = text;

    for (const processor of sortedProcessors) {
      try {
        processedText = await processor.execute(processedText, options?.context);
        processorsUsed.push(processor.id);
      } catch (error) {
        console.error(`Processor ${processor.id} failed:`, error);
      }
    }

    const processingTime = performance.now() - startTime;

    return {
      text: processedText,
      originalText,
      processorsUsed,
      processingTime
    };
  }

  // 链式处理
  processWithChain(text: string, processorIds: string[]): ProcessingResult {
    const startTime = performance.now();
    const originalText = text;

    const processorsUsed: string[] = [];
    let processedText = text;

    for (const processorId of processorIds) {
      const processor = this.processors.get(processorId);
      if (!processor) {
        console.warn(`Processor ${processorId} not found`);
        continue;
      }

      try {
        const result = processor.execute(processedText);
        if (result instanceof Promise) {
          console.warn(`Processor ${processorId} is async, skipping`);
          continue;
        }
        processedText = result;
        processorsUsed.push(processorId);
      } catch (error) {
        console.error(`Processor ${processorId} failed:`, error);
      }
    }

    const processingTime = performance.now() - startTime;

    return {
      text: processedText,
      originalText,
      processorsUsed,
      processingTime
    };
  }

  // 获取处理器
  getProcessor(id: string): TextProcessor | undefined {
    return this.processors.get(id);
  }

  // 按类别获取处理器
  getProcessorsByCategory(category: ProcessorCategory): TextProcessor[] {
    return Array.from(this.processors.values()).filter(p => p.category === category);
  }

  // 加载配置
  loadConfig(config: ProcessorConfig): void {
    this.configManager.loadConfig(config);

    // 更新处理器状态
    for (const [processorId, processorConfig] of Object.entries(config.processors)) {
      const processor = this.processors.get(processorId);
      if (processor) {
        processor.isActive = processorConfig.isActive;
        processor.priority = processorConfig.priority;
      }
    }
  }

  // 导出配置
  exportConfig(): ProcessorConfig {
    return this.configManager.exportConfig();
  }

  // 添加到历史
  addToHistory(entry: HistoryEntry): void {
    this.historyManager.addEntry(entry);
  }

  // 获取历史
  loadHistory(entries: HistoryEntry[]): void {
    this.historyManager.loadEntries(entries);
  }

  getHistory(limit?: number): HistoryEntry[] {
    return this.historyManager.getEntries(limit);
  }

  // 清空历史
  clearHistory(): void {
    this.historyManager.clear();
  }

  // 获取要使用的处理器
  private getProcessorsToUse(processorIds?: string[]): TextProcessor[] {
    if (processorIds && processorIds.length > 0) {
      return processorIds
        .map(id => this.processors.get(id))
        .filter((p): p is TextProcessor => p !== undefined);
    }

    return Array.from(this.processors.values()).filter(p => p.isActive);
  }
}
