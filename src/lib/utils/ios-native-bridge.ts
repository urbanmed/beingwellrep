// iOS native bridge utilities for Capacitor iOS app
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardStyle, KeyboardResize } from '@capacitor/keyboard';
import { isCapacitorIOS, setIOSViewportHeight } from './ios-viewport';

// Initialize iOS-specific configurations
export const initializeIOSNativeBridge = async () => {
  if (!isCapacitorIOS()) {
    console.log('Not running on Capacitor iOS, skipping native bridge initialization');
    return;
  }

  try {
    // Set up viewport height handling
    const cleanupViewport = setIOSViewportHeight();

    // Configure status bar for iOS
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
    await StatusBar.setOverlaysWebView({ overlay: false });

    // Configure keyboard for iOS
    await Keyboard.setAccessoryBarVisible({ isVisible: false });
    await Keyboard.setScroll({ isDisabled: false });
    await Keyboard.setStyle({ style: KeyboardStyle.Light });
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });

    // Add keyboard event listeners
    Keyboard.addListener('keyboardWillShow', (info) => {
      console.log('Keyboard will show with height:', info.keyboardHeight);
      document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
    });

    Keyboard.addListener('keyboardWillHide', () => {
      console.log('Keyboard will hide');
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    });

    // Return cleanup function
    return () => {
      cleanupViewport?.();
      Keyboard.removeAllListeners();
    };

  } catch (error) {
    console.error('Failed to initialize iOS native bridge:', error);
  }
};

// Handle iOS-specific errors with user-friendly messages
export const handleIOSError = (error: Error, context: string) => {
  console.error(`iOS Error in ${context}:`, error);
  
  // Check for specific iOS error patterns
  if (error.message.includes('WebKit.Networking')) {
    console.warn('WebKit networking error detected - this is usually non-critical in production');
    return;
  }
  
  if (error.message.includes('RTIInputSystemClient')) {
    console.warn('iOS input system warning detected - this is usually non-critical');
    return;
  }
  
  if (error.message.includes('WebPrivacy')) {
    console.warn('iOS WebPrivacy warning detected - this is expected in development');
    return;
  }
  
  // For other errors, log them but don't interrupt the user experience
  console.error('Unhandled iOS error:', error);
};

// Check if we're in iOS development mode
export const isIOSDevelopmentMode = (): boolean => {
  return isCapacitorIOS() && Capacitor.isNativePlatform() && process.env.NODE_ENV === 'development';
};

// Get iOS device info
export const getIOSDeviceInfo = () => {
  if (!isCapacitorIOS()) return null;
  
  return {
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    userAgent: navigator.userAgent
  };
};