<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="ctp-app" :data-ctp-skin="activeSkin">
      <n-message-provider>
        <n-layout has-sider class="app-shell">
          <n-layout-sider
            bordered
            content-style="padding: 18px 14px;"
            :native-scrollbar="false"
            width="224px"
            :style="{ background: 'var(--ctp-sidebar-bg)' }"
          >
            <div class="brand">
              <div class="brand-mark">
                <Sprout :size="18" stroke-width="1.8" />
              </div>
              <div class="brand-copy">
                <h1>Clipboard</h1>
                <p>智能文本处理器</p>
              </div>
            </div>

            <n-menu
              v-model:value="currentRoute"
              :options="menuOptions"
              :indent="18"
              @update:value="handleMenuClick"
            />
          </n-layout-sider>

          <n-layout-content
            class="workspace"
            content-style="padding: 22px 24px 32px;"
            :style="{ background: 'var(--ctp-app-bg)' }"
          >
            <router-view />
          </n-layout-content>
        </n-layout>
      </n-message-provider>
    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NConfigProvider,
  NIcon,
  NLayout,
  NLayoutContent,
  NLayoutSider,
  NMenu,
  NMessageProvider
} from 'naive-ui';
import {
  ClipboardList,
  History,
  ImageIcon,
  Languages,
  ScanText,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sprout
} from 'lucide-vue-next';
import {
  WEB_SKIN_CHANGE_EVENT,
  getSkinThemeOverrides,
  getStoredSkin,
  normalizeSkin,
  type SkinName
} from './theme/skins';

const router = useRouter();
const route = useRoute();

const currentRoute = computed(() => route.path);
const activeSkin = ref<SkinName>(getStoredSkin());
const themeOverrides = computed(() => getSkinThemeOverrides(activeSkin.value));

function renderIcon(icon: any) {
  return () => h(NIcon, { size: 20 }, { default: () => h(icon, { strokeWidth: 1.8 }) });
}

const menuOptions = [
  {
    label: '文本处理器',
    key: '/processor',
    icon: renderIcon(ClipboardList)
  },
  {
    label: '翻译',
    key: '/translator',
    icon: renderIcon(Languages)
  },
  {
    label: '图片翻译',
    key: '/image-translator',
    icon: renderIcon(ImageIcon)
  },
  {
    label: 'OCR 文字识别',
    key: '/ocr',
    icon: renderIcon(ScanText)
  },
  {
    label: '设置',
    key: '/settings',
    icon: renderIcon(Settings)
  },
  {
    label: '历史记录',
    key: '/history',
    icon: renderIcon(History)
  },
  {
    label: '自定义规则',
    key: '/custom-rules',
    icon: renderIcon(SlidersHorizontal)
  },
  {
    label: 'AI 自定义处理',
    key: '/ai-processor',
    icon: renderIcon(Sparkles)
  }
];

function handleMenuClick(key: string) {
  router.push(key);
}

function handleSkinChange(event: Event) {
  const detail = (event as CustomEvent<{ skin?: unknown }>).detail;
  activeSkin.value = normalizeSkin(detail?.skin);
}

function handleStorageChange(event: StorageEvent) {
  if (event.key === 'clipboard-processor-ui-skin') {
    activeSkin.value = normalizeSkin(event.newValue);
  }
}

onMounted(() => {
  window.addEventListener(WEB_SKIN_CHANGE_EVENT, handleSkinChange);
  window.addEventListener('storage', handleStorageChange);
});

onUnmounted(() => {
  window.removeEventListener(WEB_SKIN_CHANGE_EVENT, handleSkinChange);
  window.removeEventListener('storage', handleStorageChange);
});
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: Inter, system-ui, 'Microsoft YaHei', sans-serif;
  background-color: var(--ctp-app-bg, #f7f6f2);
  color: var(--ctp-text, #25231f);
}

.ctp-app {
  --ctp-font-functional: Inter, system-ui, 'Microsoft YaHei', sans-serif;
  --ctp-font-handwriting: 'LXGW WenKai Screen', 'KaiTi', serif;
  --ctp-font-mono: Consolas, 'Courier New', monospace;
  --ctp-app-bg: #f7f6f2;
  --ctp-sidebar-bg: #f1eee6;
  --ctp-surface: #fffdfa;
  --ctp-surface-soft: #f2eee5;
  --ctp-surface-muted: #ebe5d9;
  --ctp-border: #ddd5c6;
  --ctp-border-strong: #cfc4b1;
  --ctp-text: #25231f;
  --ctp-text-muted: #706a5f;
  --ctp-primary: #9a7447;
  --ctp-primary-strong: #7f5c34;
  --ctp-primary-soft: #eadfce;
  --ctp-secondary: #66724a;
  --ctp-success: #66724a;
  --ctp-error: #b24b41;
  --ctp-shadow: 0 1px 2px rgba(61, 50, 41, 0.08), 0 10px 24px rgba(61, 50, 41, 0.06);
  min-height: 100vh;
}

.ctp-app[data-ctp-skin='sunflower'] {
  --ctp-app-bg: #f3efe4;
  --ctp-sidebar-bg: #eae2cf;
  --ctp-surface: rgba(251, 248, 240, 0.98);
  --ctp-surface-soft: #f6edd4;
  --ctp-surface-muted: #e9dab8;
  --ctp-border: #d8d0c0;
  --ctp-border-strong: #b9ad96;
  --ctp-text: #29251e;
  --ctp-text-muted: #777061;
  --ctp-primary: #c99928;
  --ctp-primary-strong: #956d16;
  --ctp-primary-soft: #f1e3b1;
  --ctp-secondary: #667047;
  --ctp-success: #667047;
  --ctp-error: #a65e4d;
  --ctp-shadow: 0 1px 2px rgba(61, 52, 36, 0.07), 0 8px 20px rgba(61, 52, 36, 0.045);
  background:
    linear-gradient(rgba(243, 239, 228, 0.96), rgba(243, 239, 228, 0.97)),
    url('/themes/sunflower/v2/paper-grain.webp') center / 1024px fixed;
}

.app-shell {
  height: 100vh;
}

.n-layout-sider {
  position: relative;
  overflow: hidden;
}

.ctp-app[data-ctp-skin='sunflower'] .n-layout-sider::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(rgba(234, 226, 207, 0.93), rgba(234, 226, 207, 0.93)),
    url('/themes/sunflower/v2/paper-grain.webp') center / 620px;
  opacity: 1;
}

.ctp-app[data-ctp-skin='sunflower'] .n-layout-sider::after {
  content: '';
  position: absolute;
  left: -42px;
  bottom: -16px;
  width: 240px;
  height: 360px;
  pointer-events: none;
  background: url('/themes/sunflower/v2/botanical-sidebar.webp') left bottom / contain no-repeat;
  opacity: 0.34;
}

.brand,
.n-menu {
  position: relative;
  z-index: 1;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 6px 6px 16px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--ctp-border);
}

.brand-mark {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--ctp-border-strong);
  border-radius: 8px;
  color: var(--ctp-secondary);
  background: var(--ctp-surface);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.75) inset;
}

.brand-copy h1 {
  margin: 0;
  font-size: 16px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: 0;
  color: var(--ctp-text);
}

.brand-copy p {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.35;
  color: var(--ctp-text-muted);
}

.n-menu {
  background: transparent !important;
}

.n-menu .n-menu-item-content {
  position: relative;
  height: 42px !important;
  margin: 5px 0;
  padding-left: 14px !important;
  border-radius: 8px !important;
  color: var(--ctp-text-muted);
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.n-menu .n-menu-item-content::before {
  content: '';
  position: absolute;
  left: 0;
  top: 9px;
  width: 2px;
  height: 24px;
  border-radius: 999px;
  background: transparent;
}

.n-menu .n-menu-item-content:hover {
  background: rgba(255, 253, 247, 0.58) !important;
  color: var(--ctp-text) !important;
}

.n-menu .n-menu-item-content.n-menu-item-content--selected {
  background: var(--ctp-surface) !important;
  color: var(--ctp-text) !important;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.72) inset, 0 1px 2px rgba(61, 50, 41, 0.06);
}

.n-menu .n-menu-item-content.n-menu-item-content--selected::before {
  background: var(--ctp-secondary);
}

.ctp-app[data-ctp-skin='sunflower'] .n-menu .n-menu-item-content.n-menu-item-content--selected {
  background:
    url('/themes/sunflower/v2/paint-stroke-tab.webp') right 10px bottom 5px / 94px 20px no-repeat,
    linear-gradient(90deg, rgba(255, 253, 248, 0.96), rgba(246, 237, 212, 0.74)) !important;
}

.n-menu .n-menu-item-content-header {
  font-size: 14px;
  font-weight: 560;
  letter-spacing: 0;
}

.n-menu .n-menu-item-content__icon {
  color: var(--ctp-secondary) !important;
}

::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}

::-webkit-scrollbar-track {
  background: var(--ctp-surface-soft);
}

::-webkit-scrollbar-thumb {
  background: var(--ctp-border-strong);
  border-radius: 999px;
}

.n-card {
  border-color: var(--ctp-border) !important;
  border-radius: 8px !important;
  background: var(--ctp-surface) !important;
  box-shadow: var(--ctp-shadow) !important;
}

.n-modal .n-card {
  background: var(--ctp-surface, #fffdfa) !important;
  border: 1px solid var(--ctp-border, #ddd5c6) !important;
  box-shadow: 0 18px 50px rgba(37, 35, 31, 0.22) !important;
}

.ctp-app[data-ctp-skin='sunflower'] .n-card {
  background:
    linear-gradient(rgba(251, 248, 240, 0.965), rgba(251, 248, 240, 0.965)),
    url('/themes/sunflower/v2/paper-grain.webp') center / 620px !important;
}

.ctp-app[data-ctp-skin='sunflower'] .page-header {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(rgba(251, 248, 240, 0.95), rgba(251, 248, 240, 0.95)),
    url('/themes/sunflower/v2/paper-grain.webp') center / 620px !important;
}

.ctp-app[data-ctp-skin='sunflower'] .page-header::after {
  content: '';
  position: absolute;
  right: 18px;
  bottom: 8px;
  width: 250px;
  height: 50px;
  pointer-events: none;
  background: url('/themes/sunflower/v2/paint-stroke-short.webp') center / contain no-repeat;
  opacity: 0.55;
}

.n-card-header {
  color: var(--ctp-text) !important;
}

.n-card-header__main {
  font-weight: 650 !important;
}

.n-button {
  font-weight: 560;
}

.n-button.n-button--primary-type {
  background: var(--ctp-primary) !important;
  border-color: var(--ctp-primary) !important;
  color: #2b2317 !important;
}

.n-button.n-button--primary-type:hover {
  background: var(--ctp-primary-strong) !important;
  border-color: var(--ctp-primary-strong) !important;
  color: #fffaf0 !important;
}

.n-input,
.n-base-selection {
  --n-border: 1px solid var(--ctp-border) !important;
  --n-border-hover: 1px solid var(--ctp-border-strong) !important;
  --n-border-focus: 1px solid var(--ctp-secondary) !important;
}

</style>
