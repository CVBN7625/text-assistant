const RELEASE_EVENT = 'ctp-copy-unlock-release';
const STATE_KEY = '__ctpCopyUnlockMainState';
const BLOCKED_EVENTS = new Set(['copy', 'cut', 'contextmenu', 'dragstart', 'mousedown', 'selectstart']);

type CopyUnlockMainWindow = Window & {
  [STATE_KEY]?: { release: () => void };
};

const copyUnlockWindow = window as CopyUnlockMainWindow;
copyUnlockWindow[STATE_KEY]?.release();

const originalPreventDefaultDescriptor = Object.getOwnPropertyDescriptor(Event.prototype, 'preventDefault');
const originalReturnValueDescriptor = Object.getOwnPropertyDescriptor(Event.prototype, 'returnValue');
const originalPreventDefault = Event.prototype.preventDefault;
const unlockedPreventDefault = function(this: Event): void {
  if (!BLOCKED_EVENTS.has(this.type)) {
    originalPreventDefault.call(this);
  }
};

const release = () => {
  if (originalPreventDefaultDescriptor) {
    Object.defineProperty(Event.prototype, 'preventDefault', originalPreventDefaultDescriptor);
  }
  if (originalReturnValueDescriptor) {
    Object.defineProperty(Event.prototype, 'returnValue', originalReturnValueDescriptor);
  } else {
    Reflect.deleteProperty(Event.prototype, 'returnValue');
  }
  document.documentElement?.removeEventListener(RELEASE_EVENT, release);
  delete copyUnlockWindow[STATE_KEY];
};

Object.defineProperty(Event.prototype, 'preventDefault', {
  configurable: true,
  get: () => unlockedPreventDefault,
  set: () => {}
});
Object.defineProperty(Event.prototype, 'returnValue', {
  configurable: true,
  get(this: Event) {
    if (BLOCKED_EVENTS.has(this.type)) {
      return true;
    }
    return originalReturnValueDescriptor?.get?.call(this) ?? true;
  },
  set(this: Event, value: boolean) {
    if (!BLOCKED_EVENTS.has(this.type)) {
      originalReturnValueDescriptor?.set?.call(this, value);
    }
  }
});
document.documentElement?.addEventListener(RELEASE_EVENT, release);
copyUnlockWindow[STATE_KEY] = { release };

export {};
