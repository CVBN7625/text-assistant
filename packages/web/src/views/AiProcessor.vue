<template>
  <div class="ai-page ctp-page">
    <PageHeader
      title="AI 自定义处理"
    >
      <template #meta><n-tag type="info">严格 JSON 输出</n-tag></template>
    </PageHeader>

    <n-card title="执行 AI 处理" class="ctp-field-note">
      <n-form label-placement="top">
        <n-form-item label="处理要求"><n-select v-model:value="selectedRuleId" :options="ruleOptions" placeholder="选择一条已启用要求" /></n-form-item>
        <n-grid :cols="2" :x-gap="12" class="ctp-workbench">
          <n-gi><n-form-item label="输入文本"><n-input v-model:value="inputText" type="textarea" :rows="14" /></n-form-item></n-gi>
          <n-gi><n-form-item label="处理结果"><n-input v-model:value="resultText" type="textarea" :rows="14" readonly /></n-form-item></n-gi>
        </n-grid>
        <n-alert type="warning" class="ctp-margin-note">网页版请求可能受到目标 API 的 CORS 策略限制。API Key 仅保存在当前浏览器 localStorage。</n-alert>
        <n-space justify="end" class="toolbar"><n-button @click="resultText = ''">清空结果</n-button><n-button type="primary" :loading="processing" :disabled="!selectedRuleId || !inputText.trim()" @click="runAi">AI处理</n-button></n-space>
      </n-form>
    </n-card>

    <n-card class="ctp-ledger">
      <n-tabs>
        <n-tab-pane name="rules" tab="AI 处理要求">
          <n-button type="primary" :disabled="profiles.length === 0" @click="openRule()" class="toolbar">添加要求</n-button>
          <n-list bordered>
            <n-list-item v-for="rule in rules" :key="rule.id">
              <n-thing>
                <template #header><n-space align="center"><n-switch v-model:value="rule.isActive" @update:value="persistRules" /><n-text strong class="ctp-user-content">{{ rule.name }}</n-text><n-tag size="small" class="ctp-user-content">{{ profileName(rule.profileId) }}</n-tag></n-space></template>
                <template #description><span class="ctp-user-content">{{ rule.instruction }}</span></template>
                <template #action><n-space><n-button size="small" @click="openRule(rule)">编辑</n-button><n-button size="small" type="error" @click="removeRule(rule.id)">删除</n-button></n-space></template>
              </n-thing>
            </n-list-item>
          </n-list>
          <IllustratedEmptyState
            v-if="rules.length === 0"
            variant="technical"
            title="暂无 AI 处理要求"
            description="先添加一条明确的处理要求，再将它应用到输入文本。"
          />
        </n-tab-pane>
        <n-tab-pane name="profiles" tab="API 配置">
          <n-button type="primary" @click="openProfile()" class="toolbar">添加 API 配置</n-button>
          <n-list bordered>
            <n-list-item v-for="profile in profiles" :key="profile.id">
              <n-thing>
                <template #header><n-text strong class="ctp-user-content">{{ profile.name }}</n-text></template>
                <template #description><span class="ctp-technical-text">{{ profile.protocol }} · {{ profile.model }} · {{ profile.baseUrl }}</span></template>
                <template #action><n-space><n-button size="small" :loading="testingId === profile.id" @click="testProfile(profile)">测试</n-button><n-button size="small" @click="openProfile(profile)">编辑</n-button><n-button size="small" type="error" @click="removeProfile(profile.id)">删除</n-button></n-space></template>
              </n-thing>
            </n-list-item>
          </n-list>
          <IllustratedEmptyState
            v-if="profiles.length === 0"
            variant="technical"
            title="暂无 API 配置"
            description="添加兼容服务的地址、模型和密钥后即可执行 AI 处理。"
          />
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <n-modal v-model:show="ruleModal" preset="card" title="AI 处理要求" class="dialog" to=".ctp-app">
      <n-form label-placement="top">
        <n-form-item label="名称"><n-input v-model:value="ruleDraft.name" /></n-form-item>
        <n-form-item label="API 配置"><n-select v-model:value="ruleDraft.profileId" :options="profileOptions" /></n-form-item>
        <n-form-item label="处理要求"><n-input v-model:value="ruleDraft.instruction" type="textarea" :rows="6" /></n-form-item>
        <n-space justify="end"><n-button @click="ruleModal = false">取消</n-button><n-button type="primary" @click="saveRule">保存</n-button></n-space>
      </n-form>
    </n-modal>

    <n-modal v-model:show="profileModal" preset="card" title="AI API 配置" class="dialog" to=".ctp-app">
      <n-form label-placement="top">
        <n-form-item label="名称"><n-input v-model:value="profileDraft.name" /></n-form-item>
        <n-form-item label="协议"><n-select v-model:value="profileDraft.protocol" :options="protocolOptions" /></n-form-item>
        <n-form-item label="Base URL"><n-input v-model:value="profileDraft.baseUrl" /></n-form-item>
        <n-form-item label="API Key"><n-input v-model:value="profileDraft.apiKey" type="password" show-password-on="click" /></n-form-item>
        <n-form-item label="模型"><n-input v-model:value="profileDraft.model" /></n-form-item>
        <n-form-item v-if="profileDraft.protocol === 'anthropic-compatible'" label="Anthropic 鉴权"><n-select v-model:value="profileDraft.anthropicAuthMode" :options="authOptions" /></n-form-item>
        <n-grid :cols="3" :x-gap="12">
          <n-gi><n-form-item label="最大输入字符"><n-input-number v-model:value="profileDraft.maxInputChars" :min="1" /></n-form-item></n-gi>
          <n-gi><n-form-item label="最大输出 Token"><n-input-number v-model:value="profileDraft.maxOutputTokens" :min="1" /></n-form-item></n-gi>
          <n-gi><n-form-item label="超时(ms)"><n-input-number v-model:value="profileDraft.timeoutMs" :min="1000" /></n-form-item></n-gi>
        </n-grid>
        <n-space justify="end"><n-button @click="profileModal = false">取消</n-button><n-button type="primary" @click="saveProfile">保存</n-button></n-space>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NAlert, NButton, NCard, NEmpty, NForm, NFormItem, NGi, NGrid, NInput, NInputNumber, NList, NListItem, NModal, NSelect, NSpace, NSwitch, NTabPane, NTabs, NTag, NText, NThing, useMessage } from 'naive-ui';
import { createAiProfile, createAiRule, loadAiProfiles, loadAiRules, processTextWithAi, saveAiProfiles, saveAiRules, testAiProfile, type AiApiProfile, type AiProcessingRule } from '../services/ai-processing-service';
import { addHistoryEntry } from '../services/history-service';
import IllustratedEmptyState from '../components/IllustratedEmptyState.vue';
import PageHeader from '../components/PageHeader.vue';

const message = useMessage();
const profiles = ref(loadAiProfiles());
const rules = ref(loadAiRules());
const selectedRuleId = ref(rules.value.find(rule => rule.isActive)?.id || '');
const inputText = ref('');
const resultText = ref('');
const processing = ref(false);
const testingId = ref('');
const ruleModal = ref(false);
const profileModal = ref(false);
const ruleDraft = ref(createAiRule());
const profileDraft = ref(createAiProfile());
const ruleOptions = computed(() => rules.value.filter(rule => rule.isActive).map(rule => ({ label: rule.name, value: rule.id })));
const profileOptions = computed(() => profiles.value.map(profile => ({ label: profile.name, value: profile.id })));
const protocolOptions = [{ label: 'OpenAI-Compatible', value: 'openai-compatible' }, { label: 'Anthropic-Compatible', value: 'anthropic-compatible' }];
const authOptions = [{ label: 'x-api-key', value: 'x-api-key' }, { label: 'Bearer', value: 'bearer' }];

function profileName(id: string) { return profiles.value.find(item => item.id === id)?.name || '配置不存在'; }
function openRule(rule?: AiProcessingRule) { ruleDraft.value = rule ? { ...rule } : createAiRule(profiles.value[0]?.id); ruleModal.value = true; }
function openProfile(profile?: AiApiProfile) { profileDraft.value = profile ? { ...profile } : createAiProfile(); profileModal.value = true; }
function persistRules() { saveAiRules(rules.value); }
function saveRule() { if (!ruleDraft.value.name.trim() || !ruleDraft.value.instruction.trim() || !ruleDraft.value.profileId) return message.error('名称、API 配置和处理要求不能为空'); upsert(rules.value, { ...ruleDraft.value, updatedAt: Date.now() }); saveAiRules(rules.value); ruleModal.value = false; }
function saveProfile() { if (!profileDraft.value.name.trim() || !profileDraft.value.baseUrl.trim() || !profileDraft.value.apiKey.trim() || !profileDraft.value.model.trim()) return message.error('名称、Base URL、API Key 和模型不能为空'); upsert(profiles.value, { ...profileDraft.value, updatedAt: Date.now() }); saveAiProfiles(profiles.value); profileModal.value = false; }
function removeRule(id: string) { rules.value = rules.value.filter(item => item.id !== id); saveAiRules(rules.value); }
function removeProfile(id: string) { if (rules.value.some(rule => rule.profileId === id)) return message.error('请先删除或修改使用此配置的 AI 要求'); profiles.value = profiles.value.filter(item => item.id !== id); saveAiProfiles(profiles.value); }
async function testProfile(profile: AiApiProfile) { testingId.value = profile.id; try { await testAiProfile(profile); message.success('连接测试成功'); } catch (error) { message.error(getError(error)); } finally { testingId.value = ''; } }
async function runAi() {
  const rule = rules.value.find(item => item.id === selectedRuleId.value && item.isActive);
  const profile = profiles.value.find(item => item.id === rule?.profileId);
  if (!rule || !profile) return message.error('请选择有效的 AI 要求和 API 配置');
  processing.value = true;
  try {
    resultText.value = await processTextWithAi(inputText.value, rule, profile);
    addHistoryEntry({ id: `ai-${Date.now()}`, timestamp: Date.now(), originalText: inputText.value, processedText: resultText.value, processorsUsed: [`ai-rule:${rule.id}`], source: 'manual' });
    message.success('AI 处理完成');
  } catch (error) { message.error(getError(error)); } finally { processing.value = false; }
}
function upsert<T extends { id: string }>(items: T[], value: T) { const index = items.findIndex(item => item.id === value.id); index >= 0 ? items.splice(index, 1, value) : items.push(value); }
function getError(error: unknown) { return error instanceof Error ? error.message : String(error); }
</script>

<style scoped>
.ai-page { display: flex; flex-direction: column; gap: 16px; }
.title { display: block; font-size: 18px; }
.toolbar { margin: 12px 0; }
.dialog { width: min(760px, 92vw); }
</style>
