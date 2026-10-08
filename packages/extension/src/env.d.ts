/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

type ChromeEvent<T extends (...args: any[]) => any> = {
  addListener(listener: T): void;
  removeListener?(listener: T): void;
};

declare namespace chrome {
  namespace tabs {
    type Tab = {
      id?: number;
      windowId?: number;
      url?: string;
      title?: string;
    };

    function query(queryInfo: Record<string, unknown>): Promise<Tab[]>;
    function captureVisibleTab(
      windowId: number,
      options: Record<string, unknown>,
      callback: (dataUrl?: string) => void
    ): void;
    function sendMessage<T = unknown>(
      tabId: number,
      message: unknown,
      callback: (response: T) => void
    ): void;
    const onUpdated: ChromeEvent<(tabId: number, changeInfo: { status?: string }, tab: Tab) => void>;
    const onRemoved: ChromeEvent<(tabId: number, removeInfo: Record<string, unknown>) => void>;
  }

  namespace runtime {
    type MessageSender = {
      tab?: tabs.Tab;
    };

    type RuntimeError = {
      message?: string;
    };

    type ExtensionContext = Record<string, unknown>;

    const lastError: RuntimeError | undefined;
    const onInstalled: ChromeEvent<() => void>;
    const onMessage: ChromeEvent<(
      message: any,
      sender: MessageSender,
      sendResponse: (response?: any) => void
    ) => boolean | void>;

    function getURL(path: string): string;
    function openOptionsPage(): void;
    function reload(): void;
    function sendMessage<T = unknown>(message: unknown): Promise<T>;
    function sendMessage<T = unknown>(message: unknown, callback: (response: T) => void): void;
    const getContexts: ((query: Record<string, unknown>) => Promise<ExtensionContext[]>) | undefined;
  }

  namespace contextMenus {
    type ContextType = 'selection' | 'image';
    type OnClickData = {
      menuItemId: string | number;
      selectionText?: string;
      srcUrl?: string;
    };

    const onClicked: ChromeEvent<(info: OnClickData, tab?: tabs.Tab) => void>;

    function removeAll(callback?: () => void): void;
    function create(createProperties: {
      id: string;
      title: string;
      contexts: ContextType[];
    }): void;
  }

  namespace commands {
    const onCommand: ChromeEvent<(command: string) => void>;
  }

  namespace storage {
    type StorageChange = {
      oldValue?: any;
      newValue?: any;
    };

    const local: {
      get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, any>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
    };

    const onChanged: ChromeEvent<(
      changes: Record<string, StorageChange>,
      areaName: string
    ) => void>;
  }

  namespace notifications {
    function create(options: {
      type: 'basic';
      iconUrl: string;
      title: string;
      message: string;
    }): void;
  }

  namespace offscreen {
    function createDocument(options: {
      url: string;
      reasons: string[];
      justification: string;
    }): Promise<void>;
  }

  namespace scripting {
    type InjectionResult<T = unknown> = {
      frameId: number;
      result?: T;
    };

    type InjectionTarget = {
      tabId: number;
      allFrames?: boolean;
      frameIds?: number[];
    };

    function executeScript(options: {
      target: InjectionTarget;
      files?: string[];
      func?: (...args: any[]) => unknown;
      args?: unknown[];
      injectImmediately?: boolean;
      world?: 'ISOLATED' | 'MAIN';
    }): Promise<InjectionResult[]>;

    function insertCSS(options: {
      target: InjectionTarget;
      files: string[];
      origin?: 'AUTHOR' | 'USER';
    }): Promise<void>;

    function removeCSS(options: {
      target: InjectionTarget;
      files: string[];
      origin?: 'AUTHOR' | 'USER';
    }): Promise<void>;
  }
}
