<template>
  <div class="custom-rules ctp-page">
    <PageHeader
      title="自定义规则"
    >
      <template #actions>
        <n-space>
          <n-button @click="exportRules">导出</n-button>
          <n-button @click="triggerImport">导入</n-button>
          <n-button type="primary" strong @click="openCreateDialog">添加规则</n-button>
        </n-space>
      </template>
    </PageHeader>

    <n-alert type="info" class="order-alert ctp-margin-note">
      执行顺序固定为：处理前规则 → 文本处理器内置处理器 → 处理后规则。同一阶段内，优先级数字越小越先执行；优先级相同则按创建时间执行。
    </n-alert>

    <n-grid :cols="3" :x-gap="16" :y-gap="16" responsive="screen" class="ctp-rules-workshop">
      <n-gi span="2">
        <n-card class="rules-card ctp-ledger">
          <template #header>
            <n-space justify="space-between" align="center">
              <n-text strong>规则列表</n-text>
              <n-space size="small">
                <n-tag type="info">总数 {{ rules.length }}</n-tag>
                <n-tag type="success">启用 {{ enabledRulesCount }}</n-tag>
                <n-tag type="warning">停用 {{ disabledRulesCount }}</n-tag>
              </n-space>
            </n-space>
          </template>

          <IllustratedEmptyState
            v-if="rules.length === 0"
            variant="technical"
            title="还没有自定义规则"
            description="创建第一条规则，将常用的清理与替换步骤保存成可复用配方。"
          >
            <template #action>
              <n-button type="primary" @click="openCreateDialog">创建第一条规则</n-button>
            </template>
          </IllustratedEmptyState>

          <n-list v-else bordered>
            <n-list-item v-for="rule in sortedRules" :key="rule.id">
              <n-thing>
                <template #header>
                  <n-space justify="space-between" align="center">
                    <n-space align="center">
                      <n-switch v-model:value="rule.isActive" @update:value="persistRules" />
                      <n-text strong class="ctp-user-content">{{ rule.name }}</n-text>
                      <n-tag size="small" :type="rule.isActive ? 'success' : 'default'">
                        {{ rule.isActive ? '启用' : '停用' }}
                      </n-tag>
                      <n-tag size="small" :type="getRuleStageTagType(rule.stage)">
                        {{ getRuleStageLabel(rule.stage) }}
                      </n-tag>
                    </n-space>
                    <n-space size="small">
                      <n-button size="small" @click="editRule(rule)">编辑</n-button>
                      <n-button size="small" @click="duplicateRule(rule)">复制</n-button>
                      <n-button size="small" type="error" @click="deleteRule(rule)">删除</n-button>
                    </n-space>
                  </n-space>
                </template>

                <template #description>
                  <n-space vertical :size="8">
                    <n-text depth="3" class="ctp-user-content">{{ rule.description || '无描述' }}</n-text>
                    <n-space size="small">
                      <n-tag size="small" type="info">{{ getRuleTypeLabel(rule.type) }}</n-tag>
                      <n-tag size="small">优先级 {{ rule.priority ?? 100 }}</n-tag>
                      <n-tag size="small">flags: {{ rule.flags || 'g' }}</n-tag>
                    </n-space>
                    <div class="rule-code ctp-technical-text">
                      <span>{{ rule.pattern || '(空)' }}</span>
                      <span class="arrow">=></span>
                      <span>{{ rule.type === 'delete' ? '(删除)' : rule.replacement || '(空)' }}</span>
                    </div>
                  </n-space>
                </template>
              </n-thing>
            </n-list-item>
          </n-list>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card title="模板库" class="side-card ctp-field-note">
          <n-space vertical>
            <n-select
              v-model:value="selectedTemplateId"
              :options="templateOptions"
              placeholder="选择模板"
            />
            <n-text depth="3" class="template-description ctp-user-content">
              {{ selectedTemplate?.description || '从参考项目和常见文本处理场景整理的规则模板。' }}
            </n-text>
            <n-button type="primary" :disabled="!selectedTemplateId" @click="importTemplate">
              导入模板规则
            </n-button>
          </n-space>
        </n-card>

        <n-card title="即时测试" class="side-card ctp-field-note">
          <n-space vertical>
            <n-text depth="3" class="small-text">
              预览只执行当前页面启用的自定义规则，不包含文本处理器内置处理器。
            </n-text>
            <n-input
              v-model:value="testInput"
              type="textarea"
              :rows="7"
              placeholder="输入一段文本，查看启用规则处理后的结果"
            />
            <n-input
              :value="testResult.text"
              type="textarea"
              :rows="7"
              readonly
              placeholder="预览结果"
            />
            <n-space size="small" align="center">
              <n-tag
                v-for="match in testResult.matches"
                :key="`${match.stage}-${match.ruleId}`"
                size="small"
                type="success"
              >
                {{ match.ruleName }} x{{ match.count }}
              </n-tag>
              <n-text v-if="testResult.matches.length === 0" depth="3" class="small-text">暂无命中</n-text>
            </n-space>
          </n-space>
        </n-card>
      </n-gi>
    </n-grid>

    <n-modal
      v-model:show="dialogVisible"
      preset="card"
      :title="editingRuleId ? '编辑规则' : '添加规则'"
      class="rule-dialog"
      to=".ctp-app"
      :style="{ width: 'min(820px, 92vw)', maxHeight: '88vh', overflow: 'auto' }"
    >
      <n-form label-placement="top">
        <n-grid :cols="2" :x-gap="16">
          <n-gi>
            <n-form-item label="名称">
              <n-input v-model:value="draft.name" placeholder="例如：删除引用角标" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="类型">
              <n-select v-model:value="draft.type" :options="ruleTypeOptions" />
            </n-form-item>
          </n-gi>
        </n-grid>

        <n-grid :cols="3" :x-gap="16">
          <n-gi>
            <n-form-item label="执行阶段">
              <n-select v-model:value="draft.stage" :options="ruleStageOptions" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="优先级">
              <n-input-number v-model:value="draft.priority" :precision="0" :min="1" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="正则标志">
              <n-input v-model:value="draft.flags" placeholder="g / gi / gm" />
            </n-form-item>
          </n-gi>
        </n-grid>

        <n-form-item label="描述">
          <n-input v-model:value="draft.description" placeholder="说明这条规则的用途" />
        </n-form-item>

        <n-form-item :label="draft.type === 'text' ? '查找文本' : '匹配表达式'">
          <n-input v-model:value="draft.pattern" type="textarea" :rows="3" />
        </n-form-item>

        <n-form-item v-if="draft.type !== 'delete'" label="替换为">
          <n-input v-model:value="draft.replacement" type="textarea" :rows="3" />
        </n-form-item>

        <n-alert v-if="validationMessage" type="error" class="validation-alert">
          {{ validationMessage }}
        </n-alert>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="dialogVisible = false">取消</n-button>
          <n-button type="primary" @click="saveDraft">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <input
      ref="importInputRef"
      type="file"
      accept="application/json,.json"
      class="hidden-input"
      @change="handleImportFile"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import {
  NAlert,
  NButton,
  NCard,
  NEmpty,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NInput,
  NInputNumber,
  NList,
  NListItem,
  NModal,
  NSelect,
  NSpace,
  NSwitch,
  NTag,
  NText,
  NThing,
  useMessage
} from 'naive-ui';
import type { CustomRule, CustomRuleExecutionStage } from '@clipboard-processor/core';
import {
  RULE_TEMPLATES,
  applyCustomRules,
  createEmptyRule,
  createRulesFromTemplate,
  exportRulesJson,
  getRuleStageLabel,
  getRuleTypeLabel,
  loadCustomRules,
  parseRulesJson,
  saveCustomRules,
  validateCustomRule
} from '../services/custom-rules-service';
import IllustratedEmptyState from '../components/IllustratedEmptyState.vue';
import PageHeader from '../components/PageHeader.vue';

const message = useMessage();
const rules = ref<CustomRule[]>([]);
const dialogVisible = ref(false);
const editingRuleId = ref<string | null>(null);
const selectedTemplateId = ref<string | null>(null);
const testInput = ref('This paper shows a result [1, 2].  Visit https://example.com');
const importInputRef = ref<HTMLInputElement | null>(null);
const validationMessage = ref('');

const draft = reactive<CustomRule>(createEmptyRule());

const enabledRulesCount = computed(() => rules.value.filter(rule => rule.isActive).length);
const disabledRulesCount = computed(() => rules.value.length - enabledRulesCount.value);
const sortedRules = computed(() =>
  [...rules.value].sort((a, b) => {
    const stageDiff = getStageOrder(a.stage) - getStageOrder(b.stage);
    if (stageDiff !== 0) {
      return stageDiff;
    }
    return (a.priority ?? 100) - (b.priority ?? 100);
  })
);
const selectedTemplate = computed(() =>
  RULE_TEMPLATES.find(template => template.id === selectedTemplateId.value)
);
const testResult = computed(() => applyCustomRules(testInput.value, rules.value));

const ruleTypeOptions = [
  { label: '正则替换', value: 'regex' },
  { label: '文本替换', value: 'text' },
  { label: '删除匹配', value: 'delete' }
];

const ruleStageOptions = [
  { label: '处理前：先清理输入，再交给内置处理器', value: 'before-processors' },
  { label: '处理后：内置处理器完成后，再做最终修正', value: 'after-processors' }
];

const templateOptions = RULE_TEMPLATES.map(template => ({
  label: `${template.name} (${template.rules.length})`,
  value: template.id
}));

onMounted(() => {
  rules.value = loadCustomRules();
});

function persistRules() {
  saveCustomRules(rules.value);
}

function openCreateDialog() {
  Object.assign(draft, createEmptyRule());
  editingRuleId.value = null;
  validationMessage.value = '';
  dialogVisible.value = true;
}

function editRule(rule: CustomRule) {
  Object.assign(draft, { ...rule, stage: rule.stage || 'before-processors' });
  editingRuleId.value = rule.id;
  validationMessage.value = '';
  dialogVisible.value = true;
}

function saveDraft() {
  const normalizedDraft: CustomRule = {
    ...draft,
    stage: draft.stage || 'before-processors',
    replacement: draft.type === 'delete' ? '' : draft.replacement,
    updatedAt: Date.now()
  };
  const validation = validateCustomRule(normalizedDraft);

  if (!validation.valid) {
    validationMessage.value = validation.error || '规则无效';
    return;
  }

  if (editingRuleId.value) {
    const index = rules.value.findIndex(rule => rule.id === editingRuleId.value);
    if (index >= 0) {
      rules.value[index] = normalizedDraft;
    }
  } else {
    rules.value.push(normalizedDraft);
  }

  persistRules();
  dialogVisible.value = false;
  message.success('规则已保存');
}

function duplicateRule(rule: CustomRule) {
  const now = Date.now();
  rules.value.push({
    ...rule,
    id: `rule-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: `${rule.name} 副本`,
    createdAt: now,
    updatedAt: now
  });
  persistRules();
  message.success('已复制规则');
}

function deleteRule(rule: CustomRule) {
  if (!confirm(`确定删除规则「${rule.name}」吗？`)) {
    return;
  }

  rules.value = rules.value.filter(item => item.id !== rule.id);
  persistRules();
}

function importTemplate() {
  if (!selectedTemplateId.value) {
    return;
  }

  const newRules = createRulesFromTemplate(selectedTemplateId.value);
  rules.value.push(...newRules);
  persistRules();
  message.success(`已导入 ${newRules.length} 条模板规则`);
}

function exportRules() {
  const blob = new Blob([exportRulesJson(rules.value)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'clipboard-custom-rules.json';
  link.click();
  URL.revokeObjectURL(url);
}

function triggerImport() {
  importInputRef.value?.click();
}

async function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';

  if (!file) {
    return;
  }

  try {
    const imported = parseRulesJson(await file.text());
    rules.value.push(...imported);
    persistRules();
    message.success(`已导入 ${imported.length} 条规则`);
  } catch (error: any) {
    message.error(error.message || '导入失败');
  }
}

function getStageOrder(stage?: CustomRuleExecutionStage): number {
  return stage === 'after-processors' ? 2 : 0;
}

function getRuleStageTagType(stage?: CustomRuleExecutionStage) {
  return stage === 'after-processors' ? 'success' : 'warning';
}
</script>

<style scoped>
.custom-rules {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header,
.side-card {
  background: var(--ctp-surface, #fffdfa);
}

.page-title {
  font-size: 18px;
}

.page-subtitle,
.template-description,
.small-text {
  font-size: 13px;
}

.order-alert {
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--ctp-secondary, #66724a) 18%, var(--ctp-border, #ddd5c6));
  background: color-mix(in srgb, var(--ctp-secondary, #66724a) 6%, var(--ctp-surface, #fffdfa));
}

.rules-card {
  min-height: 580px;
}

.rules-card :deep(.n-card-header),
.side-card :deep(.n-card-header) {
  border-bottom: 1px solid var(--ctp-border, #ddd5c6);
}

.side-card + .side-card {
  margin-top: 16px;
}

.empty-state {
  padding: 96px 0;
}

.rule-code {
  display: flex;
  gap: 8px;
  align-items: center;
  max-width: 100%;
  overflow: hidden;
  padding: 8px;
  border: 1px solid var(--ctp-border, #ddd5c6);
  border-radius: 6px;
  background: var(--ctp-surface-soft, #f2eee5);
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
}

.rule-code span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rule-code .arrow {
  flex: 0 0 auto;
  color: var(--ctp-text-muted, #706a5f);
}

.rule-dialog {
  width: min(820px, 92vw);
}

.validation-alert {
  margin-top: 8px;
}

.hidden-input {
  display: none;
}

:deep(.n-card) {
  border-radius: 8px;
}

:deep(.n-list-item) {
  padding: 14px 16px;
}
</style>
