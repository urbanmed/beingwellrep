import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export function isNativePlatform(): boolean {
  try {
    // Capacitor v5+ exposes isNativePlatform; fallback to false on web
    // @ts-ignore
    return typeof Capacitor?.isNativePlatform === 'function'
      ? // @ts-ignore
        Capacitor.isNativePlatform()
      : false;
  } catch {
    return false;
  }
}

export async function openInSystemBrowser(url: string) {
  if (!url) return;
  if (isNativePlatform()) {
    await Browser.open({ url });
  } else {
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    w?.focus?.();
  }
}
