<template>
  <div class="ocr-settings ctp-field-note">
    <n-alert type="warning" class="ctp-margin-note">SecretId 和 SecretKey 仅保存在当前浏览器 localStorage。网页版直接请求腾讯云，部署环境可能受到 CORS 策略限制。</n-alert>
    <n-form label-placement="left" label-width="180">
      <n-form-item label="默认识别模型"><n-select v-model:value="config.model" :options="modelOptions" @update:value="saveAndRefresh" /><div class="model-description">{{ selectedModelDescription }}</div></n-form-item>
      <n-form-item label="腾讯云 SecretId"><n-input v-model:value="config.secretId" type="password" show-password-on="click" /></n-form-item>
      <n-form-item label="腾讯云 SecretKey"><n-input v-model:value="config.secretKey" type="password" show-password-on="click" /></n-form-item>
      <n-form-item label="地域（可选）"><n-input v-model:value="config.region" placeholder="留空即可" /></n-form-item>
      <n-grid :cols="2" :x-gap="20" responsive="screen">
        <n-gi><n-form-item label="基础版外部已用"><n-input-number v-model:value="config.basicQuotaBaseline" :min="0" /></n-form-item></n-gi>
        <n-gi><n-form-item label="高速版外部已用"><n-input-number v-model:value="config.fastQuotaBaseline" :min="0" /></n-form-item></n-gi>
        <n-gi><n-form-item label="高精度版月上限"><n-input-number v-model:value="config.accurateMonthlyLimit" :min="0" /></n-form-item></n-gi>
        <n-gi><n-form-item label="高精度版外部已用"><n-input-number v-model:value="config.accurateQuotaBaseline" :min="0" /></n-form-item></n-gi>
        <n-gi><n-form-item label="英文识别外部已用"><n-input-number v-model:value="config.englishQuotaBaseline" :min="0" /></n-form-item></n-gi>
      </n-grid>
      <n-space align="center">
        <n-tag :type="quota.stopped ? 'error' : 'success'">当前模型已用 {{ quota.used + quota.baseline }} / {{ quota.limit }}，保护阈值前剩余 {{ quota.remaining }} 次</n-tag>
        <n-button size="small" @click="resetQuota">重置当前模型本地额度</n-button>
        <n-button type="primary" size="small" @click="save">保存 OCR 配置</n-button>
      </n-space>
    </n-form>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { NAlert, NButton, NForm, NFormItem, NGi, NGrid, NInput, NInputNumber, NSelect, NSpace, NTag, useMessage } from 'naive-ui';
import { OCR_MODELS, getOcrQuota, loadOcrConfig, resetOcrQuota, saveOcrConfig } from '../services/tencent-ocr-service';
const message = useMessage();
const config = ref(loadOcrConfig());
const quotaVersion = ref(0);
const quota = computed(() => { quotaVersion.value; return getOcrQuota(config.value); });
const modelOptions = OCR_MODELS.map(item => ({ label: item.label, value: item.value }));
const selectedModelDescription = computed(() => OCR_MODELS.find(item => item.value === config.value.model)?.description || '');
function save() { saveOcrConfig(config.value); quotaVersion.value++; message.success('OCR 配置已保存'); }
function saveAndRefresh() { saveOcrConfig(config.value); quotaVersion.value++; }
function resetQuota() { resetOcrQuota(config.value.model); quotaVersion.value++; message.success('当前模型本地额度已重置'); }
</script>
<style scoped>
.ocr-settings { display: flex; flex-direction: column; gap: 16px; }
.model-description { margin-top: 6px; color: var(--ctp-text-muted); font-size: 12px; line-height: 1.5; }
</style>
