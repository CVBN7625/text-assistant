<template>
  <div class="ocr-page ctp-page">
    <PageHeader
      title="OCR 文字识别"
    >
      <template #actions>
        <n-space align="center">
          <n-tag :type="quota.stopped ? 'error' : 'success'">已用 {{ quota.used + quota.baseline }} / {{ quota.limit }}</n-tag>
          <n-button size="small" @click="openOcrSettings">配置 OCR</n-button>
        </n-space>
      </template>
    </PageHeader>

    <n-grid :cols="2" :x-gap="16" responsive="screen" class="ctp-workbench">
      <n-gi class="workbench-column">
        <n-card title="图片标本" size="small" class="ctp-specimen-panel">
          <div class="drop-zone ctp-specimen-panel" @dragover.prevent @drop.prevent="handleDrop">
            <img v-if="previewUrl" :src="previewUrl" alt="OCR 图片预览" />
            <n-space v-else vertical align="center">
              <n-text strong>拖入图片或点击选择</n-text>
              <n-text depth="3">支持 PNG、JPEG、BMP，最大 7 MB</n-text>
            </n-space>
            <input class="file-input" type="file" accept="image/png,image/jpeg,image/bmp" @change="handleFileChange" />
          </div>
          <template #footer>
            <n-space justify="space-between" align="center">
              <n-text depth="3">{{ selectedFile?.name || '未选择图片' }}</n-text>
              <n-space>
                <n-button size="small" @click="clearFile">清空</n-button>
                <n-button type="primary" :disabled="!selectedFile" :loading="loading" @click="runOcr">识别文字</n-button>
              </n-space>
            </n-space>
          </template>
        </n-card>
      </n-gi>

      <n-gi class="workbench-column">
        <n-card title="结果" size="small" class="ocr-result ctp-work-sheet ctp-work-sheet--result">
          <n-alert v-if="errorMessage" type="error" closable @close="errorMessage = ''">{{ errorMessage }}</n-alert>
          <div v-if="!resultText && !loading" class="ocr-result-empty">
            <div>
              <h2>等待转录图片</h2>
              <p>选择图片并开始识别后，可编辑的文字结果会显示在这里。</p>
            </div>
          </div>
          <n-spin v-if="loading" class="result-spin" />
          <div v-if="resultText" class="ocr-result-content">
            <div class="ocr-result-toolbar">
              <n-text depth="3" class="ctp-functional-text">{{ resultMeta }}</n-text>
              <n-button type="primary" @click="copyResult">复制文字</n-button>
            </div>
            <n-input v-model:value="resultText" type="textarea" class="ocr-result-input ctp-user-content" />
          </div>
        </n-card>
      </n-gi>
    </n-grid>
    <n-card title="当前识别模型" size="small" class="ctp-receipt">
      <n-space vertical>
        <n-select v-model:value="config.model" :options="modelOptions" @update:value="saveAndRefresh" />
        <n-text depth="3">{{ selectedModelDescription }}</n-text>
        <n-text depth="3">保护阈值前剩余 {{ quota.remaining }} 次。密钥和额度设置请前往设置页。</n-text>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton, NCard, NGi, NGrid, NInput, NSelect, NSpace, NSpin, NTag, NText, useMessage } from 'naive-ui';
import { addHistoryEntry } from '../services/history-service';
import { OCR_MODELS, getOcrQuota, loadOcrConfig, recognizeFile, saveOcrConfig } from '../services/tencent-ocr-service';
import PageHeader from '../components/PageHeader.vue';

const message = useMessage();
const router = useRouter();
const config = ref(loadOcrConfig());
const selectedFile = ref<File | null>(null);
const previewUrl = ref('');
const resultText = ref('');
const resultMeta = ref('');
const errorMessage = ref('');
const loading = ref(false);
const quotaVersion = ref(0);
const quota = computed(() => { quotaVersion.value; return getOcrQuota(config.value); });
const modelOptions = OCR_MODELS.map(item => ({ label: item.label, value: item.value }));
const selectedModelDescription = computed(() => OCR_MODELS.find(item => item.value === config.value.model)?.description || '');

function selectFile(file: File | null) {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  selectedFile.value = file; previewUrl.value = file ? URL.createObjectURL(file) : ''; resultText.value = ''; errorMessage.value = '';
}
function handleFileChange(event: Event) { selectFile((event.target as HTMLInputElement).files?.[0] || null); }
function handleDrop(event: DragEvent) { selectFile(event.dataTransfer?.files?.[0] || null); }
function clearFile() { selectFile(null); }
function saveAndRefresh() { saveOcrConfig(config.value); quotaVersion.value++; }
function openOcrSettings() { void router.push('/settings'); }

async function runOcr() {
  if (!selectedFile.value) return;
  loading.value = true; errorMessage.value = ''; saveAndRefresh();
  try {
    const result = await recognizeFile(selectedFile.value, config.value);
    resultText.value = result.text;
    resultMeta.value = `${OCR_MODELS.find(item => item.value === result.model)?.label} · ${(result.duration / 1000).toFixed(1)}s`;
    quotaVersion.value++;
    if (result.text) addHistoryEntry({ id: `ocr-${Date.now()}`, timestamp: Date.now(), originalText: selectedFile.value.name, processedText: result.text, processorsUsed: [`ocr:tencent:${result.model}`], source: 'manual', metadata: { processingTime: result.duration } });
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : String(error); }
  finally { loading.value = false; }
}
async function copyResult() { await navigator.clipboard.writeText(resultText.value); message.success('识别文字已复制'); }
onUnmounted(() => { if (previewUrl.value) URL.revokeObjectURL(previewUrl.value); });
</script>

<style scoped>
.ocr-page { display: flex; flex-direction: column; gap: 16px; max-width: 1480px; margin: 0 auto; }
.title { font-size: 18px; }
.workbench-column { min-width: 0; }
.workbench-column :deep(.n-card) { display: flex; flex-direction: column; height: clamp(500px, calc(100vh - 280px), 600px); overflow: hidden; }
.workbench-column:first-child :deep(.n-card-content) { display: flex; flex: 1; flex-direction: column; min-height: 0; }
.drop-zone { position: relative; display: flex; flex: 1; align-items: center; justify-content: center; min-height: 360px; border: 1px dashed var(--ctp-border-strong); border-radius: 8px; overflow: hidden; background: var(--ctp-surface-soft); }
.drop-zone img { width: 100%; max-height: 520px; object-fit: contain; }
.file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.result-spin { display: flex; justify-content: center; padding: 80px 0; }
.ocr-result :deep(.n-card-content) { display: flex; flex: 1; flex-direction: column; min-height: 0; overflow: hidden; }
.ocr-result-empty { display: grid; flex: 1; min-height: 0; place-items: center; padding: 40px; text-align: center; border: 1px dashed var(--ctp-border-strong); border-radius: 8px; background: var(--ctp-surface-clean); }
.ocr-result-empty h2 { margin: 0 0 8px; font-size: 18px; }
.ocr-result-empty p { margin: 0; color: var(--ctp-text-muted); line-height: 1.7; }
.ocr-result-content { display: flex; flex: 1; flex-direction: column; gap: 16px; min-height: 0; }
.ocr-result-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.ocr-result-input { flex: 1; min-height: 0; }
.ocr-result-input :deep(.n-input-wrapper),
.ocr-result-input :deep(.n-input__textarea),
.ocr-result-input :deep(.n-input__textarea-el) { height: 100%; min-height: 0; }
.ocr-result-input :deep(.n-input__textarea-el) { overflow-y: auto; resize: none; }
</style>
