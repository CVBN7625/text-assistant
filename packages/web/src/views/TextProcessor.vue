<template>
  <div class="text-processor ctp-page">
    <PageHeader title="文本处理器" />

    <n-card size="small" class="toolbar-card">
      <n-space justify="space-between" align="center">
        <n-space>
          <n-button @click="pasteFromClipboard" quaternary>
            从剪贴板粘贴
          </n-button>
          <n-button @click="clearInput" quaternary type="error">
            清空
          </n-button>
          <n-button @click="copyOutput" quaternary type="success" :disabled="!outputText">
            复制结果
          </n-button>
          <n-button @click="replaceInput" quaternary :disabled="!outputText">
            替换输入
          </n-button>
        </n-space>

        <n-space align="center">
          <n-space align="center" class="auto-process-switch">
            <n-text depth="3" class="switch-label">自动处理</n-text>
            <n-switch
              v-model:value="autoProcessEnabled"
              @update:value="onAutoProcessToggle"
            >
              <template #checked>
                <span class="switch-state">开启</span>
              </template>
              <template #unchecked>
                <span class="switch-state">关闭</span>
              </template>
            </n-switch>
          </n-space>

          <n-button
            type="primary"
            @click="processText"
            :disabled="!inputText.trim()"
            strong
            size="large"
          >
            处理文本
          </n-button>
        </n-space>
      </n-space>
    </n-card>

    <n-grid :cols="2" :x-gap="16" class="main-content ctp-workbench" responsive="screen">
      <n-gi>
        <n-card title="输入文本" size="small" class="input-card ctp-work-sheet">
          <n-input
            v-model:value="inputText"
            type="textarea"
            placeholder="在这里输入或粘贴要处理的文字..."
            :rows="22"
            :style="{ fontSize: '14px', lineHeight: '1.6' }"
          />
        </n-card>
      </n-gi>

      <n-gi>
        <n-card title="处理结果" size="small" class="output-card ctp-work-sheet ctp-work-sheet--result">
          <n-input
            v-model:value="outputText"
            type="textarea"
            placeholder="处理结果将在这里显示..."
            :rows="22"
            readonly
            :style="{ fontSize: '14px', lineHeight: '1.6' }"
          />
        </n-card>
      </n-gi>
    </n-grid>

    <n-card title="处理配置" size="small" class="processors-card ctp-field-note">
      <n-collapse :default-expanded-names="['processors', 'custom-rules']">
        <n-collapse-item title="内置处理器" name="processors">
          <n-grid :cols="3" :x-gap="16" :y-gap="16" responsive="screen">
            <n-gi v-for="category in processorCategories" :key="category.id">
              <div class="config-panel">
                <n-text strong>{{ category.name }}</n-text>
                <n-space vertical class="panel-options">
                  <template v-for="processor in category.processors" :key="processor.id">
                    <n-tooltip v-if="isInExclusiveGroup(processor.id)" trigger="hover">
                      <template #trigger>
                        <n-checkbox
                          v-model:checked="processor.isActive"
                          @update:checked="onProcessorToggle(processor)"
                        >
                          <n-text>{{ processor.name }}</n-text>
                        </n-checkbox>
                      </template>
                      此选项与「{{ getExclusivePartnerName(processor.id) }}」互斥
                    </n-tooltip>

                    <n-checkbox
                      v-else
                      v-model:checked="processor.isActive"
                      @update:checked="onProcessorToggle(processor)"
                    >
                      <n-text>{{ processor.name }}</n-text>
                    </n-checkbox>
                  </template>
                </n-space>
              </div>
            </n-gi>
          </n-grid>
        </n-collapse-item>

        <n-collapse-item title="自定义规则" name="custom-rules">
          <n-space vertical :size="12">
            <n-space justify="space-between" align="center">
              <n-text depth="3" class="small-text">
                只有同时满足“规则已启用”和“本页已勾选”的规则才会参与处理。
              </n-text>
              <n-space size="small">
                <n-button size="small" @click="selectAllActiveCustomRules" :disabled="activeCustomRules.length === 0">
                  全选启用规则
                </n-button>
                <n-button size="small" @click="clearSelectedCustomRules" :disabled="selectedCustomRuleIds.length === 0">
                  清空选择
                </n-button>
                <n-button size="small" @click="openCustomRulesPage">
                  管理规则
                </n-button>
              </n-space>
            </n-space>

            <n-alert type="info" class="rule-order-alert ctp-margin-note">
              冲突处理：处理前规则先执行，内置处理器居中，处理后规则最后执行。同一阶段按优先级数字从小到大执行。
            </n-alert>

            <n-empty v-if="customRules.length === 0" description="还没有自定义规则">
              <template #extra>
                <n-button type="primary" @click="openCustomRulesPage">去创建规则</n-button>
              </template>
            </n-empty>

            <n-grid v-else :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
              <n-gi v-for="group in customRuleGroups" :key="group.stage">
                <div class="config-panel rule-panel">
                  <n-space justify="space-between" align="center">
                    <n-space vertical :size="2">
                      <n-text strong>{{ group.title }}</n-text>
                      <n-text depth="3" class="small-text">{{ group.description }}</n-text>
                    </n-space>
                    <n-tag>{{ group.rules.length }}</n-tag>
                  </n-space>

                  <n-empty v-if="group.rules.length === 0" description="本阶段暂无规则" class="nested-empty" />

                  <n-list v-else class="rule-list">
                    <n-list-item v-for="rule in group.rules" :key="rule.id" class="rule-list-item">
                      <n-space vertical :size="6">
                        <n-checkbox
                          :checked="isCustomRuleSelected(rule.id)"
                          :disabled="!rule.isActive"
                          @update:checked="checked => toggleCustomRule(rule.id, checked)"
                        >
                          <n-space align="center" size="small">
                            <n-text class="ctp-user-content">{{ rule.name }}</n-text>
                            <n-tag size="small" :type="rule.isActive ? 'success' : 'default'">
                              {{ rule.isActive ? '启用' : '停用' }}
                            </n-tag>
                          </n-space>
                        </n-checkbox>
                        <n-space size="small" class="rule-meta">
                          <n-tag size="small" type="info">{{ getRuleTypeLabel(rule.type) }}</n-tag>
                          <n-tag size="small">优先级 {{ rule.priority ?? 100 }}</n-tag>
                          <n-text depth="3" class="rule-pattern ctp-technical-text">{{ rule.pattern }}</n-text>
                        </n-space>
                      </n-space>
                    </n-list-item>
                  </n-list>
                </div>
              </n-gi>
            </n-grid>
          </n-space>
        </n-collapse-item>
      </n-collapse>
    </n-card>

    <n-card v-if="processingStats" size="small" class="stats-card ctp-receipt">
      <n-space justify="center">
        <n-tag type="info" size="medium">
          处理时间: {{ processingStats.time }}ms
        </n-tag>
        <n-tag type="success" size="medium">
          内置处理器: {{ processingStats.processorsUsed }} 个
        </n-tag>
        <n-tag type="warning" size="medium">
          自定义规则命中: {{ processingStats.customRulesUsed }} 条
        </n-tag>
        <n-tag type="default" size="medium">
          前置 {{ processingStats.beforeRulesUsed }} / 后置 {{ processingStats.afterRulesUsed }}
        </n-tag>
      </n-space>
    </n-card>

    <div v-if="showToast" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NAlert,
  NButton,
  NCard,
  NCollapse,
  NCollapseItem,
  NCheckbox,
  NEmpty,
  NGi,
  NGrid,
  NInput,
  NList,
  NListItem,
  NSpace,
  NSwitch,
  NTag,
  NText,
  NTooltip,
} from 'naive-ui';
import type { CustomRule, CustomRuleExecutionStage, TextProcessor } from '@clipboard-processor/core';
import {
  TextProcessorCore,
  allProcessors as rawAllProcessors
} from '@clipboard-processor/core';
import {
  applyCustomRules,
  getRuleStageLabel,
  getRuleTypeLabel,
  loadCustomRules
} from '../services/custom-rules-service';
import { addHistoryEntry } from '../services/history-service';
import PageHeader from '../components/PageHeader.vue';

type ProcessingStats = {
  time: number;
  processorsUsed: number;
  customRulesUsed: number;
  beforeRulesUsed: number;
  afterRulesUsed: number;
};

type ProcessorViewModel = TextProcessor & { isActive: boolean };

const SELECTED_CUSTOM_RULES_KEY = 'clipboard-text-processor-selected-custom-rules-v1';
const AUTO_PROCESS_DELAY = 2000;

const router = useRouter();
const route = useRoute();
const inputText = ref('');
const outputText = ref('');
const processingStats = ref<ProcessingStats | null>(null);
const customRules = ref<CustomRule[]>([]);
const selectedCustomRuleIds = ref<string[]>([]);
const hasLoadedRuleSelection = ref(false);

const autoProcessEnabled = ref(true);
const autoProcessTimer = ref<number | null>(null);

const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'error' | 'info'>('success');
let toastTimer: number | null = null;

const processorCore = new TextProcessorCore();
const allProcessors = reactive<ProcessorViewModel[]>(rawAllProcessors.map(p => ({ ...p })));

allProcessors.forEach(processor => {
  processorCore.registerProcessor(processor);
});

const exclusiveGroups: Record<string, string[]> = {
  newlineProcessing: ['delete-duplicate-newlines', 'delete-all-newlines'],
  spaceProcessing: ['remove-spaces-between-chinese', 'keep-english-word-spaces', 'delete-duplicate-spaces']
};

const processorCategories = computed(() => {
  const categories = [
    { id: 'cleanup', name: '清理类', processors: [] as ProcessorViewModel[] },
    { id: 'conversion', name: '转换类', processors: [] as ProcessorViewModel[] },
    { id: 'enhancement', name: '增强类', processors: [] as ProcessorViewModel[] },
  ];

  allProcessors.forEach(processor => {
    const category = categories.find(c => c.id === processor.category);
    if (category) {
      category.processors.push(processor);
    }
  });

  return categories;
});

const activeCustomRules = computed(() => customRules.value.filter(rule => rule.isActive));
const customRuleGroups = computed(() => {
  const groups: Array<{
    stage: CustomRuleExecutionStage;
    title: string;
    description: string;
    rules: CustomRule[];
  }> = [
    {
      stage: 'before-processors',
      title: getRuleStageLabel('before-processors'),
      description: '适合输入清理、删除噪声、统一复制格式。',
      rules: []
    },
    {
      stage: 'after-processors',
      title: getRuleStageLabel('after-processors'),
      description: '适合最终替换、补充格式、处理内置处理器后的结果。',
      rules: []
    }
  ];

  const sortedRules = [...customRules.value].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  for (const rule of sortedRules) {
    const target = groups.find(group => group.stage === (rule.stage || 'before-processors'));
    target?.rules.push(rule);
  }

  return groups;
});

watch(inputText, (newValue, oldValue) => {
  if (!autoProcessEnabled.value) {
    return;
  }

  if (!newValue.trim()) {
    outputText.value = '';
    processingStats.value = null;
    clearAutoProcessTimer();
    return;
  }

  if (newValue === oldValue) {
    return;
  }

  scheduleAutoProcess();
});

watch(selectedCustomRuleIds, () => {
  if (!hasLoadedRuleSelection.value) {
    return;
  }

  localStorage.setItem(SELECTED_CUSTOM_RULES_KEY, JSON.stringify(selectedCustomRuleIds.value));
  scheduleAutoProcessIfReady();
}, { deep: true });

onMounted(() => {
  const reusedText = route.query.text;
  if (typeof reusedText === 'string') {
    inputText.value = reusedText;
  }

  reloadCustomRules();
  window.addEventListener('focus', reloadCustomRules);
});

onBeforeUnmount(() => {
  clearAutoProcessTimer();
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  window.removeEventListener('focus', reloadCustomRules);
});

async function pasteFromClipboard() {
  try {
    inputText.value = await navigator.clipboard.readText();
  } catch (err) {
    console.error('读取剪贴板失败:', err);
    showToastMessage('读取剪贴板失败', 'error');
  }
}

function clearInput() {
  inputText.value = '';
  outputText.value = '';
  processingStats.value = null;
  clearAutoProcessTimer();
}

function processText() {
  if (!inputText.value.trim()) {
    return;
  }

  runProcessingPipeline();
}

function runProcessingPipeline() {
  const startTime = performance.now();
  const beforeRuleResult = applyCustomRules(inputText.value, customRules.value, {
    stage: 'before-processors',
    ruleIds: selectedCustomRuleIds.value
  });
  const processorResult = processorCore.process(beforeRuleResult.text);
  const afterRuleResult = applyCustomRules(processorResult.text, customRules.value, {
    stage: 'after-processors',
    ruleIds: selectedCustomRuleIds.value
  });
  const endTime = performance.now();

  outputText.value = afterRuleResult.text;
  processingStats.value = {
    time: Math.round(endTime - startTime),
    processorsUsed: processorResult.processorsUsed.length,
    customRulesUsed: beforeRuleResult.matches.length + afterRuleResult.matches.length,
    beforeRulesUsed: beforeRuleResult.matches.length,
    afterRulesUsed: afterRuleResult.matches.length,
  };

  addHistoryEntry({
    id: createHistoryId(),
    timestamp: Date.now(),
    originalText: inputText.value,
    processedText: afterRuleResult.text,
    processorsUsed: [
      ...processorResult.processorsUsed,
      ...beforeRuleResult.matches.map(match => `custom-rule:${match.ruleId}`),
      ...afterRuleResult.matches.map(match => `custom-rule:${match.ruleId}`)
    ],
    source: 'manual',
    metadata: {
      processingTime: endTime - startTime
    }
  });

  return {
    text: afterRuleResult.text,
    processorsUsed: processorResult.processorsUsed,
    customRuleMatches: [...beforeRuleResult.matches, ...afterRuleResult.matches]
  };
}

function createHistoryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function copyOutput() {
  try {
    await navigator.clipboard.writeText(outputText.value);
    showToastMessage('已复制到剪贴板', 'success');
  } catch (err) {
    console.error('复制失败:', err);
    showToastMessage('复制失败', 'error');
  }
}

function replaceInput() {
  inputText.value = outputText.value;
  outputText.value = '';
  processingStats.value = null;
}

async function processAndCopy() {
  if (!inputText.value.trim()) {
    return;
  }

  try {
    runProcessingPipeline();
    await navigator.clipboard.writeText(outputText.value);
    showToastMessage('已处理并复制到剪贴板', 'success');
  } catch (err) {
    console.error('自动处理失败:', err);
    showToastMessage('处理失败', 'error');
  }
}

function scheduleAutoProcess() {
  clearAutoProcessTimer();
  autoProcessTimer.value = window.setTimeout(() => {
    autoProcessTimer.value = null;
    processAndCopy();
  }, AUTO_PROCESS_DELAY);
}

function scheduleAutoProcessIfReady() {
  if (autoProcessEnabled.value && inputText.value.trim()) {
    scheduleAutoProcess();
  }
}

function clearAutoProcessTimer() {
  if (autoProcessTimer.value) {
    clearTimeout(autoProcessTimer.value);
    autoProcessTimer.value = null;
  }
}

function showToastMessage(message: string, type: 'success' | 'error' | 'info') {
  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;

  toastTimer = window.setTimeout(() => {
    showToast.value = false;
  }, 2000);
}

function onAutoProcessToggle(enabled: boolean) {
  if (enabled) {
    showToastMessage('已启用自动处理', 'info');
    scheduleAutoProcessIfReady();
  } else {
    showToastMessage('已关闭自动处理', 'info');
    clearAutoProcessTimer();
  }
}

function onProcessorToggle(processor: ProcessorViewModel) {
  for (const processorIds of Object.values(exclusiveGroups)) {
    if (processorIds.includes(processor.id) && processor.isActive) {
      allProcessors.forEach(candidate => {
        if (processorIds.includes(candidate.id) && candidate.id !== processor.id) {
          candidate.isActive = false;
          const coreProcessor = processorCore.getProcessor(candidate.id);
          if (coreProcessor) {
            coreProcessor.isActive = false;
          }
        }
      });
    }
  }

  const coreProcessor = processorCore.getProcessor(processor.id);
  if (coreProcessor) {
    coreProcessor.isActive = processor.isActive;
  }

  scheduleAutoProcessIfReady();
}

function isInExclusiveGroup(processorId: string): boolean {
  return Object.values(exclusiveGroups).some(group => group.includes(processorId));
}

function getExclusivePartnerName(processorId: string): string {
  for (const processorIds of Object.values(exclusiveGroups)) {
    if (processorIds.includes(processorId)) {
      const partnerId = processorIds.find(id => id !== processorId);
      if (partnerId) {
        const partner = allProcessors.find(p => p.id === partnerId);
        return partner ? partner.name : '';
      }
    }
  }
  return '';
}

function reloadCustomRules() {
  const nextRules = loadCustomRules();
  customRules.value = nextRules;

  const validRuleIds = new Set(nextRules.map(rule => rule.id));
  const storedRuleIds = loadSelectedRuleIds();
  const initialSelection = storedRuleIds ?? nextRules.filter(rule => rule.isActive).map(rule => rule.id);
  selectedCustomRuleIds.value = initialSelection.filter(ruleId => validRuleIds.has(ruleId));
  hasLoadedRuleSelection.value = true;
}

function loadSelectedRuleIds(): string[] | null {
  const raw = localStorage.getItem(SELECTED_CUSTOM_RULES_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : null;
  } catch {
    return null;
  }
}

function isCustomRuleSelected(ruleId: string): boolean {
  return selectedCustomRuleIds.value.includes(ruleId);
}

function toggleCustomRule(ruleId: string, checked: boolean) {
  if (checked) {
    if (!selectedCustomRuleIds.value.includes(ruleId)) {
      selectedCustomRuleIds.value = [...selectedCustomRuleIds.value, ruleId];
    }
    return;
  }

  selectedCustomRuleIds.value = selectedCustomRuleIds.value.filter(id => id !== ruleId);
}

function selectAllActiveCustomRules() {
  selectedCustomRuleIds.value = activeCustomRules.value.map(rule => rule.id);
}

function clearSelectedCustomRules() {
  selectedCustomRuleIds.value = [];
}

function openCustomRulesPage() {
  router.push('/custom-rules');
}
</script>

<style scoped>
.text-processor {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
}

.toolbar-card {
  background: var(--ctp-surface, #fffdfa);
  border: 1px solid var(--ctp-border, #ddd5c6);
}

.toolbar-card :deep(.n-card__content) {
  padding: 12px 18px;
}

.auto-process-switch {
  padding: 4px 8px;
  background: rgba(255, 253, 247, 0.66);
  border-radius: 6px;
  border: 1px solid var(--ctp-border, #ddd5c6);
}

.switch-label,
.small-text {
  font-size: 13px;
}

.switch-state {
  font-size: 11px;
}

.input-card,
.output-card {
  height: 100%;
}

.input-card :deep(.n-card-header) {
  border-bottom: 1px solid var(--ctp-border, #ddd5c6);
  box-shadow: inset 0 -2px 0 rgba(154, 116, 71, 0.22);
  padding-bottom: 12px;
}

.output-card :deep(.n-card-header) {
  border-bottom: 1px solid var(--ctp-border, #ddd5c6);
  box-shadow: inset 0 -2px 0 rgba(102, 114, 74, 0.24);
  padding-bottom: 12px;
}

.processors-card {
  background: var(--ctp-surface, #fffdfa);
}

.config-panel {
  min-height: 100%;
  padding: 14px;
  border: 1px solid var(--ctp-border, #ddd5c6);
  border-radius: 8px;
  background: rgba(255, 253, 247, 0.72);
}

.panel-options {
  margin-top: 10px;
}

.rule-order-alert {
  border-radius: 8px;
}

.rule-panel {
  background: var(--ctp-surface, #fffdfa);
}

.rule-list {
  margin-top: 10px;
}

.rule-list-item {
  padding: 10px 0;
}

.rule-meta {
  padding-left: 24px;
}

.rule-pattern {
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
}

.nested-empty {
  padding: 24px 0 8px;
}

.stats-card {
  background: var(--ctp-surface-soft, #f2eee5);
  border: 1px solid var(--ctp-border, #ddd5c6);
}

:deep(.n-input) {
  border-radius: 8px;
  transition: all 0.2s ease;
}

:deep(.n-input:hover) {
  border-color: var(--ctp-border-strong, #cfc4b1);
}

:deep(.n-input--focus) {
  border-color: var(--ctp-secondary, #66724a);
  box-shadow: 0 0 0 2px rgba(102, 114, 74, 0.16);
}

:deep(.n-card-header__main) {
  font-weight: 600;
  color: var(--ctp-text, #25231f);
}

:deep(.n-checkbox) {
  margin-bottom: 6px;
}

:deep(.n-checkbox:hover .n-checkbox__label) {
  color: var(--ctp-secondary, #66724a);
}

.n-button:not(.n-button--disabled):hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease;
}

.n-tag {
  font-weight: 500;
}

.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  animation: slideIn 0.3s ease, fadeOut 0.3s ease 1.7s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast.success {
  background: var(--ctp-success, #66724a);
  color: white;
}

.toast.error {
  background: var(--ctp-error, #b24b41);
  color: white;
}

.toast.info {
  background: var(--ctp-secondary, #66724a);
  color: white;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
</style>
