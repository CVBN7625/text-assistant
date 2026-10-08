import { describe, it, expect, beforeEach } from 'vitest';
import { TextProcessorCore } from './TextProcessorCore';
import { TextProcessor } from './types';

describe('TextProcessorCore', () => {
  let core: TextProcessorCore;

  beforeEach(() => {
    core = new TextProcessorCore();
  });

  describe('registerProcessor', () => {
    it('should register a processor', () => {
      const processor: TextProcessor = {
        id: 'test-processor',
        name: '测试处理器',
        description: '测试用处理器',
        category: 'cleanup',
        isActive: true,
        priority: 1,
        execute: (text: string) => text
      };

      core.registerProcessor(processor);
      expect(core.getProcessor('test-processor')).toBeDefined();
    });

    it('should update processor config', () => {
      const processor: TextProcessor = {
        id: 'test-processor',
        name: '测试处理器',
        description: '测试用处理器',
        category: 'cleanup',
        isActive: true,
        priority: 1,
        execute: (text: string) => text
      };

      core.registerProcessor(processor);
      const config = core.exportConfig();
      expect(config.processors['test-processor']).toBeDefined();
      expect(config.processors['test-processor'].isActive).toBe(true);
      expect(config.processors['test-processor'].priority).toBe(1);
    });
  });

  describe('unregisterProcessor', () => {
    it('should unregister a processor', () => {
      const processor: TextProcessor = {
        id: 'test-processor',
        name: '测试处理器',
        description: '测试用处理器',
        category: 'cleanup',
        isActive: true,
        priority: 1,
        execute: (text: string) => text
      };

      core.registerProcessor(processor);
      core.unregisterProcessor('test-processor');
      expect(core.getProcessor('test-processor')).toBeUndefined();
    });
  });

  describe('process', () => {
    it('should process text with active processors', () => {
      const processor: TextProcessor = {
        id: 'test-processor',
        name: '测试处理器',
        description: '测试用处理器',
        category: 'cleanup',
        isActive: true,
        priority: 1,
        execute: (text: string) => text.toUpperCase()
      };

      core.registerProcessor(processor);
      const result = core.process('hello');
      expect(result.text).toBe('HELLO');
      expect(result.processorsUsed).toContain('test-processor');
    });

    it('should not process text with inactive processors', () => {
      const processor: TextProcessor = {
        id: 'test-processor',
        name: '测试处理器',
        description: '测试用处理器',
        category: 'cleanup',
        isActive: false,
        priority: 1,
        execute: (text: string) => text.toUpperCase()
      };

      core.registerProcessor(processor);
      const result = core.process('hello');
      expect(result.text).toBe('hello');
      expect(result.processorsUsed).not.toContain('test-processor');
    });

    it('should process text with multiple processors', () => {
      const processor1: TextProcessor = {
        id: 'processor-1',
        name: '处理器 1',
        description: '测试用处理器 1',
        category: 'cleanup',
        isActive: true,
        priority: 1,
        execute: (text: string) => text.toUpperCase()
      };

      const processor2: TextProcessor = {
        id: 'processor-2',
        name: '处理器 2',
        description: '测试用处理器 2',
        category: 'cleanup',
        isActive: true,
        priority: 2,
        execute: (text: string) => text + '!'
      };

      core.registerProcessor(processor1);
      core.registerProcessor(processor2);
      const result = core.process('hello');
      expect(result.text).toBe('HELLO!');
      expect(result.processorsUsed).toContain('processor-1');
      expect(result.processorsUsed).toContain('processor-2');
    });

    it('should process text with specified processors', () => {
      const processor1: TextProcessor = {
        id: 'processor-1',
        name: '处理器 1',
        description: '测试用处理器 1',
        category: 'cleanup',
        isActive: true,
        priority: 1,
        execute: (text: string) => text.toUpperCase()
      };

      const processor2: TextProcessor = {
        id: 'processor-2',
        name: '处理器 2',
        description: '测试用处理器 2',
        category: 'cleanup',
        isActive: true,
        priority: 2,
        execute: (text: string) => text + '!'
      };

      core.registerProcessor(processor1);
      core.registerProcessor(processor2);
      const result = core.process('hello', { processors: ['processor-1'] });
      expect(result.text).toBe('HELLO');
      expect(result.processorsUsed).toContain('processor-1');
      expect(result.processorsUsed).not.toContain('processor-2');
    });
  });

  describe('processAsync', () => {
    it('should process text with async processors', async () => {
      const processor: TextProcessor = {
        id: 'async-processor',
        name: '异步处理器',
        description: '测试用异步处理器',
        category: 'translation',
        isActive: true,
        priority: 1,
        execute: async (text: string) => `${text} translated`
      };

      core.registerProcessor(processor);
      const result = await core.processAsync('hello');

      expect(result.text).toBe('hello translated');
      expect(result.processorsUsed).toContain('async-processor');
    });
  });

  describe('processWithChain', () => {
    it('should process text with chain of processors', () => {
      const processor1: TextProcessor = {
        id: 'processor-1',
        name: '处理器 1',
        description: '测试用处理器 1',
        category: 'cleanup',
        isActive: true,
        priority: 1,
        execute: (text: string) => text.toUpperCase()
      };

      const processor2: TextProcessor = {
        id: 'processor-2',
        name: '处理器 2',
        description: '测试用处理器 2',
        category: 'cleanup',
        isActive: true,
        priority: 2,
        execute: (text: string) => text + '!'
      };

      core.registerProcessor(processor1);
      core.registerProcessor(processor2);
      const result = core.processWithChain('hello', ['processor-1', 'processor-2']);
      expect(result.text).toBe('HELLO!');
      expect(result.processorsUsed).toContain('processor-1');
      expect(result.processorsUsed).toContain('processor-2');
    });
  });

  describe('getProcessor', () => {
    it('should return processor by id', () => {
      const processor: TextProcessor = {
        id: 'test-processor',
        name: '测试处理器',
        description: '测试用处理器',
        category: 'cleanup',
        isActive: true,
        priority: 1,
        execute: (text: string) => text
      };

      core.registerProcessor(processor);
      expect(core.getProcessor('test-processor')).toBeDefined();
      expect(core.getProcessor('test-processor')?.id).toBe('test-processor');
    });

    it('should return undefined for non-existent processor', () => {
      expect(core.getProcessor('non-existent')).toBeUndefined();
    });
  });

  describe('getProcessorsByCategory', () => {
    it('should return processors by category', () => {
      const processor1: TextProcessor = {
        id: 'cleanup-processor',
        name: '清理处理器',
        description: '清理用处理器',
        category: 'cleanup',
        isActive: true,
        priority: 1,
        execute: (text: string) => text
      };

      const processor2: TextProcessor = {
        id: 'conversion-processor',
        name: '转换处理器',
        description: '转换用处理器',
        category: 'conversion',
        isActive: true,
        priority: 1,
        execute: (text: string) => text
      };

      core.registerProcessor(processor1);
      core.registerProcessor(processor2);

      const cleanupProcessors = core.getProcessorsByCategory('cleanup');
      expect(cleanupProcessors).toHaveLength(1);
      expect(cleanupProcessors[0].id).toBe('cleanup-processor');

      const conversionProcessors = core.getProcessorsByCategory('conversion');
      expect(conversionProcessors).toHaveLength(1);
      expect(conversionProcessors[0].id).toBe('conversion-processor');
    });
  });

  describe('loadConfig', () => {
    it('should load config and update processor states', () => {
      const processor: TextProcessor = {
        id: 'test-processor',
        name: '测试处理器',
        description: '测试用处理器',
        category: 'cleanup',
        isActive: true,
        priority: 1,
        execute: (text: string) => text
      };

      core.registerProcessor(processor);

      const newConfig = {
        processors: {
          'test-processor': {
            isActive: false,
            priority: 2
          }
        },
        shortcuts: {
          processSelection: 'Ctrl+Shift+P',
          processClipboard: 'Ctrl+Shift+V',
          quickClean: 'Ctrl+Shift+C'
        },
        translation: {
          defaultEngine: 'baidu' as const,
          apiKeys: {},
          defaultSourceLang: 'auto',
          defaultTargetLang: 'zh'
        },
        ui: {
          theme: 'auto' as const,
          language: 'zh-CN',
          showNotifications: true,
          autoProcessClipboard: false,
          floatingMenuEnabled: true
        }
      };

      core.loadConfig(newConfig);
      expect(core.getProcessor('test-processor')?.isActive).toBe(false);
      expect(core.getProcessor('test-processor')?.priority).toBe(2);
    });
  });

  describe('exportConfig', () => {
    it('should export current config', () => {
      const config = core.exportConfig();
      expect(config).toBeDefined();
      expect(config.processors).toBeDefined();
      expect(config.shortcuts).toBeDefined();
      expect(config.translation).toBeDefined();
      expect(config.ui).toBeDefined();
    });
  });

  describe('history management', () => {
    it('should add and get history entries', () => {
      const entry = {
        id: 'test-entry',
        timestamp: Date.now(),
        originalText: 'hello',
        processedText: 'HELLO',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      core.addToHistory(entry);
      const history = core.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('test-entry');
    });

    it('should clear history', () => {
      const entry = {
        id: 'test-entry',
        timestamp: Date.now(),
        originalText: 'hello',
        processedText: 'HELLO',
        processorsUsed: ['test-processor'],
        source: 'manual' as const
      };

      core.addToHistory(entry);
      core.clearHistory();
      const history = core.getHistory();
      expect(history).toHaveLength(0);
    });
  });
});
