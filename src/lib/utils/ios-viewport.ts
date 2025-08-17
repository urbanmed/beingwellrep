// iOS viewport height fix utility
// This addresses the iOS viewport height issues with 100vh

export const setIOSViewportHeight = () => {
  // Only run on client side
  if (typeof window === 'undefined') return;

  const setVH = () => {
    // Get the actual viewport height
    const vh = window.innerHeight * 0.01;
    // Set the CSS variable
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  // Set initial value
  setVH();

  // Update on resize and orientation change
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', () => {
    // Delay to account for iOS animation
    setTimeout(setVH, 100);
  });

  // Update on visibilitychange (for iOS Safari address bar)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      setTimeout(setVH, 100);
    }
  });

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', setVH);
    window.removeEventListener('orientationchange', setVH);
    document.removeEventListener('visibilitychange', setVH);
  };
};

// Detect if we're running on iOS
export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// Detect if we're in a Capacitor iOS app
export const isCapacitorIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return !!(window as any).Capacitor && isIOS();
};

// Get safe area insets programmatically
export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const computedStyle = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
    bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0'),
    right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0'),
  };
};