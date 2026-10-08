<template>
  <div class="image-translator-page ctp-page">
    <PageHeader
      title="图片翻译"
    >
      <template #meta>
        <n-tag :type="quotaStats.stopped ? 'error' : 'success'">
          {{ quotaStats.used }} / {{ quotaStats.freeLimit }} 次
        </n-tag>
      </template>
    </PageHeader>

    <n-grid :cols="2" :x-gap="16" responsive="screen" class="ctp-workbench">
      <n-gi class="workbench-column">
        <n-card title="图片标本" size="small" class="ctp-specimen-panel">
          <div
            class="drop-zone ctp-specimen-panel"
            :class="{ 'has-preview': previewUrl }"
            @dragover.prevent
            @drop.prevent="handleDrop"
          >
            <img v-if="previewUrl" :src="previewUrl" alt="待翻译图片预览" />
            <div v-else class="drop-empty">
              <n-text strong>拖入图片或点击选择</n-text>
              <n-text depth="3">JPG、PNG、BMP、WebP，最大 {{ maxSizeLabel }}</n-text>
            </div>
            <input
              class="file-input"
              type="file"
              accept="image/png,image/jpeg,image/bmp,image/webp"
              @change="handleFileChange"
            />
          </div>

          <template #footer>
            <n-space justify="space-between" align="center">
              <n-text depth="3">
                {{ selectedFile ? `${selectedFile.name} · ${formatFileSize(selectedFile.size)}` : '未选择图片' }}
              </n-text>
              <n-space>
                <n-button size="small" @click="clearFile">清空</n-button>
                <n-button
                  type="primary"
                  :loading="isTranslating"
                  :disabled="!canTranslate"
                  @click="translateSelectedImage"
                >
                  翻译图片
                </n-button>
              </n-space>
            </n-space>
          </template>
        </n-card>
      </n-gi>

      <n-gi class="workbench-column">
        <n-card title="结果" size="small" class="translation-record ctp-work-sheet ctp-work-sheet--result">
          <n-alert v-if="errorMsg" type="error" closable @close="errorMsg = ''">
            {{ errorMsg }}
          </n-alert>

          <div v-if="!result && !isTranslating" class="translation-record-empty">
            <div>
              <h2>等待翻译文字</h2>
              <p>选择图片并开始翻译，译文会记录在这里并可一键复制。</p>
            </div>
          </div>
          <n-spin v-if="isTranslating" class="result-spin" />

          <div v-if="result" class="translation-record-content">
            <div class="translation-record-toolbar">
              <n-space align="center">
                <n-tag type="info">{{ result.from }} → {{ result.to }}</n-tag>
                <n-text depth="3" class="ctp-functional-text">
                  耗时 {{ (result.duration / 1000).toFixed(1) }}s
                </n-text>
              </n-space>
              <n-button
                type="primary"
                :disabled="!result.translatedText"
                @click="handleCopyText"
              >
                复制译文
              </n-button>
            </div>

            <section class="translated-note">
              <span class="note-label">译文</span>
              <p class="ctp-user-content">{{ result.translatedText || '未返回翻译文本' }}</p>
            </section>

            <n-collapse v-if="showSourceReference" class="source-reference">
              <n-collapse-item title="查看识别原文" name="source">
                <p class="ctp-user-content">{{ result.sourceText || '未返回识别文本' }}</p>
              </n-collapse-item>
            </n-collapse>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-card title="图片翻译设置" size="small" class="ctp-field-note">
      <n-form :model="config" label-placement="left" label-width="130">
        <n-grid :cols="2" :x-gap="20" responsive="screen">
          <n-gi>
            <n-form-item label="源语言">
              <n-select v-model:value="sourceLang" :options="sourceLanguageOptions" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="目标语言">
              <n-select v-model:value="targetLang" :options="targetLanguageOptions" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="APP ID">
              <n-input
                v-model:value="config.baiduAppId"
                type="password"
                show-password-on="click"
                placeholder="百度翻译 APP ID"
                @blur="handleSaveConfig"
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="Secret Key">
              <n-input
                v-model:value="config.baiduSecretKey"
                type="password"
                show-password-on="click"
                placeholder="百度翻译开发者密钥"
                @blur="handleSaveConfig"
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="请求地址">
              <n-input
                v-model:value="config.endpoint"
                placeholder="留空使用站点同源图片翻译代理"
                @blur="handleSaveConfig"
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="CUID">
              <n-input
                v-model:value="config.cuid"
                placeholder="留空时自动生成"
                @blur="handleSaveConfig"
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="MAC">
              <n-input
                v-model:value="config.mac"
                placeholder="留空时使用默认值"
                @blur="handleSaveConfig"
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="控制台已用">
              <n-input-number
                v-model:value="config.quotaBaseline"
                :min="0"
                :precision="0"
                @update:value="handleSaveConfig"
              />
            </n-form-item>
          </n-gi>
        </n-grid>

        <n-space align="center">
          <n-tag :type="quotaStats.stopped ? 'error' : 'success'">
            本月记录 {{ quotaStats.used }} / {{ quotaStats.freeLimit }} 次
          </n-tag>
          <n-tag type="warning">95% 停止线：{{ quotaStats.stopAt }} 次</n-tag>
          <n-button size="small" @click="handleResetQuota">重置本地图片额度记录</n-button>
        </n-space>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  NAlert,
  NButton,
  NCard,
  NCollapse,
  NCollapseItem,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NSpin,
  NTag,
  NText,
  useMessage
} from 'naive-ui';
import { useImageTranslator } from '../composables/useImageTranslator';
import {
  IMAGE_TRANSLATION_LANGUAGES,
  type ImageTranslationLanguageCode
} from '../services/image-translation-service';
import PageHeader from '../components/PageHeader.vue';

const message = useMessage();

const {
  config,
  sourceLang,
  targetLang,
  selectedFile,
  previewUrl,
  result,
  isTranslating,
  errorMsg,
  quotaStats,
  canTranslate,
  maxSizeLabel,
  updateConfig,
  resetQuotaUsage,
  selectFile,
  clearFile,
  translateSelectedImage,
  copyTranslatedText
} = useImageTranslator();

const sourceLanguageOptions = computed(() =>
  IMAGE_TRANSLATION_LANGUAGES.map(lang => ({
    label: lang.label,
    value: lang.code
  }))
);

const targetLanguageOptions = computed(() =>
  IMAGE_TRANSLATION_LANGUAGES.filter(lang => lang.code !== 'auto').map(lang => ({
    label: lang.label,
    value: lang.code as Exclude<ImageTranslationLanguageCode, 'auto'>
  }))
);

const showSourceReference = computed(() => {
  const sourceText = normalizeComparableText(result.value?.sourceText);
  const translatedText = normalizeComparableText(result.value?.translatedText);
  return Boolean(sourceText && translatedText && sourceText !== translatedText);
});

function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] || null;
  selectFile(file);
}

function handleDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0] || null;
  selectFile(file);
}

function handleSaveConfig() {
  updateConfig(config);
}

function handleResetQuota() {
  resetQuotaUsage();
  message.info('图片翻译本地额度记录已重置');
}

async function handleCopyText() {
  const success = await copyTranslatedText();
  if (success) {
    message.success('已复制译文');
  }
}

function normalizeComparableText(text?: string) {
  return (text || '').replace(/\s+/g, '').trim();
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
</script>

<style scoped>
.image-translator-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1480px;
  margin: 0 auto;
}

.page-header {
  background: var(--ctp-surface, #fffdfa);
}

.workbench-column {
  min-width: 0;
}

.workbench-column :deep(.n-card) {
  display: flex;
  flex-direction: column;
  height: clamp(500px, calc(100vh - 280px), 600px);
  overflow: hidden;
}

.workbench-column:first-child :deep(.n-card-content) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.drop-zone {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 360px;
  border: 1px dashed var(--ctp-border-strong, #cfc4b1);
  border-radius: 8px;
  overflow: hidden;
  background:
    linear-gradient(rgba(255, 253, 247, 0.78), rgba(255, 253, 247, 0.78)),
    repeating-linear-gradient(0deg, transparent 0, transparent 31px, rgba(102, 114, 74, 0.06) 32px);
  transition: border-color 0.18s ease, background 0.18s ease;
}

.drop-zone:hover {
  border-color: var(--ctp-secondary, #66724a);
  background: var(--ctp-surface, #fffdfa);
}

.drop-zone.has-preview {
  background: var(--ctp-surface, #fffdfa);
}

.drop-zone img {
  width: 100%;
  max-height: 520px;
  object-fit: contain;
  display: block;
}

.drop-empty {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  color: var(--ctp-text-muted, #706a5f);
}

.file-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.result-spin {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.translation-record :deep(.n-card-content) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 360px;
  overflow: hidden;
}

.translation-record-empty {
  display: grid;
  flex: 1;
  place-items: center;
  min-height: 0;
  padding: 40px;
  text-align: center;
  border: 1px dashed var(--ctp-border-strong, #cfc4b1);
  border-radius: 8px;
  background: var(--ctp-surface-clean, #fffdf8);
}

.translation-record-empty h2 {
  margin: 0 0 8px;
  font-size: 18px;
}

.translation-record-empty p {
  margin: 0;
  color: var(--ctp-text-muted, #706a5f);
  line-height: 1.7;
}

.translation-record-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.translation-record-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.translated-note {
  position: relative;
  flex: 1;
  min-height: 220px;
  padding: 34px 28px 28px;
  border: 1px solid var(--ctp-border, #ddd5c6);
  border-radius: 6px;
  background: var(--ctp-surface-clean, #fffdf8);
  overflow-y: auto;
}

.note-label {
  position: absolute;
  top: 10px;
  left: 14px;
  color: var(--ctp-secondary, #66724a);
  font-size: 12px;
  font-weight: 600;
}

.translated-note p,
.source-reference p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--ctp-text, #25231f);
  font-size: 15px;
  line-height: 1.85;
}

.source-reference {
  padding: 0 14px;
  border-top: 1px dashed var(--ctp-border-strong, #cfc4b1);
}

@media (max-width: 720px) {
  .translation-record-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
}

:deep(.n-card) {
  border-radius: 8px;
}

:deep(.n-card-header) {
  border-bottom: 1px solid var(--ctp-border, #ddd5c6);
}

:deep(.n-empty) {
  padding: 44px 0;
}
</style>
