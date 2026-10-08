import type { GlobalThemeOverrides } from 'naive-ui';

export type SkinName = 'classic' | 'sunflower';

export const WEB_SKIN_STORAGE_KEY = 'clipboard-processor-ui-skin';
export const WEB_SKIN_CHANGE_EVENT = 'ctp-skin-change';

export const skinOptions = [
  { label: 'Classic', value: 'classic' },
  { label: '向日葵手稿', value: 'sunflower' }
] as const;

export function normalizeSkin(value: unknown): SkinName {
  return value === 'sunflower' ? 'sunflower' : 'classic';
}

export function getStoredSkin(): SkinName {
  return normalizeSkin(localStorage.getItem(WEB_SKIN_STORAGE_KEY));
}

export function setStoredSkin(skin: SkinName): void {
  localStorage.setItem(WEB_SKIN_STORAGE_KEY, skin);
  window.dispatchEvent(new CustomEvent(WEB_SKIN_CHANGE_EVENT, { detail: { skin } }));
}

const classicThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#9a7447',
    primaryColorHover: '#7f5c34',
    primaryColorPressed: '#674823',
    primaryColorSuppl: '#9a7447',
    infoColor: '#6f6658',
    successColor: '#66724a',
    warningColor: '#b6822c',
    errorColor: '#b24b41',
    textColorBase: '#25231f',
    textColor1: '#25231f',
    textColor2: '#514c44',
    textColor3: '#706a5f',
    dividerColor: '#e4ded3',
    borderColor: '#ddd5c6',
    inputColor: '#fffdfa',
    inputColorDisabled: '#f1eee6',
    bodyColor: '#f7f6f2',
    cardColor: '#fffdfa',
    modalColor: '#fffdfa',
    popoverColor: '#fffdfa',
    tableColor: '#fffdfa',
    tableColorHover: '#f2eee5',
    hoverColor: '#f2eee5',
    pressedColor: '#eadfce'
  },
  Card: {
    borderColor: '#ddd5c6',
    borderRadius: '8px',
    paddingMedium: '20px'
  },
  Button: {
    borderRadiusMedium: '8px',
    borderRadiusSmall: '7px',
    fontWeight: '560'
  },
  Input: {
    borderRadius: '8px',
    borderHover: '#cfc4b1',
    borderFocus: '#66724a',
    boxShadowFocus: '0 0 0 2px rgba(102, 114, 74, 0.16)'
  },
  Menu: {
    borderRadius: '8px',
    itemTextColor: '#706a5f',
    itemTextColorHover: '#25231f',
    itemTextColorActive: '#25231f',
    itemIconColor: '#66724a',
    itemIconColorHover: '#66724a',
    itemIconColorActive: '#66724a'
  },
  Checkbox: {
    borderRadius: '4px',
    colorChecked: '#66724a',
    borderChecked: '#66724a'
  },
  Switch: {
    railColorActive: '#66724a'
  },
  Tabs: {
    tabTextColorActiveLine: '#66724a',
    barColor: '#66724a'
  }
};

const sunflowerThemeOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily: '"LXGW WenKai Screen", "KaiTi", serif',
    primaryColor: '#c99928',
    primaryColorHover: '#956d16',
    primaryColorPressed: '#76520f',
    primaryColorSuppl: '#c99928',
    infoColor: '#667047',
    successColor: '#667047',
    warningColor: '#c99928',
    errorColor: '#a65e4d',
    textColorBase: '#29251e',
    textColor1: '#29251e',
    textColor2: '#554f43',
    textColor3: '#777061',
    dividerColor: '#d8d0c0',
    borderColor: '#d8d0c0',
    inputColor: '#fffdf8',
    inputColorDisabled: '#f6edd4',
    bodyColor: '#f3efe4',
    cardColor: 'rgba(251, 248, 240, 0.98)',
    modalColor: '#fffdf8',
    popoverColor: '#fffdf8',
    tableColor: '#fffdf8',
    tableColorHover: '#f6edd4',
    hoverColor: '#f6edd4',
    pressedColor: '#f1e3b1'
  },
  Card: {
    borderColor: '#d8d0c0',
    borderRadius: '8px',
    paddingMedium: '20px'
  },
  Button: {
    borderRadiusMedium: '8px',
    borderRadiusSmall: '7px',
    fontWeight: '600'
  },
  Input: {
    borderRadius: '8px',
    borderHover: '#b9ad96',
    borderFocus: '#667047',
    boxShadowFocus: '0 0 0 2px rgba(102, 112, 71, 0.18)'
  },
  Menu: {
    borderRadius: '8px',
    itemTextColor: '#777061',
    itemTextColorHover: '#29251e',
    itemTextColorActive: '#29251e',
    itemIconColor: '#667047',
    itemIconColorHover: '#667047',
    itemIconColorActive: '#667047'
  },
  Checkbox: {
    borderRadius: '4px',
    colorChecked: '#667047',
    borderChecked: '#667047'
  },
  Switch: {
    railColorActive: '#667047'
  },
  Tabs: {
    tabTextColorActiveLine: '#667047',
    barColor: '#667047'
  }
};

export function getSkinThemeOverrides(skin: SkinName): GlobalThemeOverrides {
  return skin === 'sunflower' ? sunflowerThemeOverrides : classicThemeOverrides;
}
