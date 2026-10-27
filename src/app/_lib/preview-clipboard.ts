'use client';

import { toast } from '@/app/_components/ui/toast';

const pendingKey = 'tierlist-preview-clipboard';
const copiedEvent = 'tierlist-preview-copied';

export const copyPreviewLink = async (url: string, defer: boolean) => {
  const path = new URL(url).pathname;
  let title = 'Preview link copied to clipboard';
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    title = 'Could not copy the link. Copy it from the preview address bar.';
  }
  if (!defer) {
    toast.add({ title, timeout: 5000 });
    return;
  }
  try {
    sessionStorage.setItem(
      pendingKey,
      JSON.stringify({ path, title, expires: Date.now() + 60_000 }),
    );
    window.dispatchEvent(new Event(copiedEvent));
  } catch {
    toast.add({ title, timeout: 5000 });
  }
};

export const watchPreviewClipboard = () => {
  const show = () => {
    try {
      const raw = sessionStorage.getItem(pendingKey);
      if (!raw) {
        return;
      }
      const pending = JSON.parse(raw) as {
        path: string;
        title: string;
        expires: number;
      };
      if (pending.path !== window.location.pathname) {
        return;
      }
      sessionStorage.removeItem(pendingKey);
      if (pending.expires > Date.now()) {
        toast.add({ title: pending.title, timeout: 5000 });
      }
    } catch {
      // Clipboard feedback must not block viewing a tierlist when storage is unavailable.
    }
  };
  show();
  window.addEventListener(copiedEvent, show);

  return () => window.removeEventListener(copiedEvent, show);
};
