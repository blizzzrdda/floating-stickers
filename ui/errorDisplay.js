/**
 * Error Display UI Components for the Sticker application
 * Provides user-friendly error messages and recovery options
 */

import { ERROR_CATEGORIES } from '../utils/errorHandler.js';
import { Logger } from '../utils/logger.js';

// Create a logger for error display
const logger = new Logger({ category: 'ErrorDisplay' });

/**
 * Create a toast notification element
 * @param {string} message - Message to display
 * @param {string} type - Toast type (error, warning, info)
 * @param {number} duration - Duration in milliseconds
 * @returns {HTMLElement} Toast element
 */
function createToast(message, type = 'error', duration = 5000) {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
    `;
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.cssText = `
    background-color: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#4caf50'};
    color: white;
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 10px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-width: 250px;
    max-width: 400px;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.3s, transform 0.3s;
  `;
  
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  toast.appendChild(messageElement);
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    background: none;
    border: none;
    color: white;
    font-size: 16px;
    cursor: pointer;
    margin-left: 10px;
  `;
  closeButton.onclick = () => {
    removeToast(toast);
  };
  toast.appendChild(closeButton);
  
  // Add toast to container
  toastContainer.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);
  
  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      removeToast(toast);
    }, duration);
  }
  
  return toast;
}

/**
 * Remove a toast element
 * @param {HTMLElement} toast - Toast element to remove
 */
function removeToast(toast) {
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(20px)';
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
    
    // Remove container if empty
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer && toastContainer.children.length === 0) {
      document.body.removeChild(toastContainer);
    }
  }, 300);
}

/**
 * Create a modal dialog for displaying errors
 * @param {Object} options - Modal options
 * @param {string} options.title - Modal title
 * @param {string} options.message - Modal message
 * @param {string} options.errorCode - Error reference code
 * @param {Function} options.onRetry - Retry callback
 * @param {Function} options.onClose - Close callback
 * @returns {HTMLElement} Modal element
 */
function createErrorModal(options) {
  const {
    title = 'Error',
    message = 'An error occurred.',
    errorCode = '',
    onRetry = null,
    onClose = null
  } = options;
  
  // Create modal backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  `;
  
  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = `
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    width: 400px;
    max-width: 90%;
    padding: 20px;
    opacity: 0;
    transform: scale(0.9);
    transition: opacity 0.3s, transform 0.3s;
  `;
  
  // Create modal header
  const header = document.createElement('div');
  header.className = 'modal-header';
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  `;
  
  // Create title
  const titleElement = document.createElement('h3');
  titleElement.textContent = title;
  titleElement.style.cssText = `
    margin: 0;
    color: #f44336;
  `;
  header.appendChild(titleElement);
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #888;
  `;
  closeButton.onclick = () => {
    closeModal();
    if (onClose) onClose();
  };
  header.appendChild(closeButton);
  
  modal.appendChild(header);
  
  // Create modal body
  const body = document.createElement('div');
  body.className = 'modal-body';
  body.style.cssText = `
    margin-bottom: 20px;
  `;
  
  // Create message
  const messageElement = document.createElement('p');
  messageElement.textContent = message;
  body.appendChild(messageElement);
  
  // Create error code if provided
  if (errorCode) {
    const codeElement = document.createElement('p');
    codeElement.textContent = `Error code: ${errorCode}`;
    codeElement.style.cssText = `
      font-size: 12px;
      color: #888;
      margin-top: 10px;
    `;
    body.appendChild(codeElement);
  }
  
  modal.appendChild(body);
  
  // Create modal footer
  const footer = document.createElement('div');
  footer.className = 'modal-footer';
  footer.style.cssText = `
    display: flex;
    justify-content: flex-end;
  `;
  
  // Create retry button if callback provided
  if (onRetry) {
    const retryButton = document.createElement('button');
    retryButton.textContent = 'Retry';
    retryButton.style.cssText = `
      background-color: #4caf50;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      margin-right: 10px;
      cursor: pointer;
    `;
    retryButton.onclick = () => {
      closeModal();
      onRetry();
    };
    footer.appendChild(retryButton);
  }
  
  // Create close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = `
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
  `;
  closeBtn.onclick = () => {
    closeModal();
    if (onClose) onClose();
  };
  footer.appendChild(closeBtn);
  
  modal.appendChild(footer);
  
  // Add modal to backdrop
  backdrop.appendChild(modal);
  
  // Add backdrop to document
  document.body.appendChild(backdrop);
  
  // Trigger animation
  setTimeout(() => {
    modal.style.opacity = '1';
    modal.style.transform = 'scale(1)';
  }, 10);
  
  // Function to close modal
  function closeModal() {
    modal.style.opacity = '0';
    modal.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
      if (backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
    }, 300);
  }
  
  return backdrop;
}

/**
 * Display an error message to the user
 * @param {Object} errorInfo - Error information
 * @param {string} errorInfo.category - Error category
 * @param {string} errorInfo.userMessage - User-friendly error message
 * @param {string} errorInfo.errorCode - Error reference code
 * @param {boolean} errorInfo.recoverable - Whether the error is recoverable
 * @param {Function} onRetry - Retry callback
 */
function displayError(errorInfo, onRetry = null) {
  const { category, userMessage, errorCode, recoverable } = errorInfo;
  
  logger.info(`Displaying error to user: ${category}`, { errorInfo });
  
  // Determine if this error should be displayed as a modal or toast
  const isCritical = [
    ERROR_CATEGORIES.PERMISSION_DENIED,
    ERROR_CATEGORIES.UNKNOWN
  ].includes(category);
  
  if (isCritical) {
    // Display as modal for critical errors
    createErrorModal({
      title: 'Error',
      message: userMessage,
      errorCode,
      onRetry: recoverable ? onRetry : null
    });
  } else {
    // Display as toast for non-critical errors
    const toast = createToast(userMessage, 'error');
    
    // Add retry button if error is recoverable
    if (recoverable && onRetry) {
      const retryButton = document.createElement('button');
      retryButton.textContent = 'Retry';
      retryButton.style.cssText = `
        background-color: white;
        color: #f44336;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        margin-left: 10px;
        cursor: pointer;
        font-size: 12px;
      `;
      retryButton.onclick = (e) => {
        e.stopPropagation();
        removeToast(toast);
        onRetry();
      };
      
      // Insert before the close button
      toast.insertBefore(retryButton, toast.lastChild);
    }
  }
}

/**
 * Display a warning message to the user
 * @param {string} message - Warning message
 * @param {number} duration - Duration in milliseconds
 */
function displayWarning(message, duration = 5000) {
  logger.info(`Displaying warning to user: ${message}`);
  createToast(message, 'warning', duration);
}

/**
 * Display an info message to the user
 * @param {string} message - Info message
 * @param {number} duration - Duration in milliseconds
 */
function displayInfo(message, duration = 3000) {
  logger.info(`Displaying info to user: ${message}`);
  createToast(message, 'info', duration);
}

export {
  displayError,
  displayWarning,
  displayInfo,
  createToast,
  createErrorModal
};
