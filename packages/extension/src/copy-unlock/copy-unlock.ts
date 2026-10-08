const RELEASE_EVENT = 'ctp-copy-unlock-release';
const STATE_KEY = '__ctpCopyUnlockState';
const BLOCKED_EVENTS = [
  'copy',
  'cut',
  'contextmenu',
  'dragstart',
  'mousedown',
  'selectstart'
] as const;
const EXCLUDED_SELECTOR = [
  'input',
  'textarea',
  'select',
  'option',
  'button',
  '[contenteditable]',
  '[draggable="true"]',
  '#ctp-selection-action-icon',
  '#ctp-selection-action-panel',
  '#ctp-screenshot-overlay'
].join(',');

type CopyUnlockWindow = Window & {
  [STATE_KEY]?: { release: () => void };
};

const copyUnlockWindow = window as CopyUnlockWindow;

copyUnlockWindow[STATE_KEY]?.release();

const stopPageHandler = (event: Event) => {
  if (event.target instanceof Element && event.target.closest(EXCLUDED_SELECTOR)) {
    return;
  }

  event.stopImmediatePropagation();
};

const allowCopyShortcut = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && ['KeyA', 'KeyC'].includes(event.code)) {
    stopPageHandler(event);
  }
};

const release = () => {
  BLOCKED_EVENTS.forEach(type => window.removeEventListener(type, stopPageHandler, true));
  window.removeEventListener('keydown', allowCopyShortcut, true);
  document.documentElement?.removeEventListener(RELEASE_EVENT, release);
  delete copyUnlockWindow[STATE_KEY];
};

BLOCKED_EVENTS.forEach(type => window.addEventListener(type, stopPageHandler, true));
window.addEventListener('keydown', allowCopyShortcut, true);
document.documentElement?.addEventListener(RELEASE_EVENT, release);
copyUnlockWindow[STATE_KEY] = { release };

export {};
