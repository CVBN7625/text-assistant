type OffscreenMessage = {
  type: 'OFFSCREEN_WRITE_IMAGE_TO_CLIPBOARD';
  dataUrl: string;
};

chrome.runtime.onMessage.addListener((message: OffscreenMessage, sender, sendResponse) => {
  if (message.type !== 'OFFSCREEN_WRITE_IMAGE_TO_CLIPBOARD') {
    return false;
  }

  void writeImageToClipboard(message.dataUrl)
    .then(() => sendResponse({ success: true }))
    .catch(error => sendResponse({ success: false, error: getOffscreenErrorMessage(error) }));

  return true;
});

async function writeImageToClipboard(dataUrl: string): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('当前浏览器不支持写入图片剪贴板');
  }

  const response = await fetch(dataUrl);
  const blob = await response.blob();

  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type || 'image/png']: blob
    })
  ]);
}

function getOffscreenErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
