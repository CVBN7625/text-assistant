type RuntimeResponse = {
  success?: boolean;
  error?: string;
};

type SendRuntimeMessageOptions = {
  timeoutMs?: number;
  timeoutMessage?: string;
  requireSuccess?: boolean;
};

const DEFAULT_RUNTIME_MESSAGE_TIMEOUT_MS = 30000;

export function sendRuntimeMessage<T = unknown>(
  message: unknown,
  options: SendRuntimeMessageOptions = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_RUNTIME_MESSAGE_TIMEOUT_MS;
  const requireSuccess = options.requireSuccess ?? true;

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = globalThis.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(options.timeoutMessage || '后台服务无响应，请在扩展管理页重新加载插件后重试'));
    }, timeoutMs);

    try {
      chrome.runtime.sendMessage(message, response => {
        if (settled) return;
        settled = true;
        globalThis.clearTimeout(timeoutId);

        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(formatRuntimeError(lastError.message)));
          return;
        }

        if (response == null) {
          reject(new Error('后台没有返回结果，请重新加载插件后重试'));
          return;
        }

        const runtimeResponse = response as RuntimeResponse;
        if (requireSuccess && runtimeResponse.success === false) {
          reject(new Error(runtimeResponse.error || '后台处理失败'));
          return;
        }

        resolve(response as T);
      });
    } catch (error) {
      settled = true;
      globalThis.clearTimeout(timeoutId);
      reject(new Error(formatRuntimeError(getErrorMessage(error))));
    }
  });
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatRuntimeError(message?: string): string {
  if (!message) {
    return '后台服务不可用，请在扩展管理页重新加载插件后重试';
  }

  if (message.includes('Receiving end does not exist')) {
    return '后台服务未启动或插件刚刚更新，请在扩展管理页重新加载插件后重试';
  }

  if (message.includes('Extension context invalidated')) {
    return '插件已更新，请刷新当前网页后重试';
  }

  return message;
}
