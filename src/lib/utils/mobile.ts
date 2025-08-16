import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export function isNativePlatform(): boolean {
  try {
    console.log('🔍 Checking native platform...');
    console.log('🔍 Capacitor object:', typeof Capacitor);
    console.log('🔍 Capacitor.isNativePlatform:', typeof Capacitor?.isNativePlatform);
    
    // Multiple detection methods for better reliability
    const hasCapacitor = typeof Capacitor !== 'undefined';
    const hasNativeFunction = typeof Capacitor?.isNativePlatform === 'function';
    const capacitorResult = hasNativeFunction ? Capacitor.isNativePlatform() : false;
    
    // Alternative detection methods
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const hasCapacitorInUserAgent = navigator.userAgent.includes('Capacitor');
    
    console.log('🔍 Detection results:', {
      hasCapacitor,
      hasNativeFunction,
      capacitorResult,
      isIOS,
      isAndroid,
      hasCapacitorInUserAgent,
      userAgent: navigator.userAgent
    });
    
    // Return true if any native detection method succeeds
    const isNative = capacitorResult || (hasCapacitor && (isIOS || isAndroid)) || hasCapacitorInUserAgent;
    console.log('🔍 Final isNative result:', isNative);
    
    return isNative;
  } catch (error) {
    console.error('🔍 Error detecting native platform:', error);
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
