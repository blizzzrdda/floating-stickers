/**
 * Worker Manager
 * Manages web workers for CPU-intensive tasks
 */

import { Logger } from './logger.js';

// Create a logger for worker operations
const logger = new Logger({ category: 'WorkerManager' });

/**
 * Worker Manager class
 */
class WorkerManager {
  /**
   * Create a new WorkerManager
   * @param {Object} options - Manager options
   * @param {number} options.maxWorkers - Maximum number of workers to create
   * @param {string} options.workerPath - Path to the worker script
   */
  constructor(options = {}) {
    this.maxWorkers = options.maxWorkers || navigator.hardwareConcurrency || 2;
    this.workerPath = options.workerPath || '/services/worker.js';
    this.workers = [];
    this.taskQueue = [];
    this.taskMap = new Map();
    this.nextTaskId = 1;
    this.initialized = false;
  }

  /**
   * Initialize the worker pool
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    logger.debug(`Initializing worker pool with ${this.maxWorkers} workers`);
    
    try {
      // Create workers
      for (let i = 0; i < this.maxWorkers; i++) {
        const worker = new Worker(this.workerPath);
        
        // Set up message handler
        worker.onmessage = this.handleWorkerMessage.bind(this);
        worker.onerror = this.handleWorkerError.bind(this);
        
        this.workers.push({
          worker,
          busy: false,
          id: i + 1
        });
        
        logger.debug(`Created worker ${i + 1}`);
      }
      
      this.initialized = true;
      logger.info(`Worker pool initialized with ${this.workers.length} workers`);
    } catch (error) {
      logger.error('Failed to initialize worker pool:', error);
      throw error;
    }
  }

  /**
   * Handle messages from workers
   * @param {MessageEvent} event - Message event
   * @private
   */
  handleWorkerMessage(event) {
    const { id, type, success, result, error } = event.data;
    
    // Find the task in the map
    const task = this.taskMap.get(id);
    if (!task) {
      logger.warn(`Received message for unknown task ID: ${id}`);
      return;
    }
    
    // Find the worker that sent the message
    const workerIndex = this.workers.findIndex(w => w.worker === event.target);
    if (workerIndex === -1) {
      logger.warn('Received message from unknown worker');
      return;
    }
    
    // Mark the worker as available
    this.workers[workerIndex].busy = false;
    
    // Remove the task from the map
    this.taskMap.delete(id);
    
    // Resolve or reject the task promise
    if (success) {
      logger.debug(`Task ${id} (${type}) completed successfully`);
      task.resolve(result);
    } else {
      logger.error(`Task ${id} (${type}) failed:`, error);
      task.reject(new Error(error.message));
    }
    
    // Process the next task in the queue
    this.processQueue();
  }

  /**
   * Handle worker errors
   * @param {ErrorEvent} event - Error event
   * @private
   */
  handleWorkerError(event) {
    logger.error('Worker error:', event);
    
    // Find the worker that had the error
    const workerIndex = this.workers.findIndex(w => w.worker === event.target);
    if (workerIndex === -1) {
      logger.warn('Error from unknown worker');
      return;
    }
    
    // Mark the worker as available
    this.workers[workerIndex].busy = false;
    
    // Process the next task in the queue
    this.processQueue();
  }

  /**
   * Process the next task in the queue
   * @private
   */
  processQueue() {
    if (this.taskQueue.length === 0) {
      return;
    }
    
    // Find an available worker
    const availableWorker = this.workers.find(w => !w.busy);
    if (!availableWorker) {
      return;
    }
    
    // Get the next task from the queue
    const task = this.taskQueue.shift();
    
    // Mark the worker as busy
    availableWorker.busy = true;
    
    // Send the task to the worker
    logger.debug(`Sending task ${task.id} (${task.type}) to worker ${availableWorker.id}`);
    availableWorker.worker.postMessage({
      id: task.id,
      type: task.type,
      data: task.data
    });
  }

  /**
   * Run a task in a worker
   * @param {string} type - Task type
   * @param {Object} data - Task data
   * @returns {Promise<any>} - Task result
   */
  async runTask(type, data) {
    // Initialize if not already initialized
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Create a new task
    const taskId = this.nextTaskId++;
    
    // Create a promise for the task
    const taskPromise = new Promise((resolve, reject) => {
      // Add the task to the map
      this.taskMap.set(taskId, {
        id: taskId,
        type,
        data,
        resolve,
        reject
      });
      
      // Add the task to the queue
      this.taskQueue.push({
        id: taskId,
        type,
        data
      });
      
      logger.debug(`Added task ${taskId} (${type}) to queue`);
      
      // Process the queue
      this.processQueue();
    });
    
    return taskPromise;
  }

  /**
   * Terminate all workers
   */
  terminate() {
    logger.debug('Terminating worker pool');
    
    // Terminate all workers
    for (const { worker } of this.workers) {
      worker.terminate();
    }
    
    // Clear the worker array
    this.workers = [];
    
    // Reject all pending tasks
    for (const [id, task] of this.taskMap.entries()) {
      task.reject(new Error('Worker pool terminated'));
    }
    
    // Clear the task map and queue
    this.taskMap.clear();
    this.taskQueue = [];
    
    this.initialized = false;
    
    logger.info('Worker pool terminated');
  }

  /**
   * Sanitize text content using a worker
   * @param {string} text - Text to sanitize
   * @returns {Promise<string>} - Sanitized text
   */
  async sanitizeText(text) {
    return this.runTask('sanitize-text', { text });
  }

  /**
   * Process content for display using a worker
   * @param {string} content - Content to process
   * @returns {Promise<Object>} - Processed content information
   */
  async processContent(content) {
    return this.runTask('process-content', { content });
  }

  /**
   * Calculate optimal layout for multiple stickers using a worker
   * @param {Array} stickers - Array of sticker data
   * @returns {Promise<Array>} - Stickers with updated positions
   */
  async calculateLayout(stickers) {
    return this.runTask('calculate-layout', { stickers });
  }

  /**
   * Validate data against a schema using a worker
   * @param {any} value - Value to validate
   * @param {Object} schema - Schema to validate against
   * @returns {Promise<Object>} - Validation result
   */
  async validateData(value, schema) {
    return this.runTask('validate-data', { value, schema });
  }
}

// Create a singleton instance
const workerManager = new WorkerManager();

export { WorkerManager, workerManager };
