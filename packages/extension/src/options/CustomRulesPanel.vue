<template>
  <n-tabs type="line">
    <n-tab-pane name="basic" tab="基础规则">
      <n-alert type="info">启用规则自动参与普通处理：处理前规则 → 内置处理器 → 处理后规则。</n-alert>
      <n-space class="toolbar">
        <n-button type="primary" @click="editBasic()">添加规则</n-button>
        <n-button @click="addTemplate">导入清理模板</n-button>
        <n-button @click="exportRules">导出规则</n-button>
        <n-button @click="triggerImport">导入规则</n-button>
      </n-space>
      <n-list bordered>
        <n-list-item v-for="rule in basicRules" :key="rule.id">
          <n-thing>
            <template #header>
              <n-space align="center">
                <n-switch v-model:value="rule.isActive" @update:value="saveBasicRules" />
                <strong>{{ rule.name }}</strong>
                <n-tag size="small">{{ rule.stage === 'after-processors' ? '处理后' : '处理前' }}</n-tag>
                <n-tag size="small" type="info">{{ rule.type }}</n-tag>
              </n-space>
            </template>
            <template #description>{{ rule.pattern }} → {{ rule.type === 'delete' ? '(删除)' : rule.replacement }}</template>
            <template #action>
              <n-space>
                <n-button size="small" @click="editBasic(rule)">编辑</n-button>
                <n-button size="small" @click="duplicateBasic(rule)">复制</n-button>
                <n-button size="small" type="error" @click="deleteBasic(rule.id)">删除</n-button>
              </n-space>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
      <n-empty v-if="basicRules.length === 0" description="暂无基础规则" />
      <n-card title="即时预览" size="small" class="preview-card">
        <n-grid :cols="2" :x-gap="12">
          <n-gi><n-input v-model:value="previewInput" type="textarea" :rows="6" placeholder="输入测试文本" /></n-gi>
          <n-gi><n-input :value="previewResult" type="textarea" :rows="6" readonly /></n-gi>
        </n-grid>
      </n-card>
    </n-tab-pane>

    <n-tab-pane name="ai-rules" tab="AI 处理要求">
      <n-alert type="info">AI 要求不会参与普通处理。请在插件弹窗中选择一条要求并点击“AI处理”。</n-alert>
      <n-space class="toolbar"><n-button type="primary" :disabled="profiles.length === 0" @click="editAiRule()">添加 AI 要求</n-button></n-space>
      <n-list bordered>
        <n-list-item v-for="rule in aiRules" :key="rule.id">
          <n-thing>
            <template #header>
              <n-space align="center">
                <n-switch v-model:value="rule.isActive" @update:value="saveAiRules" />
                <strong>{{ rule.name }}</strong>
                <n-tag size="small">{{ profileName(rule.profileId) }}</n-tag>
              </n-space>
            </template>
            <template #description>{{ rule.instruction }}</template>
            <template #action>
              <n-space>
                <n-button size="small" @click="editAiRule(rule)">编辑</n-button>
                <n-button size="small" :loading="testingAiRuleId === rule.id" @click="testAiRule(rule)">测试</n-button>
                <n-button size="small" type="error" @click="deleteAiRule(rule.id)">删除</n-button>
              </n-space>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
      <n-empty v-if="aiRules.length === 0" description="暂无 AI 处理要求" />
      <n-card title="AI 要求测试" size="small" class="preview-card">
        <n-grid :cols="2" :x-gap="12">
          <n-gi><n-input v-model:value="aiTestInput" type="textarea" :rows="6" placeholder="输入测试文本，然后点击某条 AI 要求的测试按钮" /></n-gi>
          <n-gi><n-input :value="aiTestResult" type="textarea" :rows="6" readonly /></n-gi>
        </n-grid>
      </n-card>
    </n-tab-pane>

    <n-tab-pane name="profiles" tab="AI API 配置">
      <n-alert type="warning">API Key 仅保存在当前插件的 chrome.storage.local，不会包含在规则导出文件中。</n-alert>
      <n-space class="toolbar"><n-button type="primary" @click="editProfile()">添加 API 配置</n-button></n-space>
      <n-list bordered>
        <n-list-item v-for="profile in profiles" :key="profile.id">
          <n-thing>
            <template #header><strong>{{ profile.name }}</strong></template>
            <template #description>{{ profile.protocol }} · {{ profile.model }} · {{ profile.baseUrl }}</template>
            <template #action>
              <n-space>
                <n-button size="small" :loading="testingProfileId === profile.id" @click="testProfile(profile)">测试</n-button>
                <n-button size="small" @click="editProfile(profile)">编辑</n-button>
                <n-button size="small" type="error" @click="deleteProfile(profile.id)">删除</n-button>
              </n-space>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
      <n-empty v-if="profiles.length === 0" description="暂无 API 配置" />
    </n-tab-pane>
  </n-tabs>

  <n-modal v-model:show="basicModal" preset="card" title="基础规则" class="dialog">
    <n-form label-placement="top">
      <n-form-item label="名称"><n-input v-model:value="basicDraft.name" /></n-form-item>
      <n-grid :cols="3" :x-gap="12">
        <n-gi><n-form-item label="类型"><n-select v-model:value="basicDraft.type" :options="basicTypeOptions" /></n-form-item></n-gi>
        <n-gi><n-form-item label="阶段"><n-select v-model:value="basicDraft.stage" :options="stageOptions" /></n-form-item></n-gi>
        <n-gi><n-form-item label="优先级"><n-input-number v-model:value="basicDraft.priority" :min="1" /></n-form-item></n-gi>
      </n-grid>
      <n-form-item label="匹配内容"><n-input v-model:value="basicDraft.pattern" type="textarea" /></n-form-item>
      <n-form-item v-if="basicDraft.type !== 'delete'" label="替换内容"><n-input v-model:value="basicDraft.replacement" type="textarea" /></n-form-item>
      <n-form-item label="正则标志"><n-input v-model:value="basicDraft.flags" /></n-form-item>
      <n-alert v-if="formError" type="error">{{ formError }}</n-alert>
      <n-space justify="end" class="toolbar"><n-button @click="basicModal = false">取消</n-button><n-button type="primary" @click="commitBasic">保存</n-button></n-space>
    </n-form>
  </n-modal>

  <n-modal v-model:show="aiRuleModal" preset="card" title="AI 处理要求" class="dialog">
    <n-form label-placement="top">
      <n-form-item label="名称"><n-input v-model:value="aiRuleDraft.name" /></n-form-item>
      <n-form-item label="API 配置"><n-select v-model:value="aiRuleDraft.profileId" :options="profileOptions" /></n-form-item>
      <n-form-item label="处理要求"><n-input v-model:value="aiRuleDraft.instruction" type="textarea" :rows="6" placeholder="例如：修正错别字并保持原有段落格式" /></n-form-item>
      <n-space justify="end"><n-button @click="aiRuleModal = false">取消</n-button><n-button type="primary" @click="commitAiRule">保存</n-button></n-space>
    </n-form>
  </n-modal>

  <n-modal v-model:show="profileModal" preset="card" title="AI API 配置" class="dialog">
    <n-form label-placement="top">
      <n-form-item label="名称"><n-input v-model:value="profileDraft.name" /></n-form-item>
      <n-form-item label="协议"><n-select v-model:value="profileDraft.protocol" :options="protocolOptions" /></n-form-item>
      <n-form-item label="Base URL"><n-input v-model:value="profileDraft.baseUrl" placeholder="例如 https://api.deepseek.com" /></n-form-item>
      <n-form-item label="API Key"><n-input v-model:value="profileDraft.apiKey" type="password" show-password-on="click" /></n-form-item>
      <n-form-item label="模型"><n-input v-model:value="profileDraft.model" placeholder="例如 deepseek-chat" /></n-form-item>
      <n-form-item v-if="profileDraft.protocol === 'anthropic-compatible'" label="Anthropic 鉴权"><n-select v-model:value="profileDraft.anthropicAuthMode" :options="anthropicAuthOptions" /></n-form-item>
      <n-grid :cols="3" :x-gap="12">
        <n-gi><n-form-item label="最大输入字符"><n-input-number v-model:value="profileDraft.maxInputChars" :min="1" /></n-form-item></n-gi>
        <n-gi><n-form-item label="最大输出 Token"><n-input-number v-model:value="profileDraft.maxOutputTokens" :min="1" /></n-form-item></n-gi>
        <n-gi><n-form-item label="超时(ms)"><n-input-number v-model:value="profileDraft.timeoutMs" :min="1000" /></n-form-item></n-gi>
      </n-grid>
      <n-space justify="end"><n-button @click="profileModal = false">取消</n-button><n-button type="primary" @click="commitProfile">保存</n-button></n-space>
    </n-form>
  </n-modal>

  <input ref="importInput" type="file" accept=".json,application/json" hidden @change="importRules" />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  NAlert, NButton, NCard, NEmpty, NForm, NFormItem, NGi, NGrid, NInput, NInputNumber,
  NList, NListItem, NModal, NSelect, NSpace, NSwitch, NTabPane, NTabs, NTag, NThing
} from 'naive-ui';
import type { CustomRule } from '@clipboard-processor/core';
import { applyCustomRules, createCustomRule, normalizeCustomRules, validateCustomRule } from '../shared/custom-rules';
import {
  createAiProfile, createAiRule, normalizeAiProfiles, normalizeAiRules,
  type AiApiProfile, type AiProcessingRule
} from '../shared/ai-processing-types';
import { getErrorMessage, sendRuntimeMessage } from '../shared/runtime-message';

const basicRules = ref<CustomRule[]>([]);
const aiRules = ref<AiProcessingRule[]>([]);
const profiles = ref<AiApiProfile[]>([]);
const previewInput = ref('This paper has  extra spaces [1].');
const basicModal = ref(false);
const aiRuleModal = ref(false);
const profileModal = ref(false);
const formError = ref('');
const testingProfileId = ref('');
const testingAiRuleId = ref('');
const aiTestInput = ref('Please process this sample text.');
const aiTestResult = ref('');
const importInput = ref<HTMLInputElement | null>(null);
const basicDraft = ref(createCustomRule());
const aiRuleDraft = ref(createAiRule());
const profileDraft = ref(createAiProfile());

const previewResult = computed(() => {
  const before = applyCustomRules(previewInput.value, basicRules.value, 'before-processors');
  return applyCustomRules(before.text, basicRules.value, 'after-processors').text;
});
const profileOptions = computed(() => profiles.value.map(profile => ({ label: profile.name, value: profile.id })));
const basicTypeOptions = [{ label: '正则替换', value: 'regex' }, { label: '文本替换', value: 'text' }, { label: '删除匹配', value: 'delete' }];
const stageOptions = [{ label: '处理前', value: 'before-processors' }, { label: '处理后', value: 'after-processors' }];
const protocolOptions = [{ label: 'OpenAI-Compatible', value: 'openai-compatible' }, { label: 'Anthropic-Compatible', value: 'anthropic-compatible' }];
const anthropicAuthOptions = [{ label: 'x-api-key', value: 'x-api-key' }, { label: 'Bearer', value: 'bearer' }];

onMounted(loadAll);

async function loadAll() {
  const [basic, ai, profile] = await Promise.all([
    sendRuntimeMessage<{ rules: CustomRule[] }>({ type: 'GET_CUSTOM_RULES' }),
    sendRuntimeMessage<{ rules: AiProcessingRule[] }>({ type: 'GET_AI_RULES' }),
    sendRuntimeMessage<{ profiles: AiApiProfile[] }>({ type: 'GET_AI_PROFILES' })
  ]);
  basicRules.value = normalizeCustomRules(basic.rules);
  aiRules.value = normalizeAiRules(ai.rules);
  profiles.value = normalizeAiProfiles(profile.profiles);
}

function editBasic(rule?: CustomRule) { basicDraft.value = rule ? { ...rule } : createCustomRule(); formError.value = ''; basicModal.value = true; }
function editAiRule(rule?: AiProcessingRule) { aiRuleDraft.value = rule ? { ...rule } : createAiRule(profiles.value[0]?.id); aiRuleModal.value = true; }
function editProfile(profile?: AiApiProfile) { profileDraft.value = profile ? { ...profile } : createAiProfile(); profileModal.value = true; }
function profileName(id: string) { return profiles.value.find(profile => profile.id === id)?.name || '配置不存在'; }

async function commitBasic() {
  formError.value = validateCustomRule(basicDraft.value) || '';
  if (formError.value) return;
  upsert(basicRules.value, { ...basicDraft.value, updatedAt: Date.now() });
  await saveBasicRules(); basicModal.value = false;
}
async function commitAiRule() {
  if (!aiRuleDraft.value.name.trim() || !aiRuleDraft.value.instruction.trim() || !aiRuleDraft.value.profileId) return alert('名称、API 配置和处理要求不能为空');
  upsert(aiRules.value, { ...aiRuleDraft.value, updatedAt: Date.now() });
  await saveAiRules(); aiRuleModal.value = false;
}
async function commitProfile() {
  if (!profileDraft.value.name.trim() || !profileDraft.value.baseUrl.trim() || !profileDraft.value.apiKey.trim() || !profileDraft.value.model.trim()) return alert('名称、Base URL、API Key 和模型不能为空');
  upsert(profiles.value, { ...profileDraft.value, updatedAt: Date.now() });
  await saveProfiles(); profileModal.value = false;
}
function upsert<T extends { id: string }>(items: T[], value: T) { const index = items.findIndex(item => item.id === value.id); index >= 0 ? items.splice(index, 1, value) : items.push(value); }
async function saveBasicRules() { await sendRuntimeMessage({ type: 'SAVE_CUSTOM_RULES', rules: basicRules.value }); }
async function saveAiRules() { await sendRuntimeMessage({ type: 'SAVE_AI_RULES', rules: aiRules.value }); }
async function saveProfiles() { await sendRuntimeMessage({ type: 'SAVE_AI_PROFILES', profiles: profiles.value }); }
async function deleteBasic(id: string) { basicRules.value = basicRules.value.filter(rule => rule.id !== id); await saveBasicRules(); }
async function deleteAiRule(id: string) { aiRules.value = aiRules.value.filter(rule => rule.id !== id); await saveAiRules(); }
async function deleteProfile(id: string) {
  if (aiRules.value.some(rule => rule.profileId === id)) return alert('请先删除或修改使用此 API 配置的 AI 要求');
  profiles.value = profiles.value.filter(profile => profile.id !== id); await saveProfiles();
}
async function duplicateBasic(rule: CustomRule) { const copy = createCustomRule(); basicRules.value.push({ ...rule, id: copy.id, name: `${rule.name} 副本`, createdAt: copy.createdAt, updatedAt: copy.updatedAt }); await saveBasicRules(); }
async function addTemplate() {
  const rule = createCustomRule();
  basicRules.value.push({ ...rule, name: '删除引用标记', type: 'delete', pattern: '\\[[\\d,\\-\\s]+\\]', replacement: '', priority: 10 });
  await saveBasicRules();
}
async function testProfile(profile: AiApiProfile) {
  testingProfileId.value = profile.id;
  try { await sendRuntimeMessage({ type: 'TEST_AI_PROFILE', profile }, { timeoutMs: profile.timeoutMs * 3 + 5000 }); alert('连接测试成功'); }
  catch (error) { alert(`连接测试失败：${getErrorMessage(error)}`); }
  finally { testingProfileId.value = ''; }
}
async function testAiRule(rule: AiProcessingRule) {
  testingAiRuleId.value = rule.id; aiTestResult.value = '';
  try {
    const response = await sendRuntimeMessage<{ result: { text: string } }>({ type: 'TEST_AI_RULE', text: aiTestInput.value, ruleId: rule.id }, { timeoutMs: 190000 });
    aiTestResult.value = response.result.text;
  } catch (error) { aiTestResult.value = `测试失败：${getErrorMessage(error)}`; }
  finally { testingAiRuleId.value = ''; }
}
function exportRules() {
  const exportedProfiles = profiles.value.map(profile => ({ ...profile, apiKey: '' }));
  const blob = new Blob([JSON.stringify({ version: 1, customRules: basicRules.value, aiRules: aiRules.value, aiProfiles: exportedProfiles }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'clipboard-rules.json'; link.click(); URL.revokeObjectURL(link.href);
}
function triggerImport() { importInput.value?.click(); }
async function importRules(event: Event) {
  const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = ''; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (Array.isArray(data)) basicRules.value = normalizeCustomRules(data);
    else {
      if (Array.isArray(data.customRules) || Array.isArray(data.rules)) basicRules.value = normalizeCustomRules(data.customRules ?? data.rules);
      if (Array.isArray(data.aiRules)) aiRules.value = normalizeAiRules(data.aiRules);
    }
    if (Array.isArray(data.aiProfiles)) profiles.value = normalizeAiProfiles(data.aiProfiles);
    await Promise.all([saveBasicRules(), saveAiRules(), saveProfiles()]);
  } catch (error) { alert(`导入失败：${getErrorMessage(error)}`); }
}
</script>

<style scoped>
.toolbar { margin: 12px 0; }
.preview-card { margin-top: 16px; }
.dialog { width: min(760px, 92vw); }
</style>
