'use client';

import ky from 'ky';

export const copyPreviewPng = async (id: string) => {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error(
      'Image copying is not supported here. Download the PNG instead.',
    );
  }
  // Starting the clipboard write in the click gesture also supports Safari.
  const png = ky
    .get(`/api/tierlist-preview/${id}/image`, { timeout: 180_000, retry: 0 })
    .blob();
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
  } catch {
    throw new Error(
      'Unable to copy the PNG. Allow clipboard access or download it instead.',
    );
  }
};
