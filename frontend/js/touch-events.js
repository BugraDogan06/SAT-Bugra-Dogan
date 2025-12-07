/**
 * Touch Events & Cross-Browser Compatibility
 * Handles touch events for mobile devices and ensures cross-browser compatibility
 */

// Detect touch device
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

// Add touch class to body for CSS targeting
if (isTouchDevice) {
  document.body.classList.add('touch-device');
} else {
  document.body.classList.add('no-touch-device');
}

// Prevent double-tap zoom on iOS
let lastTouchEnd = 0;
document.addEventListener('touchend', function(event) {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// Add passive event listeners for better performance
const addPassiveEventListener = (element, event, handler) => {
  if (element && handler) {
    const options = { passive: true };
    element.addEventListener(event, handler, options);
  }
};

// Remove passive event listeners
const removePassiveEventListener = (element, event, handler) => {
  if (element && handler) {
    element.removeEventListener(event, handler);
  }
};

// Touch-friendly click handler (prevents 300ms delay)
const addTouchClick = (element, handler) => {
  if (!element || !handler) return;
  
  let touchStartX, touchStartY, touchEndX, touchEndY;
  const touchThreshold = 10; // pixels
  
  const touchStart = (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };
  
  const touchEnd = (e) => {
    touchEndX = e.changedTouches[0].clientX;
    touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = Math.abs(touchEndX - touchStartX);
    const deltaY = Math.abs(touchEndY - touchStartY);
    
    // If movement is minimal, treat as click
    if (deltaX < touchThreshold && deltaY < touchThreshold) {
      e.preventDefault();
      handler(e);
    }
  };
  
  if (isTouchDevice) {
    element.addEventListener('touchstart', touchStart, { passive: true });
    element.addEventListener('touchend', touchEnd, { passive: false });
  } else {
    element.addEventListener('click', handler);
  }
};

// Smooth scroll with fallback
const smoothScrollTo = (element, offset = 0) => {
  if (!element) return;
  
  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
  const offsetPosition = elementPosition - offset;
  
  if ('scrollBehavior' in document.documentElement.style) {
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  } else {
    // Fallback for older browsers
    window.scrollTo(0, offsetPosition);
  }
};

// Viewport height fix for mobile browsers
const setViewportHeight = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

// Set viewport height on load and resize
if (typeof window !== 'undefined') {
  setViewportHeight();
  window.addEventListener('resize', setViewportHeight);
  window.addEventListener('orientationchange', setViewportHeight);
}

// Export functions
if (typeof window !== 'undefined') {
  window.isTouchDevice = isTouchDevice;
  window.addTouchClick = addTouchClick;
  window.smoothScrollTo = smoothScrollTo;
  window.addPassiveEventListener = addPassiveEventListener;
  window.removePassiveEventListener = removePassiveEventListener;
}

