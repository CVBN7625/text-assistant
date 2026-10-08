<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides">
  <main class="options-container" :data-ctp-skin="activeSkin" :data-ctp-theme="resolvedTheme">
    <header class="options-header">
      <h1>{{ uiText.pageTitle }}</h1>
    </header>

    <n-tabs>
      <n-tab-pane name="general" :tab="uiText.generalTab">
        <n-form label-placement="left" label-width="140" class="field-note-form">
          <n-form-item :label="uiText.theme">
            <div class="theme-setting">
              <n-select
                v-model:value="config.ui.theme"
                :options="themeOptions"
                :disabled="activeSkin === 'sunflower'"
                @update:value="value => updateUiSetting('theme', value)"
              />
              <n-tooltip v-if="activeSkin === 'sunflower'" trigger="hover">
                <template #trigger>
                  <button type="button" class="appearance-help" :aria-label="currentLanguage === 'en-US' ? 'Theme availability' : '主题可用性说明'">?</button>
                </template>
                {{ currentLanguage === 'en-US' ? 'Botanical Manuscript is light-only. Your Classic theme preference is preserved.' : '植物手稿仅提供浅色，经典皮肤的主题偏好会保留。' }}
              </n-tooltip>
            </div>
          </n-form-item>
          <n-form-item :label="uiText.skin">
            <div class="skin-gallery">
              <button
                v-for="option in skinSelectOptions"
                :key="option.value"
                type="button"
                :class="['skin-card', `skin-card--${option.value}`, { active: activeSkin === option.value }]"
                @click="updateUiSetting('skin', option.value)"
              >
                <span class="skin-card__preview"><i /><i /><i /></span>
                <strong>{{ option.label }}</strong>
              </button>
            </div>
          </n-form-item>
          <n-form-item :label="uiText.language">
            <n-select v-model:value="config.ui.language" :options="languageOptions" @update:value="value => updateUiSetting('language', value)" />
          </n-form-item>
          <n-form-item :label="uiText.showNotifications">
            <n-switch v-model:value="config.ui.showNotifications" @update:value="value => updateUiSetting('showNotifications', value)" />
          </n-form-item>
          <n-form-item :label="uiText.selectionAutomation">
            <n-switch v-model:value="config.ui.selectionAutomationEnabled" @update:value="value => updateUiSetting('selectionAutomationEnabled', value)" />
          </n-form-item>
          <n-form-item :label="uiText.selectionAutoProcess">
            <n-switch
              v-model:value="config.ui.selectionAutoProcessEnabled"
              :disabled="!config.ui.selectionAutomationEnabled"
              @update:value="value => updateUiSetting('selectionAutoProcessEnabled', value)"
            />
          </n-form-item>
          <n-form-item :label="uiText.selectionAutoTranslate">
            <n-switch
              v-model:value="config.ui.selectionAutoTranslateEnabled"
              :disabled="!config.ui.selectionAutomationEnabled"
              @update:value="value => updateUiSetting('selectionAutoTranslateEnabled', value)"
            />
          </n-form-item>
          <n-form-item :label="uiText.selectionMaxLength">
            <n-input-number
              v-model:value="config.ui.selectionActionMaxLength"
              :min="20"
              :max="5000"
              :step="100"
              :precision="0"
              @update:value="updateSelectionMaxLength"
            />
          </n-form-item>
        </n-form>

        <n-card :title="uiText.quickActionsTitle" size="small" class="quick-actions-card">
          <n-space class="quick-actions-toolbar">
            <n-button type="primary" @click="editQuickAction()">{{ uiText.addQuickAction }}</n-button>
          </n-space>
          <n-list bordered class="quick-actions-list">
            <n-list-item v-for="(action, index) in config.quickActions" :key="action.id" class="quick-action-item">
              <template #suffix>
                <n-space size="small" :wrap="false">
                  <n-button size="tiny" :disabled="index === 0" @click="moveQuickAction(index, -1)">↑</n-button>
                  <n-button size="tiny" :disabled="index === config.quickActions.length - 1" @click="moveQuickAction(index, 1)">↓</n-button>
                  <n-button size="small" @click="editQuickAction(action)">{{ uiText.edit }}</n-button>
                  <n-button size="small" @click="duplicateQuickAction(action)">{{ uiText.duplicate }}</n-button>
                  <n-button size="small" type="error" @click="deleteQuickAction(action.id)">{{ uiText.delete }}</n-button>
                </n-space>
              </template>
              <n-thing>
                <template #header>
                  <n-space align="center" size="small" :wrap="false">
                    <n-switch v-model:value="action.enabled" @update:value="saveQuickActions" />
                    <strong>{{ quickActionName(action) }}</strong>
                    <n-tag size="small">{{ action.processorIds.length }} {{ uiText.processorCount }}</n-tag>
                    <n-tag size="small">{{ action.customRuleIds.length }} {{ uiText.ruleCount }}</n-tag>
                    <n-tag v-if="missingQuickActionReferences(action) > 0" size="small" type="error">
                      {{ missingQuickActionReferences(action) }} {{ uiText.invalidReferences }}
                    </n-tag>
                  </n-space>
                </template>
              </n-thing>
            </n-list-item>
          </n-list>
          <n-empty v-if="config.quickActions.length === 0" :description="uiText.noQuickActions" />
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="history" :tab="uiText.historyTab">
        <n-form label-placement="left" label-width="150">
          <n-form-item :label="uiText.historyRetention">
            <n-select v-model:value="config.ui.historyRetentionMode" :options="historyRetentionOptions" @update:value="value => updateUiSetting('historyRetentionMode', value)" />
          </n-form-item>
          <n-form-item v-if="config.ui.historyRetentionMode === 'count'" :label="uiText.historyRetentionCount">
            <n-input-number
              v-model:value="config.ui.historyRetentionCount"
              :min="1"
              :max="100"
              :step="10"
              :precision="0"
              @update:value="value => updateUiSetting('historyRetentionCount', value || 1)"
            />
          </n-form-item>
        </n-form>

        <div class="history-actions">
          <n-button :disabled="recentHistory.length === 0" @click="loadHistory">{{ uiText.refreshHistory }}</n-button>
          <n-button
            type="error"
            quaternary
            :loading="isClearingHistory"
            :disabled="recentHistory.length === 0 || isClearingHistory"
            @click.prevent="clearHistory"
          >
            {{ uiText.clearHistory }}
          </n-button>
        </div>

        <n-list v-if="recentHistory.length > 0" bordered class="history-list">
          <n-list-item
            v-for="item in recentHistory"
            :key="item.id"
            class="history-item"
            @click="copyHistoryItem(item)"
          >
            <n-thing>
              <template #header>
                <span>{{ item.preview }}</span>
              </template>
              <template #description>
                <span>{{ formatHistoryTime(item.timestamp) }}</span>
              </template>
            </n-thing>
          </n-list-item>
        </n-list>
        <div v-else class="empty-history">{{ uiText.emptyHistory }}</div>
      </n-tab-pane>

      <n-tab-pane name="custom-rules" tab="自定义规则与 AI">
        <custom-rules-panel />
      </n-tab-pane>

      <n-tab-pane name="processors" :tab="uiText.processorsTab">
        <n-list class="processor-list">
          <n-list-item v-for="processor in processors" :key="processor.id">
            <n-thing>
              <template #header>
                <n-checkbox
                  v-model:checked="processor.isActive"
                  @update:checked="checked => onProcessorToggle(processor, checked)"
                >
                  {{ getProcessorName(processor) }}
                </n-checkbox>
              </template>
              <template #description>
                {{ getProcessorDescription(processor) }}
              </template>
            </n-thing>
          </n-list-item>
        </n-list>
      </n-tab-pane>

      <n-tab-pane name="shortcuts" :tab="uiText.shortcutsTab">
        <n-form label-placement="left" label-width="140">
          <n-form-item :label="uiText.processSelection">
            <n-input v-model:value="config.shortcuts.processSelection" />
          </n-form-item>
          <n-form-item :label="uiText.processClipboard">
            <n-input v-model:value="config.shortcuts.processClipboard" />
          </n-form-item>
          <n-form-item :label="uiText.quickClean">
            <n-input v-model:value="config.shortcuts.quickClean" />
          </n-form-item>
        </n-form>
      </n-tab-pane>

      <n-tab-pane name="translation" :tab="uiText.translationTab">
        <n-form label-placement="left" label-width="150">
          <n-form-item :label="uiText.defaultEngine">
            <n-select v-model:value="config.translation.defaultEngine" :options="engineOptions" @update:value="value => updateTranslationSetting('defaultEngine', value)" />
          </n-form-item>
          <n-form-item :label="uiText.apiType">
            <n-select v-model:value="translationApiType" :options="translationApiOptions" />
          </n-form-item>
          <n-form-item :label="uiText.baiduAppId">
            <n-input
              v-model:value="baiduApiConfig.appId"
              type="password"
              :placeholder="uiText.baiduAppIdPlaceholder"
              show-password-on="click"
            />
          </n-form-item>
          <n-form-item v-if="needsSecretKey" :label="uiText.baiduSecretKey">
            <n-input
              v-model:value="baiduApiConfig.secretKey"
              type="password"
              :placeholder="uiText.baiduSecretKeyPlaceholder"
              show-password-on="click"
            />
          </n-form-item>
          <n-form-item v-if="translationApiType === 'domain'" :label="uiText.translationDomain">
            <n-select v-model:value="baiduApiConfig.domain" :options="fieldDomainOptions" />
          </n-form-item>

          <template v-if="translationApiType === 'large-model'">
            <n-form-item :label="uiText.authMode">
              <n-select v-model:value="baiduApiConfig.largeModelAuthMode" :options="largeModelAuthModeOptions" />
            </n-form-item>
            <n-form-item v-if="baiduApiConfig.largeModelAuthMode === 'api-key'" :label="uiText.largeModelApiKey">
              <n-input
                v-model:value="baiduApiConfig.largeModelApiKey"
                type="password"
                :placeholder="uiText.largeModelApiKeyPlaceholder"
                show-password-on="click"
              />
            </n-form-item>
            <n-form-item :label="uiText.endpoint">
              <n-input
                v-model:value="baiduApiConfig.largeModelEndpoint"
                placeholder="https://fanyi-api.baidu.com/ait/api/aiTextTranslate"
              />
            </n-form-item>
            <n-form-item :label="uiText.modelType">
              <n-select v-model:value="baiduApiConfig.largeModelModelType" :options="largeModelModelTypeOptions" />
            </n-form-item>
            <n-form-item :label="uiText.translationInstruction">
              <n-input
                v-model:value="baiduApiConfig.largeModelReference"
                type="textarea"
                :placeholder="uiText.translationInstructionPlaceholder"
                :autosize="{ minRows: 2, maxRows: 4 }"
              />
            </n-form-item>
            <n-form-item :label="uiText.enableTerminology">
              <n-switch v-model:value="baiduApiConfig.largeModelNeedIntervene" />
            </n-form-item>
            <n-form-item :label="uiText.keepTags">
              <n-switch v-model:value="baiduApiConfig.largeModelTagHandling" />
            </n-form-item>
            <n-form-item v-if="baiduApiConfig.largeModelTagHandling" :label="uiText.ignoreTags">
              <n-input
                v-model:value="baiduApiConfig.largeModelIgnoreTags"
                :placeholder="uiText.ignoreTagsPlaceholder"
              />
            </n-form-item>
          </template>

          <template v-if="translationApiType === 'image'">
            <n-form-item :label="uiText.imageEndpoint">
              <n-input v-model:value="baiduApiConfig.imageEndpoint" :placeholder="uiText.imageEndpointPlaceholder" />
            </n-form-item>
            <n-form-item :label="uiText.imageCuid">
              <n-input v-model:value="baiduApiConfig.imageCuid" :placeholder="uiText.imageCuidPlaceholder" />
            </n-form-item>
            <n-form-item :label="uiText.imageMac">
              <n-input v-model:value="baiduApiConfig.imageMac" :placeholder="uiText.imageMacPlaceholder" />
            </n-form-item>
            <n-form-item :label="uiText.imageQuotaBaseline">
              <n-input-number v-model:value="baiduApiConfig.imageQuotaBaseline" :min="0" :precision="0" />
            </n-form-item>
          </template>

          <n-form-item v-if="translationApiType !== 'image'" :label="uiText.textQuotaBaseline">
            <n-input-number v-model:value="baiduApiConfig.quotaBaseline" :min="0" :precision="0" />
          </n-form-item>
          <n-form-item :label="uiText.enableCache">
            <n-switch v-model:value="config.translation.cacheEnabled" @update:value="value => updateTranslationSetting('cacheEnabled', value)" />
          </n-form-item>
          <n-form-item :label="uiText.translationAutoTranslate">
            <n-switch v-model:value="config.translation.autoTranslate" @update:value="value => updateTranslationSetting('autoTranslate', value)" />
          </n-form-item>
          <n-form-item :label="uiText.sourceLanguage">
            <n-select v-model:value="config.translation.defaultSourceLang" :options="translationSourceLanguageOptions" @update:value="value => updateTranslationSetting('defaultSourceLang', value)" />
          </n-form-item>
          <n-form-item :label="uiText.targetLanguage">
            <n-select v-model:value="config.translation.defaultTargetLang" :options="translationTargetLanguageOptions" @update:value="value => updateTranslationSetting('defaultTargetLang', value)" />
          </n-form-item>
          <n-form-item>
            <n-alert type="info">
              {{ uiText.translationCredentialTip }}
            </n-alert>
          </n-form-item>
        </n-form>
      </n-tab-pane>

      <n-tab-pane name="ocr" :tab="uiText.ocrTab">
        <n-form label-placement="left" label-width="180">
          <n-form-item :label="uiText.ocrModel">
            <n-select v-model:value="ocrConfig.model" :options="ocrModelOptions" />
            <div class="ocr-model-description">{{ selectedOcrModelDescription }}</div>
          </n-form-item>
          <n-form-item :label="uiText.tencentSecretId">
            <n-input v-model:value="ocrConfig.secretId" type="password" :placeholder="uiText.tencentSecretIdPlaceholder" show-password-on="click" />
          </n-form-item>
          <n-form-item :label="uiText.tencentSecretKey">
            <n-input v-model:value="ocrConfig.secretKey" type="password" :placeholder="uiText.tencentSecretKeyPlaceholder" show-password-on="click" />
          </n-form-item>
          <n-form-item :label="uiText.ocrRegion">
            <n-input v-model:value="ocrConfig.region" placeholder="ap-guangzhou" />
          </n-form-item>
          <n-form-item :label="uiText.basicExternalUsage">
            <n-input-number v-model:value="ocrConfig.basicQuotaBaseline" :min="0" :precision="0" />
          </n-form-item>
          <n-form-item :label="uiText.fastExternalUsage">
            <n-input-number v-model:value="ocrConfig.fastQuotaBaseline" :min="0" :precision="0" />
          </n-form-item>
          <n-form-item :label="uiText.accurateMonthlyLimit">
            <n-input-number v-model:value="ocrConfig.accurateMonthlyLimit" :min="0" :precision="0" />
          </n-form-item>
          <n-form-item :label="uiText.accurateExternalUsage">
            <n-input-number v-model:value="ocrConfig.accurateQuotaBaseline" :min="0" :precision="0" />
          </n-form-item>
          <n-form-item :label="uiText.englishExternalUsage">
            <n-input-number v-model:value="ocrConfig.englishQuotaBaseline" :min="0" :precision="0" />
          </n-form-item>
          <n-form-item>
            <n-alert type="warning">
              {{ uiText.ocrCredentialTip }}
            </n-alert>
          </n-form-item>
          <n-form-item>
            <n-button @click="testOcrSettings">{{ uiText.testOcrConfig }}</n-button>
            <n-button @click="loadOcrQuota">{{ uiText.refreshOcrQuota }}</n-button>
            <n-button @click="resetOcrQuotaUsage">{{ uiText.resetOcrQuota }}</n-button>
          </n-form-item>
          <n-form-item v-if="ocrQuota" :label="uiText.currentOcrQuota">
            {{ ocrQuota.month }} · {{ ocrQuota.localUsed + ocrQuota.baseline }}/{{ ocrQuota.limit }}
            · {{ uiText.ocrQuotaRemaining }} {{ ocrQuota.remainingBeforeStop }}
          </n-form-item>
        </n-form>
      </n-tab-pane>
    </n-tabs>

    <n-modal v-model:show="quickActionModal" preset="card" :title="uiText.quickActionEditor" class="quick-action-dialog">
      <n-form label-placement="top">
        <n-form-item :label="uiText.quickActionName">
          <n-input v-model:value="quickActionDraft.name" :placeholder="quickActionPresetPlaceholder" />
        </n-form-item>
        <n-form-item :label="uiText.quickActionProcessors">
          <n-select
            v-model:value="quickActionDraft.processorIds"
            multiple
            filterable
            :options="quickActionProcessorOptions"
          />
        </n-form-item>
        <n-form-item :label="uiText.quickActionRules">
          <n-select
            v-model:value="quickActionDraft.customRuleIds"
            multiple
            filterable
            :options="quickActionRuleOptions"
          />
        </n-form-item>
        <n-alert type="info">{{ uiText.quickActionOrderTip }}</n-alert>
        <n-alert v-if="quickActionError" type="error" class="quick-action-error">{{ quickActionError }}</n-alert>
        <n-space justify="end" class="quick-actions-toolbar">
          <n-button @click="quickActionModal = false">{{ uiText.cancel }}</n-button>
          <n-button type="primary" @click="commitQuickAction">{{ uiText.save }}</n-button>
        </n-space>
      </n-form>
    </n-modal>

    <n-modal v-model:show="exportModal" preset="card" :title="uiText.exportConfig" class="export-config-dialog">
      <n-space vertical>
        <n-alert type="info">{{ uiText.safeExportTip }}</n-alert>
        <n-checkbox v-model:checked="includeSensitiveCredentials">{{ uiText.includeSensitiveCredentials }}</n-checkbox>
        <n-alert v-if="includeSensitiveCredentials" type="warning">{{ uiText.sensitiveExportWarning }}</n-alert>
        <n-space justify="end">
          <n-button @click="exportModal = false">{{ uiText.cancel }}</n-button>
          <n-button type="primary" @click="confirmConfigExport">{{ uiText.exportConfig }}</n-button>
        </n-space>
      </n-space>
    </n-modal>

    <div class="actions">
      <n-button type="primary" :loading="isSaving" :disabled="isSaving" @click="saveConfig">{{ uiText.saveSettings }}</n-button>
      <n-button :disabled="isSaving" @click="resetConfig">{{ uiText.resetDefaults }}</n-button>
      <n-button :disabled="isSaving" @click="exportConfig">{{ uiText.exportConfig }}</n-button>
      <n-button :disabled="isSaving" @click="importConfig">{{ uiText.importConfig }}</n-button>
    </div>
  </main>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import {
  NTabs,
  NTabPane,
  NForm,
  NFormItem,
  NSelect,
  NSwitch,
  NList,
  NListItem,
  NThing,
  NAlert,
  NCheckbox,
  NInput,
  NInputNumber,
  NButton,
  NCard,
  NEmpty,
  NModal,
  NSpace,
  NTag,
  NConfigProvider,
  NTooltip,
  darkTheme
} from 'naive-ui';
import type { CustomRule, ProcessorConfig, QuickActionConfig, QuickActionPresetName } from '@clipboard-processor/core';
import { allProcessors, defaultConfig } from '@clipboard-processor/core';
import { getErrorMessage, sendRuntimeMessage } from '../shared/runtime-message';
import { createConfigBackup, getConfigBackupFilename, parseConfigBackup } from '../shared/config-backup';
import { createQuickAction, normalizeQuickActions } from '../shared/quick-actions';
import {
  getThemeOverrides,
  normalizeSkin,
  normalizeTheme,
  resolveTheme,
  systemPrefersDark,
  watchSystemTheme,
  skinOptions
} from '../theme/skins';
import CustomRulesPanel from './CustomRulesPanel.vue';

type TranslationApiType = 'general' | 'large-model' | 'domain' | 'image';

type ProcessorOption = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
};

type HistoryPreview = {
  id: string;
  preview: string;
  timestamp: number;
  text: string;
};

type ProcessorConfigPatch = {
  quickActions?: ProcessorConfig['quickActions'];
  processors?: ProcessorConfig['processors'];
  translation?: Partial<Omit<ProcessorConfig['translation'], 'apiKeys'>>;
  ocr?: Partial<ProcessorConfig['ocr']>;
  ui?: Partial<ProcessorConfig['ui']>;
};

type InstantTranslationSetting =
  | 'defaultEngine'
  | 'cacheEnabled'
  | 'autoTranslate'
  | 'defaultSourceLang'
  | 'defaultTargetLang';

const englishProcessorText: Record<string, { name: string; description: string }> = {
  'delete-duplicate-newlines': {
    name: 'Keep paragraph line breaks only',
    description: 'Remove extra line breaks and keep line breaks after sentence-ending punctuation.'
  },
  'delete-all-newlines': {
    name: 'Remove all line breaks',
    description: 'Remove all line breaks and merge the text into one line.'
  },
  'delete-duplicate-spaces': {
    name: 'Remove duplicate spaces',
    description: 'Collapse consecutive spaces into a single space.'
  },
  'remove-spaces-between-chinese': {
    name: 'Remove all spaces',
    description: 'Remove all spaces while preserving line breaks.'
  },
  'keep-english-word-spaces': {
    name: 'Keep English word spaces only',
    description: 'Remove spaces outside English words and collapse repeated spaces between English words.'
  },
  'delete-reference-badges': {
    name: 'Remove citation markers',
    description: 'Remove academic citation markers such as [1], [2, 3], and (4-7).'
  },
  'delete-footnotes': {
    name: 'Remove footnote markers',
    description: 'Remove footnote markers such as ①, ②, and ③.'
  },
  'clean-caj-special-characters': {
    name: 'Clean CAJ special characters',
    description: 'Clean abnormal whitespace, private-use characters, and invisible characters from CAJViewer copied text.'
  },
  'delete-emoji': {
    name: 'Remove emoji',
    description: 'Remove common emoji characters.'
  },
  'delete-special-symbols': {
    name: 'Remove special symbols',
    description: 'Remove common special symbols such as copyright, registered trademark, and trademark marks.'
  },
  'delete-duplicate-punctuation': {
    name: 'Remove duplicate punctuation',
    description: 'Collapse repeated common punctuation into a single mark.'
  },
  'strip-html-tags': {
    name: 'Remove HTML tags',
    description: 'Remove all HTML tags.'
  },
  'remove-urls': {
    name: 'Remove URLs',
    description: 'Remove all URL links.'
  },
  'full-width-to-half-width': {
    name: 'Full-width to half-width',
    description: 'Convert full-width characters to half-width characters.'
  },
  'half-width-to-full-width': {
    name: 'Half-width to full-width',
    description: 'Convert half-width characters to full-width characters.'
  },
  'uppercase-to-lowercase': {
    name: 'Uppercase to lowercase',
    description: 'Convert uppercase letters to lowercase.'
  },
  'lowercase-to-uppercase': {
    name: 'Lowercase to uppercase',
    description: 'Convert lowercase letters to uppercase.'
  },
  'english-to-chinese-punctuation': {
    name: 'English punctuation to Chinese',
    description: 'Convert English punctuation to Chinese punctuation.'
  },
  'chinese-to-english-punctuation': {
    name: 'Chinese punctuation to English',
    description: 'Convert Chinese punctuation to English punctuation.'
  },
  'simplified-to-traditional': {
    name: 'Simplified to traditional Chinese',
    description: 'Convert simplified Chinese to traditional Chinese.'
  },
  'traditional-to-simplified': {
    name: 'Traditional to simplified Chinese',
    description: 'Convert traditional Chinese to simplified Chinese.'
  },
  'replace-kangxi-radicals': {
    name: 'Replace Kangxi radicals',
    description: 'Replace Kangxi radical characters with corresponding regular Chinese components.'
  },
  'add-space-between-chinese-and-english': {
    name: 'Add spaces between Chinese and English',
    description: 'Add spaces between Chinese characters and English letters.'
  },
  'add-space-between-letters-and-numbers': {
    name: 'Add spaces between letters and numbers',
    description: 'Add spaces between English letters and numbers.'
  },
  'add-space-after-punctuation': {
    name: 'Add spaces after punctuation',
    description: 'Add spaces after English punctuation.'
  },
  'add-paragraph-indent': {
    name: 'Add paragraph indent',
    description: 'Add a two-space indent to each paragraph.'
  },
  'normalize-reference-numbering': {
    name: 'Normalize reference numbering',
    description: 'Convert a reference list to continuous [1], [2] numbering and keep one space after each number.'
  },
  'normalize-reference-author-case': {
    name: 'Capitalize reference author names',
    description: 'Capitalize recognizable English author names at the beginning of references while preserving initials.'
  },
  'normalize-reference-journal-case': {
    name: 'Capitalize reference journal names',
    description: 'Capitalize recognizable English journal names after [J] while preserving common abbreviations.'
  },
  'remove-reference-doi': {
    name: 'Remove reference DOI',
    description: 'Remove DOI, doi:, and doi.org links from reference lines.'
  },
  'translate-text': {
    name: 'Translate text',
    description: 'Translate text with the currently configured translation service.'
  }
};

const LARGE_MODEL_ENDPOINT = 'https://fanyi-api.baidu.com/ait/api/aiTextTranslate';
const HISTORY_STORAGE_KEY = 'processingHistory';

const exclusiveProcessorGroups = [
  {
    ids: ['delete-duplicate-newlines', 'delete-all-newlines'],
    preferredId: 'delete-duplicate-newlines'
  },
  {
    ids: ['remove-spaces-between-chinese', 'keep-english-word-spaces', 'delete-duplicate-spaces'],
    preferredId: 'keep-english-word-spaces'
  }
];

const config = ref<ProcessorConfig>({
  quickActions: normalizeQuickActions(undefined),
  processors: {},
  shortcuts: {
    processSelection: 'Ctrl+Shift+P',
    processClipboard: 'Ctrl+Shift+V',
    quickClean: 'Ctrl+Shift+C'
  },
  translation: {
    defaultEngine: 'baidu',
    apiKeys: {},
    defaultSourceLang: 'auto',
    defaultTargetLang: 'zh',
    autoTranslate: true,
    cacheEnabled: true,
    quotaBaseline: 0
  },
  ocr: {
    engine: 'tencent',
    model: 'general-basic',
    tencent: {
      secretId: '',
      secretKey: '',
      region: '',
      basicQuotaBaseline: 0,
      fastQuotaBaseline: 0,
      accurateMonthlyLimit: 0,
      accurateQuotaBaseline: 0,
      englishQuotaBaseline: 0
    }
  },
  ui: {
    theme: 'auto',
    skin: 'classic',
    language: 'zh-CN',
    showNotifications: true,
    autoProcessClipboard: false,
    floatingMenuEnabled: true,
    selectionAutomationEnabled: false,
    selectionAutoProcessEnabled: false,
    selectionAutoTranslateEnabled: false,
    selectionActionMaxLength: 1200,
    selectionAutoTranslateMaxLength: 1200,
    historyRetentionMode: 'count',
    historyRetentionCount: 50
  }
});
const prefersDark = ref(systemPrefersDark());
let stopWatchingSystemTheme: () => void = () => {};

const processors = ref<ProcessorOption[]>(allProcessors.map(p => ({
  id: p.id,
  name: p.name,
  description: p.description,
  isActive: p.isActive,
  priority: p.priority
})));
const quickActionRules = ref<CustomRule[]>([]);
const quickActionModal = ref(false);
const exportModal = ref(false);
const includeSensitiveCredentials = ref(false);
const quickActionDraft = ref<QuickActionConfig>(createQuickAction());
const quickActionError = ref('');

const baiduApiConfig = ref({
  appId: '',
  secretKey: '',
  domain: 'academic',
  quotaBaseline: 0,
  largeModelApiKey: '',
  largeModelEndpoint: LARGE_MODEL_ENDPOINT,
  largeModelModel: 'llm',
  largeModelAuthMode: 'api-key' as 'api-key' | 'sign',
  largeModelModelType: 'llm' as 'llm' | 'nmt',
  largeModelReference: '',
  largeModelNeedIntervene: false,
  largeModelTagHandling: false,
  largeModelIgnoreTags: '',
  largeModelRequestMode: 'baidu-translate' as 'baidu-translate' | 'openai-compatible',
  imageEndpoint: '',
  imageCuid: '',
  imageMac: '',
  imageQuotaBaseline: 0
});

const translationApiType = ref<TranslationApiType>('general');
const ocrConfig = ref({
  model: 'general-basic' as ProcessorConfig['ocr']['model'],
  secretId: '',
  secretKey: '',
  region: '',
  basicQuotaBaseline: 0,
  fastQuotaBaseline: 0,
  accurateMonthlyLimit: 0,
  accurateQuotaBaseline: 0,
  englishQuotaBaseline: 0
});
const ocrQuota = ref<any>(null);
const isSaving = ref(false);
const recentHistory = ref<HistoryPreview[]>([]);
const isClearingHistory = ref(false);
let instantSaveQueue: Promise<void> = Promise.resolve();

type UiLanguage = 'zh-CN' | 'en-US';

const optionMessages = {
  'zh-CN': {
    pageTitle: 'Clipboard Text Processor - 设置',
    generalTab: '通用设置',
    quickActionsTitle: '快速处理按钮',
    quickActionsTip: '前四个启用按钮会直接显示在插件弹窗中；其余按钮通过“更多”展开。按钮内按处理前规则、处理器、处理后规则执行。',
    addQuickAction: '添加快速处理',
    quickActionEditor: '快速处理按钮',
    quickActionName: '按钮名称',
    quickActionProcessors: '处理器',
    quickActionRules: '基础规则',
    quickActionOrderTip: '选中的项目会直接执行，不受全局启用状态影响。处理前规则、处理器、处理后规则分别按优先级升序执行。',
    processorCount: '个处理器',
    ruleCount: '条规则',
    invalidReferences: '个失效引用',
    noQuickActions: '暂无快速处理按钮',
    edit: '编辑',
    duplicate: '复制',
    delete: '删除',
    cancel: '取消',
    save: '保存',
    quickActionNameRequired: '按钮名称不能为空',
    quickActionFunctionRequired: '至少选择一个处理器或基础规则',
    quickActionDuplicate: '已存在功能配置相同的快速处理按钮',
    processorsTab: '处理器设置',
    shortcutsTab: '快捷键设置',
    translationTab: '翻译设置',
    ocrTab: 'OCR 文字识别',
    ocrModel: '识别模型',
    generalBasicOcr: '通用印刷体识别（基础版）',
    generalFastOcr: '通用印刷体识别（高速版）',
    generalAccurateOcr: '通用印刷体识别（高精度版）',
    englishOcr: '英文识别',
    generalBasicOcrDescription: '推荐默认使用。适合中英文网页截图、书籍和普通图片，返回逐行文字、坐标和置信度。',
    generalFastOcrDescription: '追求响应速度时使用，适合文字清晰、排版简单的截图。腾讯云将其列为旧版相关接口，新账号需确认控制台可调用。',
    generalAccurateOcrDescription: '适合小字、模糊、倾斜或复杂背景，效果通常最好，但需自行设置月调用上限以避免产生费用。',
    englishOcrDescription: '仅建议纯英文图片使用，针对英文印刷体优化；包含中文或多语言时请选择基础版或高精度版。',
    tencentSecretId: '腾讯云 SecretId',
    tencentSecretIdPlaceholder: '访问管理 > API 密钥管理中的 SecretId',
    tencentSecretKey: '腾讯云 SecretKey',
    tencentSecretKeyPlaceholder: '访问管理 > API 密钥管理中的 SecretKey',
    ocrRegion: '地域（可选）',
    basicExternalUsage: '基础版外部已用次数',
    fastExternalUsage: '高速版外部已用次数',
    accurateMonthlyLimit: '高精度版月调用上限',
    accurateExternalUsage: '高精度版外部已用次数',
    englishExternalUsage: '英文识别外部已用次数',
    ocrCredentialTip: '腾讯云密钥仅保存在当前浏览器扩展存储中。基础版按每月 1000 次额度在 95% 时停止调用；高精度版必须先填写月调用上限。测试配置会实际调用一次 OCR API。',
    testOcrConfig: '测试配置',
    refreshOcrQuota: '刷新额度',
    resetOcrQuota: '重置本地额度',
    currentOcrQuota: '当前额度',
    ocrQuotaRemaining: '保护阈值前剩余',
    ocrTestSucceeded: '腾讯云 OCR 配置有效。',
    ocrTestFailed: '腾讯云 OCR 配置测试失败',
    historyTab: '最近记录',
    theme: '主题',
    skin: '皮肤',
    language: '语言',
    showNotifications: '右键处理时显示通知',
    selectionAutomation: '划词自动化',
    selectionAutoProcess: '自动处理',
    selectionAutoTranslate: '自动翻译',
    selectionMaxLength: '划词操作最大长度',
    historyRetention: '保存期限',
    historyRetentionCount: '保存条数',
    historyRetentionDay: '一天',
    historyRetentionWeek: '一周',
    historyRetentionMonth: '一个月',
    historyRetentionRecent: '最近记录',
    refreshHistory: '刷新记录',
    clearHistory: '清空记录',
    emptyHistory: '暂无最近记录',
    historyCopied: '结果已复制',
    historyCopyFailed: '复制失败',
    clearHistoryFailed: '清空失败',
    clearHistoryReloading: '后台服务需要重新加载，最近记录已清空。请重新打开设置页确认。',
    clearHistoryConfirm: '确定要清空最近记录吗？',
    processSelection: '处理选中文字',
    processClipboard: '处理剪切板',
    quickClean: '快速清理',
    defaultEngine: '默认翻译引擎',
    apiType: 'API 类型',
    baiduAppId: '百度 APP ID',
    baiduAppIdPlaceholder: '开发者信息页面中的 APP ID',
    baiduSecretKey: '百度 Secret Key',
    baiduSecretKeyPlaceholder: '开发者信息页面中的密钥',
    translationDomain: '翻译领域',
    authMode: '鉴权方式',
    largeModelApiKey: '大模型 API Key',
    largeModelApiKeyPlaceholder: 'API Key 管理页面创建的 Key',
    endpoint: '请求地址',
    modelType: '模型类型',
    translationInstruction: '翻译指令',
    translationInstructionPlaceholder: '可选，如：使用学术风格来翻译',
    enableTerminology: '启用术语库',
    keepTags: '标签保持',
    ignoreTags: '忽略标签',
    ignoreTagsPlaceholder: '最多 20 个，逗号分隔，如 name,address',
    imageEndpoint: '图片接口地址',
    imageEndpointPlaceholder: '留空使用百度默认图片翻译接口',
    imageCuid: '图片 CUID',
    imageCuidPlaceholder: '留空时自动生成',
    imageMac: '图片 MAC',
    imageMacPlaceholder: '留空时使用默认值',
    imageQuotaBaseline: '图片外部用量',
    textQuotaBaseline: '文本外部用量',
    enableCache: '启用缓存',
    translationAutoTranslate: '自动翻译',
    sourceLanguage: '源语言',
    targetLanguage: '目标语言',
    translationCredentialTip: '通用、领域、图片翻译使用 APP ID + Secret Key；大模型文本翻译默认使用 APP ID + Bearer API Key。所有凭据只保存在当前浏览器扩展存储中，发布版不会内置任何密钥。插件会按本地记录在免费额度 95% 时停止调用。',
    saveSettings: '保存设置',
    resetDefaults: '重置默认',
    exportConfig: '导出配置',
    importConfig: '导入配置',
    safeExportTip: '默认导出不会包含 API Key、Secret 等认证凭据。导入该备份时，会保留当前浏览器中已有的凭据。',
    includeSensitiveCredentials: '包含敏感凭据',
    sensitiveExportWarning: '该文件将包含可用于访问第三方服务的凭据。请勿上传、提交到代码仓库或发送给不受信任的人。',
    sensitiveExportConfirm: '确认导出包含敏感凭据的配置文件？该文件泄露可能产生费用或数据风险。',
    followSystem: '跟随系统',
    light: '浅色',
    dark: '深色',
    detectLanguage: '检测语言',
    chinese: '中文',
    english: '英语',
    japanese: '日语',
    korean: '韩语',
    french: '法语',
    german: '德语',
    russian: '俄语',
    traditionalChinese: '繁体中文',
    spanish: '西班牙语',
    portuguese: '葡萄牙语',
    italian: '意大利语',
    vietnamese: '越南语',
    thai: '泰语',
    generalTextApi: '通用文本翻译 API（免费额度 100万字符）',
    largeModelTextApi: '大模型文本翻译 API（免费额度 100万字符）',
    domainTextApi: '领域文本翻译 API（免费额度 50万字符）',
    imageApi: '图片翻译 API（免费额度 1000次）',
    apiKeyAuthRecommended: 'API Key 鉴权（推荐）',
    signAuth: 'Sign 鉴权',
    llmTranslation: '大模型翻译 / llm',
    nmtTranslation: '机器翻译 / nmt',
    baiduTranslate: '百度翻译',
    googleTranslateTodo: '谷歌翻译（未实现）',
    deeplTodo: 'DeepL（未实现）',
    loadFailed: '加载设置失败',
    missingConfig: '后台没有返回设置',
    saveTimeout: '保存设置超时，请在扩展管理页重新加载插件后重试',
    missingSavedConfig: '后台未返回保存后的设置',
    saveSucceeded: '设置已保存',
    saveFailed: '设置保存失败',
    resetConfirm: '确定要重置为默认设置吗？',
    importSucceeded: '配置已导入',
    importFailed: '配置文件格式错误',
    domainAcademic: '学术论文 / academic',
    domainMedicine: '生物医药 / medicine',
    domainFinance: '金融财经 / finance',
    domainIt: '信息技术 / it',
    domainMachinery: '机械制造 / machinery',
    domainElectronics: '电子科技 / electronics',
    domainMechanics: '水利机械 / mechanics',
    domainNovel: '网络文学 / novel',
    domainNews: '新闻资讯 / news',
    domainWiki: '人文社科 / wiki',
    domainAerospace: '航空航天 / aerospace',
    domainLaw: '法律法规 / law',
    domainContract: '合同 / contract'
  },
  'en-US': {
    pageTitle: 'Clipboard Text Processor - Settings',
    generalTab: 'General',
    quickActionsTitle: 'Quick Action Buttons',
    quickActionsTip: 'The first four enabled actions appear in the popup. Remaining actions are shown under More. Execution order is before-rules, processors, then after-rules.',
    addQuickAction: 'Add quick action',
    quickActionEditor: 'Quick Action',
    quickActionName: 'Button name',
    quickActionProcessors: 'Processors',
    quickActionRules: 'Basic rules',
    quickActionOrderTip: 'Selected items run even when globally disabled. Before-rules, processors, and after-rules each run by ascending priority.',
    processorCount: 'processors',
    ruleCount: 'rules',
    invalidReferences: 'invalid references',
    noQuickActions: 'No quick actions',
    edit: 'Edit',
    duplicate: 'Duplicate',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    quickActionNameRequired: 'Button name is required',
    quickActionFunctionRequired: 'Select at least one processor or basic rule',
    quickActionDuplicate: 'A quick action with the same functions already exists',
    processorsTab: 'Processors',
    shortcutsTab: 'Shortcuts',
    translationTab: 'Translation',
    ocrTab: 'OCR',
    ocrModel: 'OCR model',
    generalBasicOcr: 'General Basic OCR',
    generalFastOcr: 'General Fast OCR',
    generalAccurateOcr: 'General Accurate OCR',
    englishOcr: 'English OCR',
    generalBasicOcrDescription: 'Recommended default for Chinese and English webpage screenshots, books, and ordinary images.',
    generalFastOcrDescription: 'Optimized for speed on clear, simple layouts. Tencent lists it as a legacy-related API; verify that your account can call it.',
    generalAccurateOcrDescription: 'Best for small, blurry, tilted, or complex text. Configure a monthly limit to control cost.',
    englishOcrDescription: 'Optimized for English-only printed text. Use Basic or Accurate OCR for Chinese or multilingual images.',
    tencentSecretId: 'Tencent SecretId',
    tencentSecretIdPlaceholder: 'SecretId from CAM > API Key Management',
    tencentSecretKey: 'Tencent SecretKey',
    tencentSecretKeyPlaceholder: 'SecretKey from CAM > API Key Management',
    ocrRegion: 'Region (optional)',
    basicExternalUsage: 'Basic external usage',
    fastExternalUsage: 'Fast external usage',
    accurateMonthlyLimit: 'Accurate monthly limit',
    accurateExternalUsage: 'Accurate external usage',
    englishExternalUsage: 'English external usage',
    ocrCredentialTip: 'Tencent credentials are stored only in this browser extension. Basic OCR stops at 95% of the monthly 1,000-call quota. Accurate OCR requires a monthly limit. Testing makes one OCR API call.',
    testOcrConfig: 'Test configuration',
    refreshOcrQuota: 'Refresh quota',
    resetOcrQuota: 'Reset local quota',
    currentOcrQuota: 'Current quota',
    ocrQuotaRemaining: 'remaining before protection limit',
    ocrTestSucceeded: 'Tencent OCR configuration is valid.',
    ocrTestFailed: 'Tencent OCR configuration failed',
    historyTab: 'Recent History',
    theme: 'Theme',
    skin: 'Skin',
    language: 'Language',
    showNotifications: 'Show notifications for context-menu actions',
    selectionAutomation: 'Selection automation',
    selectionAutoProcess: 'Auto process',
    selectionAutoTranslate: 'Auto translate',
    selectionMaxLength: 'Max selection length',
    historyRetention: 'Retention',
    historyRetentionCount: 'Items to keep',
    historyRetentionDay: '1 day',
    historyRetentionWeek: '1 week',
    historyRetentionMonth: '1 month',
    historyRetentionRecent: 'Recent records',
    refreshHistory: 'Refresh',
    clearHistory: 'Clear history',
    emptyHistory: 'No recent history',
    historyCopied: 'Result copied',
    historyCopyFailed: 'Copy failed',
    clearHistoryFailed: 'Clear failed',
    clearHistoryReloading: 'The background service needs to reload. Recent history has been cleared. Reopen settings to confirm.',
    clearHistoryConfirm: 'Clear recent history?',
    processSelection: 'Process selection',
    processClipboard: 'Process clipboard',
    quickClean: 'Quick clean',
    defaultEngine: 'Default engine',
    apiType: 'API type',
    baiduAppId: 'Baidu APP ID',
    baiduAppIdPlaceholder: 'APP ID from the developer console',
    baiduSecretKey: 'Baidu Secret Key',
    baiduSecretKeyPlaceholder: 'Secret key from the developer console',
    translationDomain: 'Domain',
    authMode: 'Auth mode',
    largeModelApiKey: 'Large model API Key',
    largeModelApiKeyPlaceholder: 'Key created in API Key management',
    endpoint: 'Endpoint',
    modelType: 'Model type',
    translationInstruction: 'Instruction',
    translationInstructionPlaceholder: 'Optional, for example: translate in an academic style',
    enableTerminology: 'Enable glossary',
    keepTags: 'Keep tags',
    ignoreTags: 'Ignored tags',
    ignoreTagsPlaceholder: 'Up to 20, comma-separated, e.g. name,address',
    imageEndpoint: 'Image endpoint',
    imageEndpointPlaceholder: 'Leave empty to use the default Baidu image translation endpoint',
    imageCuid: 'Image CUID',
    imageCuidPlaceholder: 'Generated automatically when empty',
    imageMac: 'Image MAC',
    imageMacPlaceholder: 'Use default value when empty',
    imageQuotaBaseline: 'External image quota',
    textQuotaBaseline: 'External text quota',
    enableCache: 'Enable cache',
    translationAutoTranslate: 'Auto translate',
    sourceLanguage: 'Source language',
    targetLanguage: 'Target language',
    translationCredentialTip: 'General, domain, and image translation use APP ID + Secret Key. Large-model text translation uses APP ID + Bearer API Key by default. Credentials are stored only in this browser extension storage and are not bundled in releases. The extension stops calling APIs at 95% of the locally tracked free quota.',
    saveSettings: 'Save settings',
    resetDefaults: 'Reset defaults',
    exportConfig: 'Export config',
    importConfig: 'Import config',
    safeExportTip: 'Credentials such as API keys and secrets are excluded by default. Importing this backup preserves credentials already stored in this browser.',
    includeSensitiveCredentials: 'Include sensitive credentials',
    sensitiveExportWarning: 'This file will contain credentials that can access third-party services. Do not upload it, commit it, or share it with untrusted people.',
    sensitiveExportConfirm: 'Export a config file containing sensitive credentials? A leaked file may cause charges or data exposure.',
    followSystem: 'Follow system',
    light: 'Light',
    dark: 'Dark',
    detectLanguage: 'Detect language',
    chinese: 'Chinese',
    english: 'English',
    japanese: 'Japanese',
    korean: 'Korean',
    french: 'French',
    german: 'German',
    russian: 'Russian',
    traditionalChinese: 'Traditional Chinese',
    spanish: 'Spanish',
    portuguese: 'Portuguese',
    italian: 'Italian',
    vietnamese: 'Vietnamese',
    thai: 'Thai',
    generalTextApi: 'General text translation API (free quota: 1M characters)',
    largeModelTextApi: 'Large-model text translation API (free quota: 1M characters)',
    domainTextApi: 'Domain text translation API (free quota: 500K characters)',
    imageApi: 'Image translation API (free quota: 1000 calls)',
    apiKeyAuthRecommended: 'API Key auth (recommended)',
    signAuth: 'Sign auth',
    llmTranslation: 'Large-model translation / llm',
    nmtTranslation: 'Machine translation / nmt',
    baiduTranslate: 'Baidu Translate',
    googleTranslateTodo: 'Google Translate (not implemented)',
    deeplTodo: 'DeepL (not implemented)',
    loadFailed: 'Failed to load settings',
    missingConfig: 'Background did not return settings',
    saveTimeout: 'Saving settings timed out. Reload the extension in the extensions page and try again.',
    missingSavedConfig: 'Background did not return saved settings',
    saveSucceeded: 'Settings saved',
    saveFailed: 'Failed to save settings',
    resetConfirm: 'Reset settings to defaults?',
    importSucceeded: 'Config imported',
    importFailed: 'Invalid config file format',
    domainAcademic: 'Academic papers / academic',
    domainMedicine: 'Biomedical / medicine',
    domainFinance: 'Finance / finance',
    domainIt: 'Information technology / it',
    domainMachinery: 'Machinery manufacturing / machinery',
    domainElectronics: 'Electronics / electronics',
    domainMechanics: 'Water conservancy machinery / mechanics',
    domainNovel: 'Online literature / novel',
    domainNews: 'News / news',
    domainWiki: 'Humanities and social sciences / wiki',
    domainAerospace: 'Aerospace / aerospace',
    domainLaw: 'Law / law',
    domainContract: 'Contracts / contract'
  }
} as const;

const currentLanguage = computed<UiLanguage>(() =>
  config.value.ui.language === 'en-US' ? 'en-US' : 'zh-CN'
);
const uiText = computed(() => optionMessages[currentLanguage.value]);
const activeSkin = computed(() => normalizeSkin(config.value.ui.skin));
const resolvedTheme = computed(() => resolveTheme(
  activeSkin.value,
  normalizeTheme(config.value.ui.theme),
  prefersDark.value
));
const naiveTheme = computed(() => resolvedTheme.value === 'dark' ? darkTheme : null);
const naiveThemeOverrides = computed(() => getThemeOverrides(activeSkin.value, resolvedTheme.value));

function getProcessorName(processor: ProcessorOption): string {
  return currentLanguage.value === 'en-US'
    ? englishProcessorText[processor.id]?.name || processor.name
    : processor.name;
}

function getProcessorDescription(processor: ProcessorOption): string {
  return currentLanguage.value === 'en-US'
    ? englishProcessorText[processor.id]?.description || processor.description
    : processor.description;
}

const needsSecretKey = computed(() =>
  translationApiType.value !== 'large-model' || baiduApiConfig.value.largeModelAuthMode === 'sign'
);

const themeOptions = computed(() => [
  { label: uiText.value.followSystem, value: 'auto' },
  { label: uiText.value.light, value: 'light' },
  { label: uiText.value.dark, value: 'dark' }
]);

const skinSelectOptions = computed(() => skinOptions.map(option => ({
  label: option.value === 'sunflower'
    ? (currentLanguage.value === 'en-US' ? 'Botanical Manuscript' : '植物手稿')
    : (currentLanguage.value === 'en-US' ? 'Classic' : '经典'),
  value: option.value
})));

const historyRetentionOptions = computed(() => [
  { label: uiText.value.historyRetentionDay, value: 'day' },
  { label: uiText.value.historyRetentionWeek, value: 'week' },
  { label: uiText.value.historyRetentionMonth, value: 'month' },
  { label: uiText.value.historyRetentionRecent, value: 'count' }
]);

const languageOptions = [
  { label: '中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
];

const translationSourceLanguageOptions = computed(() => [
  { label: uiText.value.detectLanguage, value: 'auto' },
  { label: uiText.value.chinese, value: 'zh' },
  { label: uiText.value.english, value: 'en' },
  { label: uiText.value.japanese, value: 'jp' },
  { label: uiText.value.korean, value: 'kor' },
  { label: uiText.value.french, value: 'fra' },
  { label: uiText.value.german, value: 'de' },
  { label: uiText.value.russian, value: 'ru' },
  { label: uiText.value.traditionalChinese, value: 'cht' },
  { label: uiText.value.spanish, value: 'spa' },
  { label: uiText.value.portuguese, value: 'pt' },
  { label: uiText.value.italian, value: 'it' },
  { label: uiText.value.vietnamese, value: 'vie' },
  { label: uiText.value.thai, value: 'th' }
]);

const translationTargetLanguageOptions = computed(() => translationSourceLanguageOptions.value.filter(
  option => option.value !== 'auto'
));

const translationApiOptions = computed(() => [
  { label: uiText.value.generalTextApi, value: 'general' },
  { label: uiText.value.largeModelTextApi, value: 'large-model' },
  { label: uiText.value.domainTextApi, value: 'domain' },
  { label: uiText.value.imageApi, value: 'image' }
]);

const fieldDomainOptions = computed(() => [
  { label: uiText.value.domainAcademic, value: 'academic' },
  { label: uiText.value.domainMedicine, value: 'medicine' },
  { label: uiText.value.domainFinance, value: 'finance' },
  { label: uiText.value.domainIt, value: 'it' },
  { label: uiText.value.domainMachinery, value: 'machinery' },
  { label: uiText.value.domainElectronics, value: 'electronics' },
  { label: uiText.value.domainMechanics, value: 'mechanics' },
  { label: uiText.value.domainNovel, value: 'novel' },
  { label: uiText.value.domainNews, value: 'news' },
  { label: uiText.value.domainWiki, value: 'wiki' },
  { label: uiText.value.domainAerospace, value: 'aerospace' },
  { label: uiText.value.domainLaw, value: 'law' },
  { label: uiText.value.domainContract, value: 'contract' }
]);

const largeModelAuthModeOptions = computed(() => [
  { label: uiText.value.apiKeyAuthRecommended, value: 'api-key' },
  { label: uiText.value.signAuth, value: 'sign' }
]);

const largeModelModelTypeOptions = computed(() => [
  { label: uiText.value.llmTranslation, value: 'llm' },
  { label: uiText.value.nmtTranslation, value: 'nmt' }
]);

const engineOptions = computed(() => [
  { label: uiText.value.baiduTranslate, value: 'baidu' },
  { label: uiText.value.googleTranslateTodo, value: 'google' },
  { label: uiText.value.deeplTodo, value: 'deepl' }
]);

const ocrModelOptions = computed(() => [
  { label: uiText.value.generalBasicOcr, value: 'general-basic' },
  { label: uiText.value.generalFastOcr, value: 'general-fast' },
  { label: uiText.value.generalAccurateOcr, value: 'general-accurate' },
  { label: uiText.value.englishOcr, value: 'english' }
]);

const selectedOcrModelDescription = computed(() => ({
  'general-basic': uiText.value.generalBasicOcrDescription,
  'general-fast': uiText.value.generalFastOcrDescription,
  'general-accurate': uiText.value.generalAccurateOcrDescription,
  english: uiText.value.englishOcrDescription
}[ocrConfig.value.model]));

const quickActionPresetLabels = computed<Record<QuickActionPresetName, string>>(() => currentLanguage.value === 'en-US'
  ? {
      'clean-all': 'Clean all',
      'full-to-half': 'Full-width to half-width',
      'remove-refs': 'Remove references',
      'add-space': 'Add Chinese-English spacing'
    }
  : {
      'clean-all': '一键清理',
      'full-to-half': '全角转半角',
      'remove-refs': '删除引用',
      'add-space': '中英加空格'
    });
const quickActionProcessorOptions = computed(() => processors.value.map(processor => ({
  label: getProcessorName(processor),
  value: processor.id
})));
const quickActionRuleOptions = computed(() => quickActionRules.value.map(rule => ({
  label: `${rule.name} (${rule.stage === 'after-processors' ? (currentLanguage.value === 'en-US' ? 'after' : '处理后') : (currentLanguage.value === 'en-US' ? 'before' : '处理前')})`,
  value: rule.id
})));
const quickActionPresetPlaceholder = computed(() => quickActionDraft.value.presetName
  ? quickActionPresetLabels.value[quickActionDraft.value.presetName]
  : '');

onMounted(() => {
  stopWatchingSystemTheme = watchSystemTheme(isDark => {
    prefersDark.value = isDark;
  });
  chrome.storage.onChanged.addListener(handleQuickActionStorageChange);
  void Promise.all([loadConfig(), loadHistory(), loadQuickActionRules()]).catch(error => {
    alert(`${uiText.value.loadFailed}: ${getErrorMessage(error)}`);
  });
});
onUnmounted(() => {
  stopWatchingSystemTheme();
  chrome.storage.onChanged.removeListener?.(handleQuickActionStorageChange);
});

function handleQuickActionStorageChange(changes: Record<string, chrome.storage.StorageChange>, areaName: string) {
  if (areaName === 'local' && changes.customRules) {
    quickActionRules.value = Array.isArray(changes.customRules.newValue) ? changes.customRules.newValue : [];
  }
}

async function loadQuickActionRules() {
  const response = await sendRuntimeMessage<{ rules?: CustomRule[] }>({ type: 'GET_CUSTOM_RULES' }, { timeoutMs: 10000 });
  quickActionRules.value = response.rules || [];
}

async function loadConfig() {
  const response = await sendRuntimeMessage<{ config?: ProcessorConfig }>({ type: 'GET_CONFIG' }, {
    timeoutMs: 10000
  });
  if (!response?.config) {
    throw new Error(uiText.value.missingConfig);
  }

  applyLoadedConfig(response.config);
}

async function saveConfig() {
  if (isSaving.value) {
    return;
  }

  isSaving.value = true;
  try {
    await instantSaveQueue;
    syncProcessorConfig();
    syncSelectionAutomationConfig();
    syncBaiduApiConfig();
    syncOcrConfig();
    const response = await sendRuntimeMessage<{ config?: ProcessorConfig }>({
      type: 'SAVE_CONFIG',
      config: config.value
    }, {
      timeoutMs: 10000,
      timeoutMessage: uiText.value.saveTimeout
    });

    if (!response.config) {
      throw new Error(uiText.value.missingSavedConfig);
    }

    applyLoadedConfig(response.config);
    await loadHistory();
    alert(uiText.value.saveSucceeded);
  } catch (error) {
    alert(`${uiText.value.saveFailed}: ${getErrorMessage(error)}`);
  } finally {
    isSaving.value = false;
  }
}

function updateUiSetting<K extends keyof ProcessorConfig['ui']>(
  key: K,
  value: ProcessorConfig['ui'][K]
) {
  Object.assign(config.value.ui, { [key]: value });
  enqueueConfigPatch({ ui: { [key]: value } as Partial<ProcessorConfig['ui']> });
}

function updateSelectionMaxLength(value: number | null) {
  const maxLength = value ?? defaultConfig.ui.selectionActionMaxLength ?? 1200;
  config.value.ui.selectionActionMaxLength = maxLength;
  config.value.ui.selectionAutoTranslateMaxLength = maxLength;
  enqueueConfigPatch({
    ui: {
      selectionActionMaxLength: maxLength,
      selectionAutoTranslateMaxLength: maxLength
    }
  });
}

function quickActionName(action: QuickActionConfig): string {
  return action.name || (action.presetName ? quickActionPresetLabels.value[action.presetName] : action.id);
}

function editQuickAction(action?: QuickActionConfig) {
  quickActionDraft.value = action
    ? { ...action, processorIds: [...action.processorIds], customRuleIds: [...action.customRuleIds] }
    : createQuickAction();
  quickActionError.value = '';
  quickActionModal.value = true;
}

function duplicateQuickAction(action: QuickActionConfig) {
  const draft = createQuickAction();
  quickActionDraft.value = {
    ...draft,
    name: `${quickActionName(action)} ${currentLanguage.value === 'en-US' ? 'Copy' : '副本'}`,
    processorIds: [...action.processorIds],
    customRuleIds: [...action.customRuleIds]
  };
  quickActionError.value = '';
  quickActionModal.value = true;
}

function commitQuickAction() {
  const draft = normalizeQuickActionProcessorSelection({
    ...quickActionDraft.value,
    name: quickActionDraft.value.name?.trim(),
    processorIds: [...quickActionDraft.value.processorIds],
    customRuleIds: [...quickActionDraft.value.customRuleIds]
  });
  if (!draft.name && !draft.presetName) {
    quickActionError.value = uiText.value.quickActionNameRequired;
    return;
  }
  if (draft.processorIds.length === 0 && draft.customRuleIds.length === 0) {
    quickActionError.value = uiText.value.quickActionFunctionRequired;
    return;
  }
  const signature = quickActionSignature(draft);
  if (config.value.quickActions.some(action => action.id !== draft.id && quickActionSignature(action) === signature)) {
    quickActionError.value = uiText.value.quickActionDuplicate;
    return;
  }

  const index = config.value.quickActions.findIndex(action => action.id === draft.id);
  if (index >= 0) config.value.quickActions.splice(index, 1, draft);
  else config.value.quickActions.push(draft);
  quickActionModal.value = false;
  saveQuickActions();
}

function normalizeQuickActionProcessorSelection(action: QuickActionConfig): QuickActionConfig {
  const selected = [...action.processorIds];
  exclusiveProcessorGroups.forEach(group => {
    const groupSelections = selected.filter(id => group.ids.includes(id));
    if (groupSelections.length <= 1) return;
    const idToKeep = groupSelections[groupSelections.length - 1];
    group.ids.forEach(id => {
      if (id !== idToKeep) {
        const index = selected.indexOf(id);
        if (index >= 0) selected.splice(index, 1);
      }
    });
  });
  return { ...action, processorIds: selected };
}

function quickActionSignature(action: QuickActionConfig): string {
  return JSON.stringify({
    processors: [...action.processorIds].sort(),
    rules: [...action.customRuleIds].sort()
  });
}

function deleteQuickAction(id: string) {
  config.value.quickActions = config.value.quickActions.filter(action => action.id !== id);
  saveQuickActions();
}

function moveQuickAction(index: number, offset: -1 | 1) {
  const target = index + offset;
  if (target < 0 || target >= config.value.quickActions.length) return;
  const [action] = config.value.quickActions.splice(index, 1);
  config.value.quickActions.splice(target, 0, action);
  saveQuickActions();
}

function missingQuickActionReferences(action: QuickActionConfig): number {
  const processorIds = new Set(allProcessors.map(processor => processor.id));
  const ruleIds = new Set(quickActionRules.value.map(rule => rule.id));
  return action.processorIds.filter(id => !processorIds.has(id)).length +
    action.customRuleIds.filter(id => !ruleIds.has(id)).length;
}

function saveQuickActions() {
  config.value.quickActions = normalizeQuickActions(config.value.quickActions);
  enqueueConfigPatch({ quickActions: config.value.quickActions });
}

function updateTranslationSetting<K extends InstantTranslationSetting>(
  key: K,
  value: ProcessorConfig['translation'][K]
) {
  Object.assign(config.value.translation, { [key]: value });
  enqueueConfigPatch({
    translation: { [key]: value } as Partial<Omit<ProcessorConfig['translation'], 'apiKeys'>>
  });
}

function enqueueConfigPatch(patch: ProcessorConfigPatch) {
  const patchSnapshot = JSON.parse(JSON.stringify(patch)) as ProcessorConfigPatch;
  instantSaveQueue = instantSaveQueue
    .catch(() => undefined)
    .then(async () => {
      await sendRuntimeMessage<{ config?: ProcessorConfig }>({
        type: 'UPDATE_CONFIG',
        patch: patchSnapshot
      }, {
        timeoutMs: 10000,
        timeoutMessage: uiText.value.saveTimeout
      });
    })
    .catch(error => {
      alert(`${uiText.value.saveFailed}: ${getErrorMessage(error)}`);
    });
}

function resetConfig() {
  if (!confirm(uiText.value.resetConfirm)) {
    return;
  }

  config.value = normalizeConfig(cloneConfig(defaultConfig));
  processors.value = allProcessors.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    isActive: p.isActive,
    priority: p.priority
  }));
  loadBaiduConfig(config.value);
  loadOcrConfig(config.value);
  normalizeExclusiveProcessors();
}

async function loadHistory() {
  const response = await sendRuntimeMessage<{ history?: any[] }>({ type: 'GET_HISTORY', limit: 100 }, {
    timeoutMs: 10000
  });
  recentHistory.value = (response.history || []).map(entry => ({
    id: entry.id,
    preview: createPreview(entry.processedText),
    timestamp: entry.timestamp,
    text: entry.processedText
  }));
}

async function copyHistoryItem(item: HistoryPreview) {
  try {
    await navigator.clipboard.writeText(item.text);
    alert(uiText.value.historyCopied);
  } catch (error) {
    alert(`${uiText.value.historyCopyFailed}: ${getErrorMessage(error)}`);
  }
}

async function clearHistory() {
  if (!confirm(uiText.value.clearHistoryConfirm)) {
    return;
  }

  isClearingHistory.value = true;
  try {
    await sendRuntimeMessage({ type: 'CLEAR_HISTORY' }, {
      timeoutMs: 10000
    });
    recentHistory.value = [];
    await loadHistory();
  } catch (error) {
    if (isUnknownMessageError(error)) {
      await clearStoredHistoryDirectly();
      recentHistory.value = [];
      alert(uiText.value.clearHistoryReloading);
      chrome.runtime.reload();
      return;
    }

    alert(`${uiText.value.clearHistoryFailed}: ${getErrorMessage(error)}`);
  } finally {
    isClearingHistory.value = false;
  }
}

async function clearStoredHistoryDirectly() {
  await chrome.storage.local.set({ [HISTORY_STORAGE_KEY]: [] });
}

function isUnknownMessageError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return message.includes('未知消息类型') || message.includes('Unknown message type');
}

function createPreview(text: string): string {
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

function formatHistoryTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(currentLanguage.value);
}

function normalizeConfig(rawConfig: Partial<ProcessorConfig>): ProcessorConfig {
  const selectionAutomationEnabled = rawConfig.ui?.selectionAutomationEnabled ??
    rawConfig.ui?.selectionAutoTranslateEnabled ??
    defaultConfig.ui.selectionAutomationEnabled;
  const selectionActionMaxLength = rawConfig.ui?.selectionActionMaxLength ??
    rawConfig.ui?.selectionAutoTranslateMaxLength ??
    defaultConfig.ui.selectionActionMaxLength;

  return {
    ...defaultConfig,
    ...rawConfig,
    quickActions: normalizeQuickActions(rawConfig.quickActions),
    processors: {
      ...defaultConfig.processors,
      ...rawConfig.processors
    },
    shortcuts: {
      ...defaultConfig.shortcuts,
      ...rawConfig.shortcuts
    },
    translation: {
      ...defaultConfig.translation,
      ...rawConfig.translation,
      apiKeys: {
        ...defaultConfig.translation.apiKeys,
        ...rawConfig.translation?.apiKeys
      },
      autoTranslate: rawConfig.translation?.autoTranslate ?? defaultConfig.translation.autoTranslate,
      cacheEnabled: rawConfig.translation?.cacheEnabled ?? defaultConfig.translation.cacheEnabled,
      quotaBaseline: rawConfig.translation?.quotaBaseline ?? defaultConfig.translation.quotaBaseline
    },
    ui: {
      ...defaultConfig.ui,
      ...rawConfig.ui,
      selectionAutomationEnabled,
      selectionAutoProcessEnabled: rawConfig.ui?.selectionAutoProcessEnabled ?? defaultConfig.ui.selectionAutoProcessEnabled,
      selectionAutoTranslateEnabled: rawConfig.ui?.selectionAutoTranslateEnabled ?? defaultConfig.ui.selectionAutoTranslateEnabled,
      selectionActionMaxLength,
      selectionAutoTranslateMaxLength: rawConfig.ui?.selectionAutoTranslateMaxLength ??
        selectionActionMaxLength ??
        defaultConfig.ui.selectionAutoTranslateMaxLength,
      historyRetentionMode: rawConfig.ui?.historyRetentionMode ?? defaultConfig.ui.historyRetentionMode,
      historyRetentionCount: rawConfig.ui?.historyRetentionCount ?? defaultConfig.ui.historyRetentionCount,
      skin: normalizeSkin(rawConfig.ui?.skin)
    }
  };
}

function applyLoadedConfig(loadedConfig: Partial<ProcessorConfig>) {
  config.value = normalizeConfig(loadedConfig);
  loadBaiduConfig(config.value);
  loadOcrConfig(config.value);
  applyConfigToProcessors();
}

function loadOcrConfig(currentConfig: ProcessorConfig) {
  const tencent = currentConfig.ocr.tencent;
  ocrConfig.value = {
    model: currentConfig.ocr.model,
    secretId: tencent?.secretId || '',
    secretKey: tencent?.secretKey || '',
    region: tencent?.region || '',
    basicQuotaBaseline: Number(tencent?.basicQuotaBaseline || 0),
    fastQuotaBaseline: Number(tencent?.fastQuotaBaseline || 0),
    accurateMonthlyLimit: Number(tencent?.accurateMonthlyLimit || 0),
    accurateQuotaBaseline: Number(tencent?.accurateQuotaBaseline || 0),
    englishQuotaBaseline: Number(tencent?.englishQuotaBaseline || 0)
  };
}

function syncOcrConfig() {
  config.value.ocr = {
    engine: 'tencent',
    model: ocrConfig.value.model,
    tencent: {
      secretId: ocrConfig.value.secretId.trim(),
      secretKey: ocrConfig.value.secretKey.trim(),
      region: ocrConfig.value.region.trim(),
      basicQuotaBaseline: ocrConfig.value.basicQuotaBaseline,
      fastQuotaBaseline: ocrConfig.value.fastQuotaBaseline,
      accurateMonthlyLimit: ocrConfig.value.accurateMonthlyLimit,
      accurateQuotaBaseline: ocrConfig.value.accurateQuotaBaseline,
      englishQuotaBaseline: ocrConfig.value.englishQuotaBaseline
    }
  };
}

async function testOcrSettings() {
  syncOcrConfig();
  try {
    await sendRuntimeMessage({ type: 'TEST_OCR_CONFIG', config: config.value.ocr }, { timeoutMs: 10000 });
    alert(uiText.value.ocrTestSucceeded);
  } catch (error) {
    alert(`${uiText.value.ocrTestFailed}: ${getErrorMessage(error)}`);
  }
}

async function loadOcrQuota() {
  syncOcrConfig();
  const response = await sendRuntimeMessage<any>({
    type: 'GET_OCR_QUOTA',
    model: ocrConfig.value.model
  }, { timeoutMs: 10000 });
  ocrQuota.value = response.quota;
}

async function resetOcrQuotaUsage() {
  await sendRuntimeMessage({ type: 'RESET_OCR_QUOTA', model: ocrConfig.value.model }, { timeoutMs: 10000 });
  await loadOcrQuota();
}

function cloneConfig(source: ProcessorConfig): ProcessorConfig {
  return JSON.parse(JSON.stringify(source)) as ProcessorConfig;
}

function loadBaiduConfig(currentConfig: ProcessorConfig) {
  const baidu = currentConfig.translation.apiKeys.baidu;
  baiduApiConfig.value = {
    appId: baidu?.appId || '',
    secretKey: baidu?.secretKey || '',
    domain: baidu?.domain || 'academic',
    quotaBaseline: Number(baidu?.quotaBaseline ?? currentConfig.translation.quotaBaseline ?? 0),
    largeModelApiKey: baidu?.largeModelApiKey || '',
    largeModelEndpoint: baidu?.largeModelEndpoint || LARGE_MODEL_ENDPOINT,
    largeModelModel: baidu?.largeModelModel || 'llm',
    largeModelAuthMode: baidu?.largeModelAuthMode || 'api-key',
    largeModelModelType: baidu?.largeModelModelType || 'llm',
    largeModelReference: baidu?.largeModelReference || '',
    largeModelNeedIntervene: Boolean(baidu?.largeModelNeedIntervene),
    largeModelTagHandling: Boolean(baidu?.largeModelTagHandling),
    largeModelIgnoreTags: baidu?.largeModelIgnoreTags || '',
    largeModelRequestMode: baidu?.largeModelRequestMode || 'baidu-translate',
    imageEndpoint: baidu?.imageEndpoint || '',
    imageCuid: baidu?.imageCuid || '',
    imageMac: baidu?.imageMac || '',
    imageQuotaBaseline: Number(baidu?.imageQuotaBaseline ?? 0)
  };
  translationApiType.value = baidu?.apiType || 'general';
}

function applyConfigToProcessors() {
  processors.value.forEach(processor => {
    const saved = config.value.processors[processor.id];
    if (saved) {
      processor.isActive = saved.isActive;
      processor.priority = saved.priority;
    }
  });
  normalizeExclusiveProcessors();
}

function syncProcessorConfig() {
  config.value.processors = processors.value.reduce<ProcessorConfig['processors']>((processorConfig, processor) => {
    processorConfig[processor.id] = {
      isActive: processor.isActive,
      priority: processor.priority
    };
    return processorConfig;
  }, {});
}

function syncBaiduApiConfig() {
  config.value.translation.apiKeys = {
    ...config.value.translation.apiKeys,
    baidu: {
      appId: baiduApiConfig.value.appId.trim(),
      secretKey: baiduApiConfig.value.secretKey.trim(),
      apiType: translationApiType.value,
      domain: baiduApiConfig.value.domain,
      quotaBaseline: baiduApiConfig.value.quotaBaseline,
      largeModelApiKey: baiduApiConfig.value.largeModelApiKey.trim(),
      largeModelEndpoint: (baiduApiConfig.value.largeModelEndpoint || LARGE_MODEL_ENDPOINT).trim(),
      largeModelModel: baiduApiConfig.value.largeModelModel.trim(),
      largeModelAuthMode: baiduApiConfig.value.largeModelAuthMode,
      largeModelModelType: baiduApiConfig.value.largeModelModelType,
      largeModelReference: baiduApiConfig.value.largeModelReference.trim(),
      largeModelNeedIntervene: baiduApiConfig.value.largeModelNeedIntervene,
      largeModelTagHandling: baiduApiConfig.value.largeModelTagHandling,
      largeModelIgnoreTags: baiduApiConfig.value.largeModelIgnoreTags.trim(),
      largeModelRequestMode: baiduApiConfig.value.largeModelRequestMode,
      imageEndpoint: baiduApiConfig.value.imageEndpoint.trim(),
      imageCuid: baiduApiConfig.value.imageCuid.trim(),
      imageMac: baiduApiConfig.value.imageMac.trim(),
      imageQuotaBaseline: baiduApiConfig.value.imageQuotaBaseline
    }
  };

  config.value.translation.quotaBaseline = baiduApiConfig.value.quotaBaseline;

  if (config.value.translation.defaultTargetLang === 'auto') {
    config.value.translation.defaultTargetLang = 'zh';
  }
}

function syncSelectionAutomationConfig() {
  const maxLength = config.value.ui.selectionActionMaxLength ??
    config.value.ui.selectionAutoTranslateMaxLength ??
    defaultConfig.ui.selectionActionMaxLength;

  config.value.ui.selectionActionMaxLength = maxLength;
  config.value.ui.selectionAutoTranslateMaxLength = maxLength;
  config.value.ui.historyRetentionMode = config.value.ui.historyRetentionMode ?? defaultConfig.ui.historyRetentionMode;
  config.value.ui.historyRetentionCount = Math.max(
    1,
    Math.min(100, config.value.ui.historyRetentionCount ?? defaultConfig.ui.historyRetentionCount ?? 50)
  );
}

function normalizeExclusiveProcessors() {
  exclusiveProcessorGroups.forEach(group => {
    const activeProcessors = processors.value.filter(processor =>
      group.ids.includes(processor.id) && processor.isActive
    );
    if (activeProcessors.length <= 1) return;

    const preferredActiveProcessor = activeProcessors.find(processor => processor.id === group.preferredId);
    const processorIdToKeep = preferredActiveProcessor?.id ?? activeProcessors[0].id;
    processors.value.forEach(processor => {
      if (group.ids.includes(processor.id) && processor.id !== processorIdToKeep) {
        processor.isActive = false;
      }
    });
  });
}

function onProcessorToggle(processor: ProcessorOption, checked: boolean) {
  processor.isActive = checked;

  const exclusiveGroup = exclusiveProcessorGroups.find(group => group.ids.includes(processor.id));
  if (checked && exclusiveGroup) {
    processors.value.forEach(otherProcessor => {
      if (exclusiveGroup.ids.includes(otherProcessor.id) && otherProcessor.id !== processor.id) {
        otherProcessor.isActive = false;
      }
    });
  }

  saveProcessorSettings();
}

function saveProcessorSettings() {
  syncProcessorConfig();
  enqueueConfigPatch({ processors: config.value.processors });
}

function exportConfig() {
  includeSensitiveCredentials.value = false;
  exportModal.value = true;
}

function confirmConfigExport() {
  if (includeSensitiveCredentials.value && !confirm(uiText.value.sensitiveExportConfirm)) {
    return;
  }
  syncProcessorConfig();
  syncSelectionAutomationConfig();
  syncBaiduApiConfig();
  syncOcrConfig();
  const backup = createConfigBackup(config.value, includeSensitiveCredentials.value);
  const dataStr = JSON.stringify(backup, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getConfigBackupFilename(includeSensitiveCredentials.value);
  link.click();
  URL.revokeObjectURL(url);
  exportModal.value = false;
}

function importConfig() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const imported = parseConfigBackup(loadEvent.target?.result as string, config.value);
        applyLoadedConfig(imported);
        alert(uiText.value.importSucceeded);
      } catch {
        alert(uiText.value.importFailed);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
</script>

<style scoped>
.options-container {
  min-height: 100vh;
  max-width: 1040px;
  margin: 0 auto;
  padding: 24px;
  color: var(--ctp-text);
  background: transparent;
}

.options-header {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 62px;
  margin-bottom: 18px;
  padding: 14px 22px;
  overflow: hidden;
  border: 1px solid var(--ctp-border);
  border-left: 3px solid var(--ctp-secondary);
  border-radius: 9px;
  background: var(--ctp-surface);
  box-shadow: var(--ctp-shadow);
}

.options-header h1 {
  position: relative;
  z-index: 1;
  margin: 0;
  color: var(--ctp-text);
  font-size: 22px;
}

.field-note-form,
.options-container :deep(.n-tab-pane) > .n-form {
  padding: 18px 20px 8px;
  border: 1px solid var(--ctp-border);
  border-top: 2px solid var(--ctp-border-strong);
  border-radius: 8px;
  background: var(--ctp-surface);
  box-shadow: var(--ctp-shadow);
}

.theme-setting {
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(520px, 100%);
}

.theme-setting :deep(.n-select) {
  min-width: 0;
  flex: 1;
}

.appearance-help {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--ctp-border);
  border-radius: 50%;
  background: var(--ctp-surface-clean);
  color: var(--ctp-text-muted);
  cursor: help;
  font-size: 12px;
  font-weight: 700;
  line-height: 22px;
}

.appearance-help:hover,
.appearance-help:focus-visible {
  border-color: var(--ctp-secondary);
  color: var(--ctp-secondary);
  outline: 2px solid color-mix(in srgb, var(--ctp-secondary) 18%, transparent);
  outline-offset: 2px;
}

.skin-gallery {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  width: min(620px, 100%);
}

.skin-card {
  display: grid;
  gap: 5px;
  padding: 10px;
  border: 1px solid var(--ctp-border);
  border-radius: 8px;
  background: var(--ctp-surface-clean);
  color: var(--ctp-text);
  cursor: pointer;
  text-align: left;
}

.skin-card:hover,
.skin-card.active {
  border-color: var(--ctp-secondary);
}

.skin-card.active {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ctp-secondary) 18%, transparent);
}

.skin-card__preview {
  display: grid;
  grid-template-columns: 28% 1fr;
  grid-template-rows: repeat(2, 1fr);
  gap: 4px;
  height: 52px;
  padding: 6px;
  border: 1px solid var(--ctp-border);
  border-radius: 6px;
  background: var(--ctp-bg);
}

.skin-card__preview i {
  display: block;
  border-radius: 3px;
  background: var(--ctp-surface-muted);
}

.skin-card__preview i:first-child {
  grid-row: 1 / 3;
  background: var(--ctp-secondary-soft);
}

.skin-card--classic .skin-card__preview {
  border-color: #c7d7f5;
  background: #ffffff;
}

.skin-card--classic .skin-card__preview i {
  background: #e9f1ff;
}

.skin-card--classic .skin-card__preview i:first-child {
  background: #1d4ed8;
}

.skin-card--classic .skin-card__preview i:last-child {
  background: #7aa2ff;
}

.skin-card--sunflower .skin-card__preview {
  background:
    linear-gradient(rgba(243, 239, 228, 0.9), rgba(243, 239, 228, 0.9)),
    url('/themes/sunflower/extension/paper-grain.webp') center / 300px;
}

.skin-card--sunflower .skin-card__preview i:first-child {
  background: #e5e8d5;
}

.skin-card--sunflower .skin-card__preview i:last-child {
  background: #f1e3b1;
}

.skin-card strong {
  font-size: 14px;
}

.ocr-model-description {
  margin-top: 6px;
  color: var(--ctp-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.quick-actions-card {
  margin-top: 18px;
}

.quick-actions-toolbar {
  margin-bottom: 10px;
}

.quick-actions-list :deep(.n-list-item) {
  padding: 8px 10px;
}

.quick-actions-list :deep(.n-list-item__main),
.quick-actions-list :deep(.n-thing-main),
.quick-actions-list :deep(.n-thing-header) {
  min-width: 0;
}

.quick-actions-list :deep(.n-thing-header) {
  margin-bottom: 0;
}

.quick-actions-list :deep(.n-list-item__suffix) {
  margin-left: 10px;
}

.quick-action-item strong {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-action-dialog {
  width: min(720px, 92vw);
}

.export-config-dialog {
  width: min(520px, 92vw);
}

.quick-action-error {
  margin-top: 12px;
}

.history-actions {
  display: flex;
  gap: 10px;
  margin: 12px 0;
}

.history-list {
  margin-top: 12px;
}

.history-item {
  cursor: pointer;
}

.history-item:hover {
  background: var(--ctp-surface-soft);
}

.empty-history {
  color: var(--ctp-text-muted);
  padding: 24px 0;
  text-align: center;
}

.actions {
  position: sticky;
  bottom: 0;
  z-index: 2;
  margin-top: 20px;
  padding: 12px;
  border: 1px solid var(--ctp-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ctp-surface) 94%, transparent);
  box-shadow: var(--ctp-shadow);
  display: flex;
  gap: 10px;
}

.options-container[data-ctp-skin='sunflower'] {
  min-height: 100vh;
}

.options-container[data-ctp-skin='sunflower'] .options-header {
  background:
    linear-gradient(rgba(251, 248, 240, 0.91), rgba(251, 248, 240, 0.95)),
    url('/themes/sunflower/extension/paper-grain.webp') center / 480px;
}

.options-container[data-ctp-skin='sunflower'] .options-header::after {
  content: '';
  position: absolute;
  top: -8px;
  right: -8px;
  width: 390px;
  height: 128px;
  pointer-events: none;
  background: url('/themes/sunflower/extension/options-botanical.webp') right top / 390px 128px no-repeat;
  opacity: 0.46;
  -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.32) 42%, #000 76%);
  mask-image: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.32) 42%, #000 76%);
}

.options-container[data-ctp-skin='sunflower'] :deep(.n-tabs-tab--active) {
  color: var(--ctp-secondary);
}

.options-container[data-ctp-skin='sunflower'] :deep(.n-tabs-bar) {
  background: var(--ctp-primary);
}

.options-container[data-ctp-skin='sunflower'] :deep(.n-list),
.options-container[data-ctp-skin='sunflower'] :deep(.n-card),
.options-container[data-ctp-skin='sunflower'] :deep(.n-input),
.options-container[data-ctp-skin='sunflower'] :deep(.n-select) {
  border-color: var(--ctp-border);
}

.options-container :deep(.n-tabs-tab--active) {
  font-weight: 600;
}

.options-container :deep(.n-card),
.options-container :deep(.n-list) {
  border-color: var(--ctp-border);
  background: var(--ctp-surface);
  box-shadow: var(--ctp-shadow);
}

.options-container :deep(.n-list-item) {
  border-bottom-color: var(--ctp-border);
}

.processor-list :deep(.n-list-item) {
  padding: 14px 20px;
}

.processor-list :deep(.n-thing-header) {
  margin-bottom: 6px;
}

.processor-list :deep(.n-thing-main__description) {
  padding-left: 32px;
  line-height: 1.65;
}

.options-container :deep(.n-alert) {
  border-radius: 0 6px 6px 0;
  box-shadow: none;
}

.options-container[data-ctp-skin='sunflower'] :deep(.n-tabs-tab--active) {
  position: relative;
}

.options-container[data-ctp-skin='sunflower'] :deep(.n-tabs-tab--active)::after {
  content: '';
  position: absolute;
  right: 8px;
  bottom: -4px;
  left: 8px;
  height: 10px;
  pointer-events: none;
  background: url('/themes/sunflower/extension/paint-stroke.webp') center / 100% 100% no-repeat;
  opacity: 0.3;
}

@media (max-width: 760px) {
  .options-container {
    padding: 14px;
  }

  .skin-gallery {
    grid-template-columns: 1fr;
  }

  .actions {
    flex-wrap: wrap;
  }

  .options-container[data-ctp-skin='sunflower'] .options-header::after {
    display: none;
  }
}
</style>
