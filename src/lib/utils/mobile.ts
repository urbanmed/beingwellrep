import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export function isNativePlatform(): boolean {
  try {
    console.log('🔍 Checking native platform...');
    console.log('🔍 Capacitor object:', typeof Capacitor);
    console.log('🔍 Capacitor.isNativePlatform:', typeof Capacitor?.isNativePlatform);
    
    // Primary detection method
    const hasCapacitor = typeof Capacitor !== 'undefined';
    const hasNativeFunction = typeof Capacitor?.isNativePlatform === 'function';
    const capacitorResult = hasNativeFunction ? Capacitor.isNativePlatform() : false;
    
    // iOS-specific detection methods
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIOSCapacitor = isIOS && hasCapacitor;
    const hasCapacitorInUserAgent = navigator.userAgent.includes('Capacitor');
    
    // iOS WebKit detection for native app
    const isIOSWebKit = 'webkit' in window && isIOS;
    const hasIOSStatusBar = window.innerHeight !== window.screen.height && isIOS;
    
    // Android detection
    const isAndroid = /Android/.test(navigator.userAgent);
    const isAndroidCapacitor = isAndroid && hasCapacitor;
    
    console.log('🔍 Detection results:', {
      hasCapacitor,
      hasNativeFunction,
      capacitorResult,
      isIOS,
      isIOSCapacitor,
      isIOSWebKit,
      hasIOSStatusBar,
      isAndroid,
      isAndroidCapacitor,
      hasCapacitorInUserAgent,
      userAgent: navigator.userAgent,
      windowHeight: window.innerHeight,
      screenHeight: window.screen.height
    });
    
    // Return true if any native detection method succeeds
    const isNative = capacitorResult || 
                    isIOSCapacitor || 
                    isAndroidCapacitor || 
                    hasCapacitorInUserAgent ||
                    (isIOSWebKit && hasIOSStatusBar);
    console.log('🔍 Final isNative result:', isNative);
    
    return isNative;
  } catch (error) {
    console.error('🔍 Error detecting native platform:', error);
    return false;
  }
}

export function isIOSPlatform(): boolean {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isNative = isNativePlatform();
  return isIOS && isNative;
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
