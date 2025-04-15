/**
 * Performance Monitor
 * Utilities for monitoring and optimizing application performance
 */

import { Logger } from './logger.js';

// Create a logger for performance monitoring
const logger = new Logger({ category: 'PerformanceMonitor' });

/**
 * Performance monitor class
 */
class PerformanceMonitor {
  /**
   * Create a new performance monitor
   * @param {Object} options - Monitor options
   * @param {boolean} options.enabled - Whether monitoring is enabled
   * @param {boolean} options.logToConsole - Whether to log to console
   * @param {number} options.sampleRate - Sample rate for performance data (0-1)
   */
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.logToConsole = options.logToConsole !== false;
    this.sampleRate = options.sampleRate || 0.1; // 10% sample rate by default
    this.metrics = new Map();
    this.marks = new Map();
    this.measures = [];
    this.timers = new Map();
    this.frameRateData = {
      frames: 0,
      lastTime: 0,
      frameRate: 0,
      history: []
    };
    
    // Start monitoring frame rate if enabled
    if (this.enabled) {
      this.startFrameRateMonitoring();
    }
  }

  /**
   * Start monitoring frame rate
   * @private
   */
  startFrameRateMonitoring() {
    if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      return;
    }
    
    this.frameRateData.lastTime = performance.now();
    this.frameRateData.frames = 0;
    
    const frameRateLoop = () => {
      this.frameRateData.frames++;
      
      const now = performance.now();
      const elapsed = now - this.frameRateData.lastTime;
      
      // Update frame rate every second
      if (elapsed >= 1000) {
        this.frameRateData.frameRate = Math.round((this.frameRateData.frames * 1000) / elapsed);
        
        // Keep history of frame rates (last 10 seconds)
        this.frameRateData.history.push(this.frameRateData.frameRate);
        if (this.frameRateData.history.length > 10) {
          this.frameRateData.history.shift();
        }
        
        // Log frame rate if enabled
        if (this.logToConsole && Math.random() < this.sampleRate) {
          logger.debug(`Frame rate: ${this.frameRateData.frameRate} FPS`);
        }
        
        // Reset counters
        this.frameRateData.lastTime = now;
        this.frameRateData.frames = 0;
      }
      
      // Continue loop
      if (this.enabled) {
        requestAnimationFrame(frameRateLoop);
      }
    };
    
    // Start the loop
    requestAnimationFrame(frameRateLoop);
  }

  /**
   * Start a timer
   * @param {string} name - Timer name
   */
  startTimer(name) {
    if (!this.enabled) return;
    
    this.timers.set(name, performance.now());
  }

  /**
   * End a timer and record the duration
   * @param {string} name - Timer name
   * @returns {number} - Duration in milliseconds
   */
  endTimer(name) {
    if (!this.enabled) return 0;
    
    const startTime = this.timers.get(name);
    if (!startTime) {
      logger.warn(`Timer "${name}" not found`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.recordMetric(name, duration);
    
    // Log duration if enabled
    if (this.logToConsole && Math.random() < this.sampleRate) {
      logger.debug(`Timer "${name}": ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }

  /**
   * Record a performance metric
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   */
  recordMetric(name, value) {
    if (!this.enabled) return;
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        values: []
      });
    }
    
    const metric = this.metrics.get(name);
    metric.count++;
    metric.sum += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    
    // Keep last 100 values for calculating percentiles
    metric.values.push(value);
    if (metric.values.length > 100) {
      metric.values.shift();
    }
  }

  /**
   * Create a performance mark
   * @param {string} name - Mark name
   */
  mark(name) {
    if (!this.enabled) return;
    
    this.marks.set(name, performance.now());
    
    // Use the Performance API if available
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  }

  /**
   * Create a performance measure between two marks
   * @param {string} name - Measure name
   * @param {string} startMark - Start mark name
   * @param {string} endMark - End mark name
   * @returns {number} - Duration in milliseconds
   */
  measure(name, startMark, endMark) {
    if (!this.enabled) return 0;
    
    const startTime = this.marks.get(startMark);
    const endTime = endMark ? this.marks.get(endMark) : performance.now();
    
    if (!startTime) {
      logger.warn(`Start mark "${startMark}" not found`);
      return 0;
    }
    
    if (endMark && !endTime) {
      logger.warn(`End mark "${endMark}" not found`);
      return 0;
    }
    
    const duration = endTime - startTime;
    
    // Record the measure
    this.measures.push({
      name,
      startMark,
      endMark: endMark || 'now',
      duration,
      timestamp: Date.now()
    });
    
    // Keep only the last 100 measures
    if (this.measures.length > 100) {
      this.measures.shift();
    }
    
    // Record as a metric
    this.recordMetric(name, duration);
    
    // Use the Performance API if available
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        if (endMark) {
          performance.measure(name, startMark, endMark);
        } else {
          performance.measure(name, startMark);
        }
      } catch (error) {
        // Ignore errors from the Performance API
      }
    }
    
    // Log measure if enabled
    if (this.logToConsole && Math.random() < this.sampleRate) {
      logger.debug(`Measure "${name}": ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }

  /**
   * Get statistics for a metric
   * @param {string} name - Metric name
   * @returns {Object|null} - Metric statistics
   */
  getMetricStats(name) {
    if (!this.enabled || !this.metrics.has(name)) {
      return null;
    }
    
    const metric = this.metrics.get(name);
    const avg = metric.count > 0 ? metric.sum / metric.count : 0;
    
    // Calculate percentiles
    const sortedValues = [...metric.values].sort((a, b) => a - b);
    const p50 = this.getPercentile(sortedValues, 50);
    const p90 = this.getPercentile(sortedValues, 90);
    const p95 = this.getPercentile(sortedValues, 95);
    const p99 = this.getPercentile(sortedValues, 99);
    
    return {
      name,
      count: metric.count,
      avg,
      min: metric.min,
      max: metric.max,
      p50,
      p90,
      p95,
      p99
    };
  }

  /**
   * Get a percentile value from a sorted array
   * @param {Array<number>} sortedValues - Sorted array of values
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number} - Percentile value
   * @private
   */
  getPercentile(sortedValues, percentile) {
    if (sortedValues.length === 0) {
      return 0;
    }
    
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(sortedValues.length - 1, index))];
  }

  /**
   * Get all metric statistics
   * @returns {Array<Object>} - Array of metric statistics
   */
  getAllMetricStats() {
    if (!this.enabled) {
      return [];
    }
    
    return Array.from(this.metrics.keys()).map(name => this.getMetricStats(name));
  }

  /**
   * Get frame rate statistics
   * @returns {Object} - Frame rate statistics
   */
  getFrameRateStats() {
    if (!this.enabled) {
      return {
        current: 0,
        avg: 0,
        min: 0,
        max: 0
      };
    }
    
    const history = this.frameRateData.history;
    const current = this.frameRateData.frameRate;
    
    if (history.length === 0) {
      return {
        current,
        avg: current,
        min: current,
        max: current
      };
    }
    
    const sum = history.reduce((a, b) => a + b, 0);
    const avg = sum / history.length;
    const min = Math.min(...history);
    const max = Math.max(...history);
    
    return {
      current,
      avg,
      min,
      max
    };
  }

  /**
   * Get recent performance measures
   * @param {number} limit - Maximum number of measures to return
   * @returns {Array<Object>} - Array of measures
   */
  getRecentMeasures(limit = 10) {
    if (!this.enabled) {
      return [];
    }
    
    return this.measures.slice(-limit);
  }

  /**
   * Reset all performance data
   */
  reset() {
    this.metrics.clear();
    this.marks.clear();
    this.measures = [];
    this.timers.clear();
    this.frameRateData.history = [];
    
    // Reset Performance API if available
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }
    
    logger.debug('Performance monitor reset');
  }

  /**
   * Enable or disable performance monitoring
   * @param {boolean} enabled - Whether monitoring is enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    
    if (enabled && !this.frameRateData.lastTime) {
      this.startFrameRateMonitoring();
    }
    
    logger.debug(`Performance monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Create a performance-wrapped function
   * @param {Function} fn - Function to wrap
   * @param {string} name - Name for the performance measure
   * @returns {Function} - Wrapped function
   */
  wrapFunction(fn, name) {
    if (!this.enabled) {
      return fn;
    }
    
    return (...args) => {
      this.startTimer(name);
      try {
        return fn(...args);
      } finally {
        this.endTimer(name);
      }
    };
  }

  /**
   * Create a performance-wrapped async function
   * @param {Function} fn - Async function to wrap
   * @param {string} name - Name for the performance measure
   * @returns {Function} - Wrapped async function
   */
  wrapAsyncFunction(fn, name) {
    if (!this.enabled) {
      return fn;
    }
    
    return async (...args) => {
      this.startTimer(name);
      try {
        return await fn(...args);
      } finally {
        this.endTimer(name);
      }
    };
  }
}

// Create a singleton instance
const performanceMonitor = new PerformanceMonitor();

export { PerformanceMonitor, performanceMonitor };
