<template>
  <div class="settings ctp-page">
    <PageHeader
      title="应用设置"
      decor="settings"
    >
      <template #meta>
        <n-tag type="success" size="small">{{ currentSkinLabel }}</n-tag>
      </template>
    </PageHeader>

    <n-card class="settings-card ctp-field-note">
      <n-tabs type="line" animated>
        <n-tab-pane name="general" tab="通用设置">
          <div class="tab-content">
            <n-form label-placement="left" label-width="140" :model="config">
              <section class="setting-section">
                <div class="section-heading">
                  <n-text strong>界面皮肤</n-text>
                  <n-text depth="3">经典版保持原有简洁体验，向日葵手稿使用纸质素描与屏幕文楷风格。</n-text>
                </div>

                <div class="skin-grid">
                  <button
                    v-for="option in skinPreviewOptions"
                    :key="option.value"
                    type="button"
                    class="skin-option"
                    :class="[`skin-option--${option.value}`, { 'is-active': config.ui.skin === option.value }]"
                    @click="handleSkinUpdate(option.value)"
                  >
                    <span class="skin-preview">
                      <span class="preview-sidebar"></span>
                      <span class="preview-content">
                        <span></span>
                        <span></span>
                      </span>
                    </span>
                    <span class="skin-copy">
                      <strong>{{ option.label }}</strong>
                      <small>{{ option.description }}</small>
                    </span>
                  </button>
                </div>
              </section>

              <n-grid :cols="2" :x-gap="24" responsive="screen">
                <n-gi>
                  <n-form-item label="主题模式">
                    <n-select
                      v-model:value="config.ui.theme"
                      :options="themeOptions"
                      placeholder="选择主题"
                    />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="界面语言">
                    <n-select
                      v-model:value="config.ui.language"
                      :options="languageOptions"
                      placeholder="选择语言"
                    />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="显示通知">
                    <n-switch v-model:value="config.ui.showNotifications" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="自动处理剪贴板">
                    <n-switch v-model:value="config.ui.autoProcessClipboard" />
                  </n-form-item>
                </n-gi>
              </n-grid>
            </n-form>
          </div>
        </n-tab-pane>

        <n-tab-pane name="processors" tab="处理器设置">
          <div class="tab-content">
            <n-alert type="info" class="soft-alert">
              选择默认启用的处理器。这些处理器将在处理文本时自动应用。
            </n-alert>

            <n-list bordered>
              <n-list-item v-for="processor in processors" :key="processor.id">
                <n-thing>
                  <template #header>
                    <n-checkbox v-model:checked="processor.isActive">
                      <n-text strong>{{ processor.name }}</n-text>
                    </n-checkbox>
                  </template>
                  <template #description>
                    <n-text depth="3" class="small-text">
                      {{ processor.description }}
                    </n-text>
                  </template>
                </n-thing>
              </n-list-item>
            </n-list>
          </div>
        </n-tab-pane>

        <n-tab-pane name="shortcuts" tab="快捷键">
          <div class="tab-content">
            <n-alert type="warning" class="soft-alert">
              快捷键设置功能开发中。
            </n-alert>
            <n-list bordered>
              <n-list-item>
                <n-thing>
                  <template #header><n-text strong>处理文本</n-text></template>
                  <template #description><n-tag size="small" type="info" class="ctp-technical-text">Ctrl + Enter</n-tag></template>
                </n-thing>
              </n-list-item>
              <n-list-item>
                <n-thing>
                  <template #header><n-text strong>清空输入</n-text></template>
                  <template #description><n-tag size="small" type="info" class="ctp-technical-text">Ctrl + Shift + Delete</n-tag></template>
                </n-thing>
              </n-list-item>
              <n-list-item>
                <n-thing>
                  <template #header><n-text strong>复制结果</n-text></template>
                  <template #description><n-tag size="small" type="info" class="ctp-technical-text">Ctrl + Shift + C</n-tag></template>
                </n-thing>
              </n-list-item>
            </n-list>
          </div>
        </n-tab-pane>

        <n-tab-pane name="translation" tab="翻译配置">
          <div class="tab-content">
            <translation-settings />
          </div>
        </n-tab-pane>
        <n-tab-pane name="ocr" tab="OCR 配置">
          <div class="tab-content">
            <ocr-settings />
          </div>
        </n-tab-pane>
      </n-tabs>

      <n-divider />
      <n-space justify="end">
        <n-button @click="resetConfig">重置默认</n-button>
        <n-button type="primary" strong @click="saveConfig">保存设置</n-button>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NDivider,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NList,
  NListItem,
  NSelect,
  NSpace,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
  NText,
  NThing,
  useMessage
} from 'naive-ui';
import { allProcessors } from '@clipboard-processor/core';
import TranslationSettings from './TranslationSettings.vue';
import OcrSettings from './OcrSettings.vue';
import PageHeader from '../components/PageHeader.vue';
import {
  getStoredSkin,
  setStoredSkin,
  skinOptions,
  type SkinName
} from '../theme/skins';

const message = useMessage();

const config = ref({
  ui: {
    theme: 'auto',
    skin: getStoredSkin(),
    language: 'zh-CN',
    showNotifications: true,
    autoProcessClipboard: false
  }
});

const processors = ref(
  allProcessors.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    isActive: p.isActive
  }))
);

const themeOptions = [
  { label: '跟随系统', value: 'auto' },
  { label: '浅色模式', value: 'light' },
  { label: '深色模式', value: 'dark' }
];

const skinPreviewOptions: Array<{
  label: string;
  value: SkinName;
  description: string;
}> = [
  { label: 'Classic', value: 'classic', description: '干净中性，适合长期办公使用。' },
  { label: '向日葵手稿', value: 'sunflower', description: '暖白纸面、植物素描与克制的屏幕文楷。' }
];

const currentSkinLabel = computed(() =>
  skinOptions.find(option => option.value === config.value.ui.skin)?.label || 'Classic'
);

const languageOptions = [
  { label: '中文（简体）', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
];

function handleSkinUpdate(value: SkinName) {
  config.value.ui.skin = value;
  setStoredSkin(value);
}

function saveConfig() {
  setStoredSkin(config.value.ui.skin);
  message.success('设置已保存');
}

function resetConfig() {
  if (confirm('确定要重置所有设置吗？')) {
    config.value = {
      ui: {
        theme: 'auto',
        skin: 'classic',
        language: 'zh-CN',
        showNotifications: true,
        autoProcessClipboard: false
      }
    };
    setStoredSkin('classic');
  }
}
</script>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-title {
  display: block;
  font-size: 18px;
}

.page-subtitle,
.small-text {
  display: block;
  font-size: 13px;
}

.tab-content {
  padding: 20px 0;
}

.setting-section {
  padding: 16px;
  margin-bottom: 22px;
  border: 1px solid var(--ctp-border, #ddd5c6);
  border-radius: 8px;
  background: var(--ctp-surface-soft, #f2eee5);
}

.section-heading {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}

.section-heading :deep(.n-text-depth-3) {
  font-size: 13px;
}

.skin-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.skin-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  text-align: left;
  color: var(--ctp-text, #25231f);
  border: 1px solid var(--ctp-border, #ddd5c6);
  border-radius: 8px;
  background: var(--ctp-surface, #fffdfa);
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.skin-option:hover,
.skin-option.is-active {
  border-color: var(--ctp-secondary, #66724a);
  box-shadow: 0 0 0 2px rgba(102, 116, 68, 0.12);
}

.skin-option.is-active {
  transform: translateY(-1px);
}

.skin-preview {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 6px;
  width: 76px;
  height: 46px;
  padding: 6px;
  border: 1px solid var(--ctp-border, #ddd5c6);
  border-radius: 6px;
  background: #f7f6f2;
}

.preview-sidebar {
  border-radius: 3px;
  background: #e8e2d7;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-content span {
  flex: 1;
  border-radius: 3px;
  background: #fffdfa;
  border: 1px solid #e0d8ca;
}

.skin-option--sunflower .skin-preview {
  background:
    linear-gradient(rgba(251, 248, 240, 0.9), rgba(251, 248, 240, 0.9)),
    url('/themes/sunflower/v2/paper-grain.webp') center / cover;
}

.skin-option--sunflower .preview-sidebar {
  background:
    linear-gradient(rgba(234, 226, 207, 0.86), rgba(234, 226, 207, 0.86)),
    url('/themes/sunflower/v2/botanical-sidebar.webp') bottom / cover;
}

.skin-option--sunflower .preview-content span:first-child {
  background:
    var(--ctp-surface-clean, #fffdf8)
    url('/themes/sunflower/v2/paint-stroke-tab.webp') center / 80% auto no-repeat;
}

.skin-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.skin-copy strong {
  font-size: 14px;
}

.skin-copy small {
  color: var(--ctp-text-muted, #706a5f);
  font-size: 12px;
  line-height: 1.45;
}

.soft-alert {
  margin-bottom: 16px;
  border-radius: 8px;
}

:deep(.n-tabs .n-tabs-tab) {
  font-weight: 560;
}

:deep(.n-form-item-label) {
  color: var(--ctp-text-muted, #706a5f);
  font-weight: 560;
}

:deep(.n-list-item) {
  padding: 12px 16px;
  transition: background-color 0.2s ease;
}

:deep(.n-list-item:hover) {
  background-color: var(--ctp-surface-soft, #f2eee5);
}

:deep(.n-divider) {
  border-color: var(--ctp-border, #ddd5c6);
}

@media (max-width: 900px) {
  .skin-grid {
    grid-template-columns: 1fr;
  }
}
</style>
