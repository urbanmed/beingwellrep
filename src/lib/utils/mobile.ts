import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export function isNativePlatform(): boolean {
  try {
    console.log('🔍 Checking native platform...');
    
    // Primary detection method - Capacitor.isNativePlatform()
    const hasCapacitor = typeof Capacitor !== 'undefined';
    const hasNativeFunction = typeof Capacitor?.isNativePlatform === 'function';
    
    if (hasCapacitor && hasNativeFunction) {
      const capacitorResult = Capacitor.isNativePlatform();
      console.log('🔍 Capacitor.isNativePlatform():', capacitorResult);
      if (capacitorResult) {
        console.log('✅ Native platform detected via Capacitor API');
        return true;
      }
    }
    
    // Secondary detection methods for edge cases
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const hasCapacitorInUserAgent = navigator.userAgent.includes('Capacitor');
    const hasCapacitorBridge = hasCapacitor && typeof (window as any).Capacitor?.Plugins !== 'undefined';
    
    // iOS-specific detection (for iOS simulator issues)
    const isIOSNative = isIOS && (
      hasCapacitorInUserAgent ||
      hasCapacitorBridge ||
      // iOS app-specific WebView characteristics
      navigator.userAgent.includes('Mobile/') ||
      // Check for iOS app scheme
      window.location.protocol === 'capacitor:' ||
      // iOS WebView detection
      (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome'))
    );
    
    // Android-specific detection
    const isAndroidNative = isAndroid && (
      hasCapacitorInUserAgent ||
      hasCapacitorBridge ||
      navigator.userAgent.includes('wv') // Android WebView
    );
    
    console.log('🔍 Detection results:', {
      hasCapacitor,
      hasNativeFunction,
      isIOS,
      isAndroid,
      hasCapacitorInUserAgent,
      hasCapacitorBridge,
      isIOSNative,
      isAndroidNative,
      userAgent: navigator.userAgent,
      protocol: window.location.protocol
    });
    
    const isNative = isIOSNative || isAndroidNative;
    console.log('🔍 Final isNative result:', isNative);
    
    return isNative;
  } catch (error) {
    console.error('🔍 Error detecting native platform:', error);
    // Fallback: if we have Capacitor, assume native
    return typeof Capacitor !== 'undefined';
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
