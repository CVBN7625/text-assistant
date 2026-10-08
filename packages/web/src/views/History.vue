<template>
  <div class="history ctp-page">
    <PageHeader
      title="历史记录"
    >
      <template #actions>
        <n-space>
          <n-input
            v-model:value="searchQuery"
            placeholder="搜索历史记录..."
            clearable
            style="width: 200px;"
          >
            <template #prefix>
              <Search :size="15" />
            </template>
          </n-input>
          <n-button @click="clearAllHistory" type="error" quaternary :disabled="history.length === 0">
            <template #icon><Trash2 :size="16" /></template>
            清空历史
          </n-button>
        </n-space>
      </template>
    </PageHeader>

    <!-- 历史记录列表 -->
    <n-card class="history-list-card ctp-ledger">
      <n-list v-if="filteredHistory.length > 0" bordered>
        <n-list-item
          v-for="entry in filteredHistory"
          :key="entry.id"
          @click="copyToClipboard(entry.processedText)"
        >
          <n-thing>
            <template #header>
              <n-space align="center" justify="space-between">
                <n-text strong class="ctp-user-content" style="max-width: 70%;">
                  {{ truncateText(entry.originalText, 60) }}
                </n-text>
                <n-text depth="3" class="ctp-functional-text" style="font-size: 12px;">
                  {{ formatTime(entry.timestamp) }}
                </n-text>
              </n-space>
            </template>

            <template #description>
              <n-space vertical>
                <n-text depth="2" class="ctp-user-content" style="font-size: 13px; line-height: 1.5;">
                  {{ truncateText(entry.processedText, 120) }}
                </n-text>
                <n-space size="small">
                  <n-tag size="small" type="info">
                    处理器: {{ entry.processorsUsed?.length || 0 }}个
                  </n-tag>
                  <n-tag size="small" type="success">
                    {{ entry.originalText.length }} 字 → {{ entry.processedText.length }} 字
                  </n-tag>
                </n-space>
              </n-space>
            </template>

            <template #footer>
              <n-space justify="end">
                <n-button size="small" quaternary @click.stop="copyToClipboard(entry.processedText)">
                  <template #icon><Copy :size="15" /></template>
                  复制
                </n-button>
                <n-button size="small" quaternary type="primary" @click.stop="reuseEntry(entry)">
                  <template #icon><RotateCcw :size="15" /></template>
                  重用
                </n-button>
                <n-button size="small" quaternary type="error" @click.stop="deleteEntry(entry)">
                  <template #icon><Trash2 :size="15" /></template>
                  删除
                </n-button>
              </n-space>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>

      <!-- 空状态 -->
      <IllustratedEmptyState
        v-else
        variant="history"
        title="还没有历史记录"
        description="处理文本后，记录会自动保存在这里，方便再次复制或复用。"
      />
    </n-card>

    <!-- 统计信息 -->
    <n-card v-if="history.length > 0" size="small" class="stats-card ctp-receipt">
      <n-space justify="center">
        <n-tag type="info" size="medium">
          总记录: {{ history.length }} 条
        </n-tag>
        <n-tag type="success" size="medium">
          已筛选: {{ filteredHistory.length }} 条
        </n-tag>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  NCard,
  NList,
  NListItem,
  NThing,
  NText,
  NSpace,
  NButton,
  NEmpty,
  NInput,
  NTag,
} from 'naive-ui';
import { HistoryEntry } from '@clipboard-processor/core';
import { Copy, RotateCcw, Search, Trash2 } from 'lucide-vue-next';
import IllustratedEmptyState from '../components/IllustratedEmptyState.vue';
import PageHeader from '../components/PageHeader.vue';
import {
  clearHistory,
  deleteHistoryEntry,
  loadHistory as loadStoredHistory
} from '../services/history-service';

const router = useRouter();
const history = ref<HistoryEntry[]>([]);
const searchQuery = ref('');

onMounted(() => {
  loadHistory();
});

// 过滤后的历史记录
const filteredHistory = computed(() => {
  if (!searchQuery.value.trim()) {
    return history.value;
  }

  const query = searchQuery.value.toLowerCase();
  return history.value.filter(
    entry =>
      entry.originalText.toLowerCase().includes(query) ||
      entry.processedText.toLowerCase().includes(query)
  );
});

function loadHistory() {
  history.value = loadStoredHistory();
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // 小于1分钟
  if (diff < 60000) {
    return '刚刚';
  }
  // 小于1小时
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`;
  }
  // 小于24小时
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`;
  }
  // 超过24小时
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('复制失败:', err);
  }
}

function reuseEntry(entry: HistoryEntry) {
  router.push({
    path: '/processor',
    query: { text: entry.originalText },
  });
}

function deleteEntry(entry: HistoryEntry) {
  history.value = deleteHistoryEntry(entry.id);
}

function clearAllHistory() {
  if (confirm('确定要清空所有历史记录吗？')) {
    clearHistory();
    history.value = [];
  }
}
</script>

<style scoped>
.history {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-list-card {
  background: var(--ctp-surface-clean, #fffdfa);
}

.stats-card {
  background: transparent;
  border-color: var(--ctp-border, #ddd5c6);
}

:deep(.n-list-item) {
  padding: 16px;
  transition: background-color 0.2s ease;
  cursor: pointer;
}

:deep(.n-list-item:hover) {
  background-color: var(--ctp-surface-soft, #f2eee5);
}

:deep(.n-thing-header) {
  margin-bottom: 8px !important;
}

:deep(.n-thing-description) {
  margin-top: 8px;
}

:deep(.n-thing-footer) {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--ctp-border, #ddd5c6);
}

:deep(.n-tag) {
  font-weight: 500;
}

.n-button:not(.n-button--disabled):hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease;
}

:deep(.n-input) {
  border-radius: 6px;
}

:deep(.n-input:hover) {
  border-color: var(--ctp-border-strong, #cfc4b1);
}

:deep(.n-input--focus) {
  border-color: var(--ctp-secondary, #66724a);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ctp-secondary, #66724a) 20%, transparent);
}
</style>
