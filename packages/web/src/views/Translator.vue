<template>
  <div class="translator-page ctp-page">
    <PageHeader
      title="文本翻译"
    >
      <template #meta>
        <n-tag v-if="lastResultFromCache" size="small" type="success">缓存命中</n-tag>
        <n-tag v-else size="small">{{ statusMessage }}</n-tag>
      </template>
    </PageHeader>

    <!-- 语言选择栏 -->
    <n-card size="small" class="language-bar ctp-field-note">
      <n-space align="center" justify="space-between">
        <n-select
          v-model:value="sourceLang"
          :options="sourceLanguageOptions"
          style="width: 150px"
        />
        <n-button quaternary @click="swapLanguages" title="交换语言">
          ⇄
        </n-button>
        <n-select
          v-model:value="targetLang"
          :options="targetLanguageOptions"
          style="width: 150px"
        />
      </n-space>
    </n-card>

    <!-- 输入/输出区域 -->
    <n-grid :cols="2" :x-gap="16" class="ctp-workbench">
      <n-gi>
        <n-card title="输入文本" size="small" class="editor-card input-card ctp-work-sheet">
          <n-input
            v-model:value="inputText"
            type="textarea"
            :rows="18"
            placeholder="请输入要翻译的文本..."
          />
          <template #footer>
            <n-space justify="space-between">
              <n-text depth="3">字数: {{ inputText.length }}</n-text>
              <n-space>
                <n-button size="small" @click="pasteFromClipboard">粘贴</n-button>
                <n-button size="small" @click="clearInput">清空</n-button>
              </n-space>
            </n-space>
          </template>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card title="翻译结果" size="small" class="editor-card output-card ctp-work-sheet ctp-work-sheet--result">
          <n-input
            v-model:value="outputText"
            type="textarea"
            :rows="18"
            readonly
            placeholder="翻译结果将显示在这里..."
          />
          <template #footer>
            <n-space justify="space-between">
              <n-text depth="3">字数: {{ outputText.length }}</n-text>
              <n-button size="small" @click="handleCopyResult">复制</n-button>
            </n-space>
          </template>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 状态栏 -->
    <n-card size="small" class="status-card ctp-receipt">
      <n-space align="center" justify="space-between">
        <n-space align="center">
          <n-spin v-if="isTranslating" :size="18" />
          <n-alert
            v-if="errorMsg"
            :type="errorMsg.includes('进度') ? 'info' : 'error'"
            size="small"
            closable
            @close="errorMsg = ''"
          >
            {{ errorMsg }}
          </n-alert>
          <n-text v-else depth="3">
            {{ statusMessage }}
          </n-text>
          <n-tag v-if="lastResultFromCache" size="small" type="success">
            缓存命中
          </n-tag>
        </n-space>

        <n-space align="center">
          <n-space align="center">
            <n-text>自动翻译</n-text>
            <n-switch
              v-model:value="config.autoTranslate"
              @update:value="saveAutoTranslateSetting"
            />
          </n-space>

          <n-button
            type="primary"
            :loading="isTranslating"
            :disabled="!canTranslate"
            @click="translateText"
          >
            翻译 (Ctrl+Enter)
          </n-button>
        </n-space>
      </n-space>
    </n-card>

    <!-- 翻译历史记录 -->
    <n-card
      v-if="history.length > 0"
      title="翻译历史"
      size="small"
      class="history-card ctp-ledger"
    >
      <n-collapse>
        <n-collapse-item
          v-for="item in history"
          :key="item.id"
          :title="`${item.sourceText.slice(0, 50)}...`"
          :name="item.id"
        >
          <template #header-extra>
            <n-text depth="3" class="ctp-functional-text" style="font-size: 12px;">
              {{ formatTime(item.timestamp) }}
            </n-text>
          </template>

          <n-grid :cols="2" :x-gap="16">
            <n-gi>
              <n-text strong>原文：</n-text>
              <n-text class="ctp-user-content">{{ item.sourceText }}</n-text>
            </n-gi>
            <n-gi>
              <n-text strong>译文：</n-text>
              <n-text class="history-result-text ctp-user-content" @click="handleCopyHistoryResult(item.translatedText)">
                {{ item.translatedText }}
              </n-text>
            </n-gi>
          </n-grid>

          <n-space style="margin-top: 8px;">
            <n-button size="small" @click="handleCopyHistoryResult(item.translatedText)">
              复制译文
            </n-button>
            <n-button size="small" @click="reuseHistory(item)">
              重用
            </n-button>
            <n-button size="small" @click="deleteHistory(item.id)">
              删除
            </n-button>
          </n-space>
        </n-collapse-item>
      </n-collapse>

      <template #footer>
        <n-button size="small" @click="clearHistory">
          清空历史记录
        </n-button>
      </template>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import {
  NAlert,
  NButton,
  NCard,
  NCollapse,
  NCollapseItem,
  NGi,
  NGrid,
  NInput,
  NSelect,
  NSpace,
  NSpin,
  NSwitch,
  NTag,
  NText,
  useMessage
} from 'naive-ui';
import { useTranslator } from '../composables/useTranslator';
import { LANGUAGES } from '../services/translation-service';
import PageHeader from '../components/PageHeader.vue';

const message = useMessage();

// 使用翻译Composable
const {
  inputText,
  outputText,
  sourceLang,
  targetLang,
  isTranslating,
  errorMsg,
  lastResultFromCache,
  config,
  history,
  statusMessage,
  canTranslate,
  translateText,
  swapLanguages,
  clearInput,
  pasteFromClipboard,
  copyResult,
  reuseHistory,
  deleteHistory,
  clearHistory,
  formatTime,
  saveAutoTranslateSetting
} = useTranslator();

// 源语言选项
const sourceLanguageOptions = computed(() =>
  LANGUAGES.map(lang => ({
    label: lang.label,
    value: lang.code
  }))
);

// 目标语言选项（排除auto）
const targetLanguageOptions = computed(() =>
  LANGUAGES.filter(lang => lang.code !== 'auto').map(lang => ({
    label: lang.label,
    value: lang.code
  }))
);

// 复制结果并显示提示
const handleCopyResult = async () => {
  const success = await copyResult();
  if (success) {
    message.success('已复制到剪贴板');
  }
};

const handleCopyHistoryResult = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  } catch (error) {
    console.error('复制历史结果失败:', error);
    message.error('复制失败');
  }
};

// 监听Ctrl+Enter快捷键
const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    if (canTranslate.value) {
      translateText();
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.translator-page {
  max-width: 1480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.language-bar {
  background: var(--ctp-surface, #fffdfa);
}

.language-bar :deep(.n-card__content) {
  padding: 12px 20px;
}

.editor-card {
  height: 100%;
}

.editor-card :deep(.n-card-header) {
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--ctp-border, #ddd5c6);
  background: transparent;
}

.input-card :deep(.n-card-header) {
  box-shadow: inset 0 -2px 0 rgba(154, 116, 71, 0.24);
}

.output-card :deep(.n-card-header) {
  box-shadow: inset 0 -2px 0 rgba(102, 114, 74, 0.26);
}

.status-card,
.history-card {
  margin-top: 0;
}

:deep(.n-card) {
  border-radius: 8px;
  border: 1px solid var(--ctp-border, #ddd5c6);
}

:deep(.n-input--textarea) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

:deep(.n-input--textarea .n-input-wrapper) {
  background: rgba(255, 253, 247, 0.76);
}

.history-result-text {
  cursor: pointer;
}

.history-result-text:hover {
  color: var(--ctp-secondary, #66724a);
}

:deep(.n-collapse-item__header) {
  font-size: 14px;
}

:deep(.n-collapse-item__content-wrapper) {
  padding: 12px;
}
</style>
