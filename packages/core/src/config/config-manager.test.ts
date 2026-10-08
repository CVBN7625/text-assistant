import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigManager } from './config-manager';
import { defaultConfig } from './default-config';

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  describe('loadConfig', () => {
    it('should load config', () => {
      const newConfig = {
        ...defaultConfig,
        ui: {
          ...defaultConfig.ui,
          theme: 'dark' as const
        }
      };

      configManager.loadConfig(newConfig);
      const exported = configManager.exportConfig();
      expect(exported.ui.theme).toBe('dark');
    });
  });

  describe('exportConfig', () => {
    it('should export config', () => {
      const config = configManager.exportConfig();
      expect(config).toBeDefined();
      expect(config.processors).toBeDefined();
      expect(config.shortcuts).toBeDefined();
      expect(config.translation).toBeDefined();
      expect(config.ui).toBeDefined();
    });
  });

  describe('updateProcessorConfig', () => {
    it('should update processor config', () => {
      configManager.updateProcessorConfig('test-processor', {
        isActive: true,
        priority: 1
      });

      const config = configManager.exportConfig();
      expect(config.processors['test-processor']).toBeDefined();
      expect(config.processors['test-processor'].isActive).toBe(true);
      expect(config.processors['test-processor'].priority).toBe(1);
    });
  });

  describe('removeProcessorConfig', () => {
    it('should remove processor config', () => {
      configManager.updateProcessorConfig('test-processor', {
        isActive: true,
        priority: 1
      });

      configManager.removeProcessorConfig('test-processor');
      const config = configManager.exportConfig();
      expect(config.processors['test-processor']).toBeUndefined();
    });
  });

  describe('getProcessorConfig', () => {
    it('should get processor config', () => {
      configManager.updateProcessorConfig('test-processor', {
        isActive: true,
        priority: 1
      });

      const processorConfig = configManager.getProcessorConfig('test-processor');
      expect(processorConfig).toBeDefined();
      expect(processorConfig?.isActive).toBe(true);
      expect(processorConfig?.priority).toBe(1);
    });

    it('should return undefined for non-existent processor', () => {
      const processorConfig = configManager.getProcessorConfig('non-existent');
      expect(processorConfig).toBeUndefined();
    });
  });

  describe('getShortcuts', () => {
    it('should get shortcuts', () => {
      const shortcuts = configManager.getShortcuts();
      expect(shortcuts).toBeDefined();
      expect(shortcuts.processSelection).toBe('Ctrl+Shift+P');
      expect(shortcuts.processClipboard).toBe('Ctrl+Shift+V');
      expect(shortcuts.quickClean).toBe('Ctrl+Shift+C');
    });
  });

  describe('updateShortcuts', () => {
    it('should update shortcuts', () => {
      configManager.updateShortcuts({
        processSelection: 'Ctrl+Alt+P'
      });

      const shortcuts = configManager.getShortcuts();
      expect(shortcuts.processSelection).toBe('Ctrl+Alt+P');
      expect(shortcuts.processClipboard).toBe('Ctrl+Shift+V');
    });
  });

  describe('getTranslationConfig', () => {
    it('should get translation config', () => {
      const translationConfig = configManager.getTranslationConfig();
      expect(translationConfig).toBeDefined();
      expect(translationConfig.defaultEngine).toBe('baidu');
      expect(translationConfig.defaultSourceLang).toBe('auto');
      expect(translationConfig.defaultTargetLang).toBe('zh');
    });
  });

  describe('updateTranslationConfig', () => {
    it('should update translation config', () => {
      configManager.updateTranslationConfig({
        defaultEngine: 'google'
      });

      const translationConfig = configManager.getTranslationConfig();
      expect(translationConfig.defaultEngine).toBe('google');
    });
  });

  describe('getUIConfig', () => {
    it('should get UI config', () => {
      const uiConfig = configManager.getUIConfig();
      expect(uiConfig).toBeDefined();
      expect(uiConfig.theme).toBe('auto');
      expect(uiConfig.language).toBe('zh-CN');
      expect(uiConfig.showNotifications).toBe(true);
    });
  });

  describe('updateUIConfig', () => {
    it('should update UI config', () => {
      configManager.updateUIConfig({
        theme: 'dark'
      });

      const uiConfig = configManager.getUIConfig();
      expect(uiConfig.theme).toBe('dark');
    });
  });
});
