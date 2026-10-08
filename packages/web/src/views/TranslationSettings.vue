<template>
  <n-card title="翻译配置" size="small" class="ctp-field-note">
    <n-form :model="config" label-placement="left" label-width="120">
      <!-- 百度翻译配置 -->
      <n-divider>百度翻译</n-divider>
      <n-form-item label="API 类型">
        <n-select
          v-model:value="config.apiType"
          :options="apiTypeOptions"
          @update:value="handleSaveConfig"
        />
      </n-form-item>
      <n-form-item label="APP ID">
        <n-input
          v-model:value="config.baiduAppId"
          type="password"
          placeholder="请输入百度翻译 APP ID"
          show-password-on="click"
        />
      </n-form-item>
      <n-form-item v-if="config.apiType !== 'large-model' || config.largeModelAuthMode === 'sign'" label="Secret Key">
        <n-input
          v-model:value="config.baiduSecretKey"
          type="password"
          placeholder="请输入百度翻译 Secret Key"
          show-password-on="click"
        />
      </n-form-item>
      <n-form-item v-if="config.apiType === 'domain'" label="翻译领域">
        <n-select
          v-model:value="config.domain"
          :options="fieldDomainOptions"
          @update:value="handleSaveConfig"
        />
      </n-form-item>
      <template v-if="config.apiType === 'large-model'">
        <n-form-item label="鉴权方式">
          <n-select
            v-model:value="config.largeModelAuthMode"
            :options="largeModelAuthModeOptions"
            @update:value="handleSaveConfig"
          />
        </n-form-item>
        <n-form-item v-if="config.largeModelAuthMode === 'api-key'" label="API Key">
          <n-input
            v-model:value="config.largeModelApiKey"
            type="password"
            placeholder="请输入 API Key 管理页面中的 API Key"
            show-password-on="click"
          />
        </n-form-item>
        <n-form-item label="请求地址">
          <n-input
            v-model:value="config.largeModelEndpoint"
            placeholder="https://fanyi-api.baidu.com/ait/api/aiTextTranslate"
          />
        </n-form-item>
        <n-form-item label="模型类型">
          <n-select
            v-model:value="config.largeModelModelType"
            :options="largeModelModelTypeOptions"
            @update:value="handleSaveConfig"
          />
        </n-form-item>
        <n-form-item label="翻译指令">
          <n-input
            v-model:value="config.largeModelReference"
            type="textarea"
            placeholder="可选，如：使用学术风格来翻译"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
        </n-form-item>
        <n-form-item label="启用术语库">
          <n-switch
            v-model:value="config.largeModelNeedIntervene"
            @update:value="handleSaveConfig"
          />
        </n-form-item>
        <n-form-item label="标签保持">
          <n-switch
            v-model:value="config.largeModelTagHandling"
            @update:value="handleSaveConfig"
          />
        </n-form-item>
        <n-form-item v-if="config.largeModelTagHandling" label="忽略标签">
          <n-input
            v-model:value="config.largeModelIgnoreTags"
            placeholder="最多 20 个，逗号分隔，如 name,address"
          />
        </n-form-item>
      </template>

      <n-alert type="info" style="margin-bottom: 16px;">
        本工具作为静态页面运行，百度翻译 API 配置会保存在当前浏览器本地。
        发布后每位用户都需要填写自己的百度凭据。通用、领域、图片翻译使用 APP ID + Secret Key；
        大模型文本翻译默认使用 APP ID + API Key，官方地址为 https://fanyi-api.baidu.com/ait/api/aiTextTranslate。
      </n-alert>

      <!-- 语言配置 -->
      <n-divider>语言设置</n-divider>
      <n-form-item label="默认源语言">
        <n-select
          v-model:value="config.defaultSourceLang"
          :options="sourceLanguageOptions"
        />
      </n-form-item>
      <n-form-item label="默认目标语言">
        <n-select
          v-model:value="config.defaultTargetLang"
          :options="targetLanguageOptions"
        />
      </n-form-item>

      <!-- 自动翻译配置 -->
      <n-divider>翻译模式</n-divider>
      <n-form-item label="自动翻译">
        <n-switch
          v-model:value="config.autoTranslate"
          @update:value="saveAutoTranslateSetting"
        />
        <n-text depth="3" style="margin-left: 8px;">
          输入时自动触发翻译（500ms防抖）
        </n-text>
      </n-form-item>
      <n-form-item label="启用缓存">
        <n-switch
          v-model:value="config.cacheEnabled"
          @update:value="saveCacheSetting"
        />
        <n-text depth="3" style="margin-left: 8px;">
          相同文本、语言和 APP ID 会优先复用本地缓存
        </n-text>
      </n-form-item>

      <n-divider>本地缓存</n-divider>
      <n-form-item label="缓存数量">
        <n-space align="center">
          <n-tag type="info">
            {{ cacheStats.count }} / {{ cacheStats.max }}
          </n-tag>
          <n-button size="small" @click="handleClearCache">
            清空缓存
          </n-button>
        </n-space>
      </n-form-item>

      <n-divider>免费额度保护</n-divider>
      <n-form-item label="本月已记录">
        <n-space vertical>
          <n-space align="center">
            <n-text>百度控制台外部已用量</n-text>
            <n-input-number
              v-model:value="config.quotaBaseline"
              :min="0"
              :precision="0"
              style="width: 180px"
              @update:value="handleSaveConfig"
            />
          </n-space>
          <n-space align="center">
            <n-tag :type="quotaStats.stopped ? 'error' : 'success'">
              {{ quotaStats.used }} / {{ quotaStats.freeLimit }}
              {{ quotaUnitLabel }}
            </n-tag>
            <n-tag type="warning">
              95% 停止线：{{ quotaStats.stopAt }}
            </n-tag>
          </n-space>
          <n-text depth="3" style="font-size: 12px;">
            总用量 = 外部已用量 {{ quotaStats.baseline }} + 本工具记录 {{ quotaStats.localUsed }}。
            本工具无法自动读取百度控制台里由其他应用消耗的额度。
            图片翻译按次数单独统计，可在图片翻译页面查看。
          </n-text>
          <n-button size="small" @click="handleResetQuotaUsage">
            重置本地额度记录
          </n-button>
        </n-space>
      </n-form-item>

      <n-form-item>
        <n-space>
          <n-button type="primary" @click="handleSaveConfig">
            保存配置
          </n-button>
          <n-button @click="handleTestConfig">
            测试配置
          </n-button>
          <n-button @click="handleResetConfig">
            重置默认
          </n-button>
        </n-space>
      </n-form-item>

      <n-alert type="info" style="margin-top: 16px;">
        <template #header>获取API Key</template>
        访问
        <n-a href="https://fanyi-api.baidu.com" target="_blank">
          百度翻译开放平台
        </n-a>
        注册账号并开通翻译API服务，获取 APP ID、密钥或 API Key。
        <br />
        <n-text type="warning">
          API Key保存在本地浏览器中，请勿在公共设备上使用。
        </n-text>
      </n-alert>
    </n-form>
  </n-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  NA,
  NAlert,
  NButton,
  NCard,
  NDivider,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NSwitch,
  NTag,
  NText,
  useMessage
} from 'naive-ui';
import { useTranslator } from '../composables/useTranslator';
import {
  FIELD_DOMAIN_OPTIONS,
  LANGUAGES,
  TRANSLATION_API_OPTIONS
} from '../services/translation-service';

const message = useMessage();

// 使用翻译Composable
const {
  config,
  updateConfig,
  resetConfig: resetToDefault,
  cacheStats,
  clearCache,
  quotaStats,
  resetQuotaUsage,
  testTranslationConfig,
  saveAutoTranslateSetting,
  saveCacheSetting
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

const apiTypeOptions = computed(() =>
  TRANSLATION_API_OPTIONS.map(api => ({
    label: `${api.label}（免费额度 ${api.freeLimit}${api.unit === 'character' ? '字符' : '次'}）`,
    value: api.value
  }))
);

const quotaUnitLabel = computed(() => quotaStats.value.unit === 'character' ? '字符' : '次');

const fieldDomainOptions = computed(() =>
  FIELD_DOMAIN_OPTIONS.map(domain => ({
    label: `${domain.label} / ${domain.value} / ${domain.directions}`,
    value: domain.value
  }))
);

const largeModelAuthModeOptions = [
  { label: 'API Key 鉴权（推荐）', value: 'api-key' },
  { label: 'Sign 鉴权', value: 'sign' }
];

const largeModelModelTypeOptions = [
  { label: '大模型翻译 / llm', value: 'llm' },
  { label: '机器翻译 / nmt', value: 'nmt' }
];

// 保存配置
const handleSaveConfig = () => {
  updateConfig(config);
  message.success('配置已保存');
};

// 重置配置
const handleResetConfig = () => {
  resetToDefault();
  message.info('已重置为默认配置');
};

const handleClearCache = () => {
  clearCache();
  message.info('翻译缓存已清空');
};

const handleResetQuotaUsage = () => {
  resetQuotaUsage();
  message.info('本地额度记录已重置');
};

const handleTestConfig = async () => {
  try {
    const result = await testTranslationConfig();
    message.success(`测试成功：hello -> ${result.text}`);
  } catch (error: any) {
    message.error(error.message || '测试失败');
  }
};
</script>
