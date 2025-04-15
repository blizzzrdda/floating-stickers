/**
 * Render Optimizer
 * Utilities for optimizing rendering performance
 */

import { Logger } from './logger.js';

// Create a logger for render optimization
const logger = new Logger({ category: 'RenderOptimizer' });

/**
 * Throttle a function to limit how often it can be called
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
function throttle(func, limit) {
  let inThrottle;
  let lastFunc;
  let lastRan;
  
  return function(...args) {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      lastRan = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

/**
 * Debounce a function to delay execution until after a period of inactivity
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to call immediately on the leading edge
 * @returns {Function} - Debounced function
 */
function debounce(func, wait, immediate = false) {
  let timeout;
  
  return function(...args) {
    const context = this;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(context, args);
  };
}

/**
 * Request animation frame with fallback
 * @param {Function} callback - Callback function
 * @returns {number} - Request ID
 */
function requestAnimationFrameWithFallback(callback) {
  return window.requestAnimationFrame || 
         window.webkitRequestAnimationFrame || 
         window.mozRequestAnimationFrame || 
         window.msRequestAnimationFrame || 
         (cb => window.setTimeout(cb, 1000/60))(callback);
}

/**
 * Cancel animation frame with fallback
 * @param {number} id - Request ID
 */
function cancelAnimationFrameWithFallback(id) {
  (window.cancelAnimationFrame || 
   window.webkitCancelAnimationFrame || 
   window.mozCancelAnimationFrame || 
   window.msCancelAnimationFrame || 
   window.clearTimeout)(id);
}

/**
 * Optimize DOM updates by batching them in animation frames
 * @param {Function} updateFn - Function to perform DOM updates
 * @returns {Function} - Optimized update function
 */
function batchDOMUpdates(updateFn) {
  let scheduled = false;
  let updates = [];
  
  return function(...args) {
    updates.push(args);
    
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrameWithFallback(() => {
        scheduled = false;
        const batchedUpdates = [...updates];
        updates = [];
        
        updateFn(batchedUpdates);
      });
    }
  };
}

/**
 * Create a function that only runs when the browser is idle
 * @param {Function} func - Function to run during idle time
 * @param {Object} options - requestIdleCallback options
 * @returns {Function} - Function that schedules work during idle time
 */
function runWhenIdle(func, options = { timeout: 1000 }) {
  return function(...args) {
    const context = this;
    
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        func.apply(context, args);
      }, options);
    } else {
      // Fallback for browsers that don't support requestIdleCallback
      setTimeout(() => {
        func.apply(context, args);
      }, 1);
    }
  };
}

/**
 * Optimize element visibility checks
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - Whether the element is visible in viewport
 */
function isElementInViewport(element) {
  const rect = element.getBoundingClientRect();
  
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Optimize element visibility checks with margin
 * @param {HTMLElement} element - Element to check
 * @param {number} margin - Margin in pixels
 * @returns {boolean} - Whether the element is visible in viewport with margin
 */
function isElementNearViewport(element, margin = 100) {
  const rect = element.getBoundingClientRect();
  const viewHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewWidth = window.innerWidth || document.documentElement.clientWidth;
  
  return (
    rect.bottom >= 0 - margin &&
    rect.right >= 0 - margin &&
    rect.top <= viewHeight + margin &&
    rect.left <= viewWidth + margin
  );
}

export {
  throttle,
  debounce,
  requestAnimationFrameWithFallback,
  cancelAnimationFrameWithFallback,
  batchDOMUpdates,
  runWhenIdle,
  isElementInViewport,
  isElementNearViewport
};
