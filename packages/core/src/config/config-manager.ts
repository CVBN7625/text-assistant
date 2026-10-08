import { ProcessorConfig } from '../types';
import { defaultConfig } from './default-config';

export class ConfigManager {
  private config: ProcessorConfig;

  constructor() {
    this.config = { ...defaultConfig };
  }

  // 加载配置
  loadConfig(config: ProcessorConfig): void {
    this.config = { ...config };
  }

  // 导出配置
  exportConfig(): ProcessorConfig {
    return { ...this.config };
  }

  // 更新处理器配置
  updateProcessorConfig(processorId: string, config: { isActive: boolean; priority: number }): void {
    this.config.processors[processorId] = {
      ...this.config.processors[processorId],
      ...config
    };
  }

  // 删除处理器配置
  removeProcessorConfig(processorId: string): void {
    delete this.config.processors[processorId];
  }

  // 获取处理器配置
  getProcessorConfig(processorId: string): { isActive: boolean; priority: number } | undefined {
    return this.config.processors[processorId];
  }

  // 获取快捷键配置
  getShortcuts(): { processSelection: string; processClipboard: string; quickClean: string } {
    return { ...this.config.shortcuts };
  }

  // 更新快捷键配置
  updateShortcuts(shortcuts: Partial<{ processSelection: string; processClipboard: string; quickClean: string }>): void {
    this.config.shortcuts = { ...this.config.shortcuts, ...shortcuts };
  }

  // 获取翻译配置
  getTranslationConfig(): ProcessorConfig['translation'] {
    return { ...this.config.translation };
  }

  // 更新翻译配置
  updateTranslationConfig(config: Partial<ProcessorConfig['translation']>): void {
    this.config.translation = { ...this.config.translation, ...config };
  }

  // 获取 UI 配置
  getUIConfig(): ProcessorConfig['ui'] {
    return { ...this.config.ui };
  }

  // 更新 UI 配置
  updateUIConfig(config: Partial<ProcessorConfig['ui']>): void {
    this.config.ui = { ...this.config.ui, ...config };
  }
}
