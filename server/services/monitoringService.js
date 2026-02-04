/**
 * MonitoringService
 * Application health monitoring, uptime tracking, and log aggregation for TRM
 * Features: Health checks, dependency monitoring, service status, log aggregation
 */

const { EventEmitter } = require('events');
const mongoose = require('mongoose');
const os = require('os');
const performanceMonitor = require('./performanceMonitor.js');
const cacheService = require('./cacheService.js');
const connectionPoolService = require('./connectionPool.js');

// Configuration
const CONFIG = {
  // Check intervals
  HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL, 10) || 30000, // 30 seconds
  UPTIME_INTERVAL: parseInt(process.env.UPTIME_INTERVAL, 10) || 60000, // 1 minute
  EXTERNAL_CHECK_INTERVAL: parseInt(process.env.EXTERNAL_CHECK_INTERVAL, 10) || 60000, // 1 minute
  
  // Health check timeouts
  DATABASE_TIMEOUT: 5000,
  CACHE_TIMEOUT: 3000,
  EXTERNAL_TIMEOUT: 10000,
  
  // Log retention
  MAX_LOG_ENTRIES: parseInt(process.env.MAX_LOG_ENTRIES, 10) || 10000,
  LOG_RETENTION_HOURS: parseInt(process.env.LOG_RETENTION_HOURS, 10) || 24,
  
  // Service identification
  SERVICE_NAME: process.env.SERVICE_NAME || 'trm-api',
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  HOSTNAME: os.hostname(),
};

/**
 * Circular buffer for log storage
 */
class LogBuffer {
  constructor(maxSize = 10000) {
    this.maxSize = maxSize;
    this.buffer = [];
  }

  push(entry) {
    this.buffer.push(entry);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  getAll(level = null, limit = 100) {
    let logs = this.buffer;
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    return logs.slice(-limit).reverse();
  }

  clear() {
    this.buffer = [];
  }

  getCount() {
    return this.buffer.length;
  }
}

/**
 * External service health checker
 */
class ExternalServiceChecker {
  constructor(name, config) {
    this.name = name;
    this.url = config.url;
    this.timeout = config.timeout || CONFIG.EXTERNAL_TIMEOUT;
    this.headers = config.headers || {};
    this.method = config.method || 'GET';
    this.expectedStatus = config.expectedStatus || 200;
    this.lastCheck = null;
    this.status = 'unknown';
    this.responseTime = null;
    this.errorMessage = null;
    this.uptime = 0;
    this.totalChecks = 0;
    this.successfulChecks = 0;
  }

  async check() {
    const startTime = Date.now();
    this.totalChecks++;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.url, {
        method: this.method,
        headers: this.headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      this.responseTime = Date.now() - startTime;
      this.lastCheck = new Date().toISOString();

      if (response.status === this.expectedStatus) {
        this.status = 'healthy';
        this.successfulChecks++;
        this.errorMessage = null;
      } else {
        this.status = 'unhealthy';
        this.errorMessage = `Unexpected status: ${response.status}`;
      }
    } catch (error) {
      this.responseTime = Date.now() - startTime;
      this.lastCheck = new Date().toISOString();
      this.status = 'unhealthy';
      this.errorMessage = error.message;
    }

    this.uptime = this.totalChecks > 0 
      ? (this.successfulChecks / this.totalChecks) 
      : 0;

    return this.getStatus();
  }

  getStatus() {
    return {
      name: this.name,
      url: this.url,
      status: this.status,
      lastCheck: this.lastCheck,
      responseTime: this.responseTime,
      errorMessage: this.errorMessage,
      uptime: this.uptime,
      totalChecks: this.totalChecks,
      successfulChecks: this.successfulChecks,
    };
  }
}

/**
 * Uptime tracker
 */
class UptimeTracker {
  constructor() {
    this.startTime = Date.now();
    this.checks = [];
    this.downtimePeriods = [];
    this.currentDowntime = null;
  }

  recordCheck(status) {
    const now = Date.now();
    const check = {
      timestamp: now,
      status,
      uptime: this.calculateUptime(),
    };

    this.checks.push(check);

    // Keep only last 24 hours of checks
    const cutoff = now - (24 * 60 * 60 * 1000);
    this.checks = this.checks.filter(c => c.timestamp > cutoff);

    // Track downtime
    if (status === 'unhealthy' || status === 'critical') {
      if (!this.currentDowntime) {
        this.currentDowntime = { start: now, end: null };
      }
    } else {
      if (this.currentDowntime) {
        this.currentDowntime.end = now;
        this.downtimePeriods.push(this.currentDowntime);
        this.currentDowntime = null;
      }
    }
  }

  calculateUptime(timeWindowMs = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    const cutoff = now - timeWindowMs;
    const recentChecks = this.checks.filter(c => c.timestamp > cutoff);

    if (recentChecks.length === 0) {
      return 1.0; // Assume 100% if no checks
    }

    const healthyChecks = recentChecks.filter(
      c => c.status === 'healthy' || c.status === 'degraded'
    );

    return healthyChecks.length / recentChecks.length;
  }

  getDowntimeStats(timeWindowMs = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    const cutoff = now - timeWindowMs;
    
    let totalDowntime = 0;
    const periods = [];

    for (const period of this.downtimePeriods) {
      if (period.start > cutoff) {
        const duration = (period.end || now) - period.start;
        totalDowntime += duration;
        periods.push({
          start: new Date(period.start).toISOString(),
          end: period.end ? new Date(period.end).toISOString() : null,
          duration,
        });
      }
    }

    // Include current downtime if any
    if (this.currentDowntime && this.currentDowntime.start > cutoff) {
      const duration = now - this.currentDowntime.start;
      totalDowntime += duration;
      periods.push({
        start: new Date(this.currentDowntime.start).toISOString(),
        end: null,
        duration,
      });
    }

    return {
      totalDowntime,
      totalDowntimeMinutes: Math.round(totalDowntime / 60000),
      periods,
    };
  }

  getStats(timeWindowMs = 24 * 60 * 60 * 1000) {
    return {
      serviceStartTime: new Date(this.startTime).toISOString(),
      uptimePercentage: this.calculateUptime(timeWindowMs),
      uptimePercentageFormatted: `${(this.calculateUptime(timeWindowMs) * 100).toFixed(2)}%`,
      ...this.getDowntimeStats(timeWindowMs),
      totalChecks: this.checks.length,
      checkFrequency: CONFIG.UPTIME_INTERVAL,
    };
  }
}

/**
 * Service dependency manager
 */
class DependencyManager {
  constructor() {
    this.dependencies = new Map();
  }

  register(name, checker) {
    this.dependencies.set(name, checker);
  }

  async checkAll() {
    const results = {};
    for (const [name, checker] of this.dependencies) {
      try {
        if (typeof checker === 'function') {
          results[name] = await checker();
        } else if (checker && typeof checker.check === 'function') {
          results[name] = await checker.check();
        } else {
          results[name] = checker;
        }
      } catch (error) {
        results[name] = {
          status: 'error',
          error: error.message,
        };
      }
    }
    return results;
  }

  getDependency(name) {
    return this.dependencies.get(name);
  }

  hasDependency(name) {
    return this.dependencies.has(name);
  }
}

/**
 * MonitoringService
 * Main service for application monitoring and health checks
 */
class MonitoringService extends EventEmitter {
  constructor() {
    super();
    
    // State
    this.isMonitoring = false;
    this.healthCheckInterval = null;
    this.uptimeInterval = null;
    this.externalCheckInterval = null;
    
    // Components
    this.logBuffer = new LogBuffer(CONFIG.MAX_LOG_ENTRIES);
    this.uptimeTracker = new UptimeTracker();
    this.dependencyManager = new DependencyManager();
    this.externalServices = new Map();
    
    // Last health check result
    this.lastHealthCheck = null;
    
    // Service configuration
    this.externalServiceConfigs = [];
    
    // Bind methods
    this.runHealthChecks = this.runHealthChecks.bind(this);
    this.recordUptime = this.recordUptime.bind(this);
    this.checkExternalServices = this.checkExternalServices.bind(this);
  }

  // ==================== Initialization ====================

  /**
   * Initialize monitoring service
   * @param {Object} options - Configuration options
   */
  initialize(options = {}) {
    // Merge external service configs
    if (options.externalServices) {
      this.externalServiceConfigs = options.externalServices;
      for (const config of options.externalServices) {
        const checker = new ExternalServiceChecker(config.name, config);
        this.externalServices.set(config.name, checker);
      }
    }

    // Register default dependencies
    this.registerDefaultDependencies();

    this.emit('initialized');
    console.log('Monitoring service initialized');
    return this;
  }

  /**
   * Register default system dependencies
   */
  registerDefaultDependencies() {
    // Database dependency
    this.dependencyManager.register('database', async () => {
      return this.checkDatabaseHealth();
    });

    // Cache dependency
    this.dependencyManager.register('cache', async () => {
      return this.checkCacheHealth();
    });

    // External services
    this.dependencyManager.register('externalServices', async () => {
      return this.checkExternalServices();
    });
  }

  /**
   * Configure external services to monitor
   * @param {Array} services - Array of service configurations
   */
  configureExternalServices(services) {
    for (const config of services) {
      const checker = new ExternalServiceChecker(config.name, config);
      this.externalServices.set(config.name, checker);
    }
  }

  // ==================== Health Checks ====================

  /**
   * Run all health checks
   * @returns {Promise<Object>} Complete health check results
   */
  async checkHealth() {
    const startTime = Date.now();
    
    const [appHealth, dbHealth, cacheHealth, externalHealth, perfHealth] = await Promise.all([
      this.checkApplicationHealth(),
      this.checkDatabaseHealth(),
      this.checkCacheHealth(),
      this.checkExternalServices(),
      this.checkPerformanceHealth(),
    ]);

    // Determine overall status
    const statuses = [
      appHealth.status,
      dbHealth.status,
      cacheHealth.status,
      ...Object.values(externalHealth).map(s => s.status),
    ];

    let overallStatus = 'healthy';
    if (statuses.some(s => s === 'critical')) {
      overallStatus = 'critical';
    } else if (statuses.some(s => s === 'unhealthy' || s === 'degraded')) {
      overallStatus = 'degraded';
    }

    const healthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      service: {
        name: CONFIG.SERVICE_NAME,
        environment: CONFIG.ENVIRONMENT,
        hostname: CONFIG.HOSTNAME,
        pid: process.pid,
        uptime: process.uptime(),
      },
      checks: {
        application: appHealth,
        database: dbHealth,
        cache: cacheHealth,
        external: externalHealth,
        performance: perfHealth,
      },
    };

    this.lastHealthCheck = healthCheck;
    this.emit('healthCheck', healthCheck);

    // Record for uptime tracking
    this.uptimeTracker.recordCheck(overallStatus);

    return healthCheck;
  }

  /**
   * Check application health
   * @returns {Object} Application health status
   */
  checkApplicationHealth() {
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    let status = 'healthy';
    const issues = [];

    if (memPercent > 90) {
      status = 'critical';
      issues.push(`Memory usage critical: ${memPercent.toFixed(2)}%`);
    } else if (memPercent > 80) {
      status = 'degraded';
      issues.push(`Memory usage high: ${memPercent.toFixed(2)}%`);
    }

    // Check event loop lag from performance monitor
    const perfMetrics = performanceMonitor.getMetrics();
    if (perfMetrics.system.eventLoop.lag > 100) {
      status = status === 'healthy' ? 'degraded' : 'critical';
      issues.push(`Event loop lag high: ${perfMetrics.system.eventLoop.lag.toFixed(2)}ms`);
    }

    return {
      status,
      issues: issues.length > 0 ? issues : undefined,
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percent: memPercent.toFixed(2),
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check MongoDB connectivity
   * @returns {Promise<Object>} Database health status
   */
  async checkDatabaseHealth() {
    const startTime = Date.now();
    
    try {
      // Check mongoose connection state
      const state = mongoose.connection.readyState;
      const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
      
      if (state !== 1) {
        return {
          status: 'critical',
          state: states[state] || 'unknown',
          responseTime: Date.now() - startTime,
          error: 'MongoDB not connected',
          timestamp: new Date().toISOString(),
        };
      }

      // Try a simple ping
      const adminDb = mongoose.connection.db.admin();
      const pingResult = await Promise.race([
        adminDb.ping(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database ping timeout')), CONFIG.DATABASE_TIMEOUT)
        ),
      ]);

      // Get connection pool stats
      const poolHealth = connectionPoolService.getHealth();

      return {
        status: poolHealth.status === 'healthy' ? 'healthy' : 'degraded',
        state: states[state],
        responseTime: Date.now() - startTime,
        pool: {
          totalConnections: poolHealth.totalConnections,
          healthy: poolHealth.healthy,
          unhealthy: poolHealth.unhealthy,
          queueSize: poolHealth.queueSize,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check Redis cache connectivity
   * @returns {Object} Cache health status
   */
  checkCacheHealth() {
    const startTime = Date.now();
    
    try {
      const cacheHealth = cacheService.getHealth();
      
      return {
        status: cacheHealth.status,
        responseTime: Date.now() - startTime,
        l1: cacheHealth.l1,
        l2: cacheHealth.l2,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check external API health
   * @returns {Promise<Object>} External services health status
   */
  async checkExternalServices() {
    const results = {};
    
    for (const [name, checker] of this.externalServices) {
      results[name] = await checker.check();
    }

    return results;
  }

  /**
   * Check performance metrics health
   * @returns {Object} Performance health status
   */
  checkPerformanceHealth() {
    const healthMetrics = performanceMonitor.getHealthMetrics();
    
    return {
      status: healthMetrics.status,
      checks: healthMetrics.checks,
      metrics: healthMetrics.metrics,
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== Service Status ====================

  /**
   * Get overall service status
   * @returns {Object} Complete service status
   */
  getServiceStatus() {
    const perfMetrics = performanceMonitor.getMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      service: {
        name: CONFIG.SERVICE_NAME,
        environment: CONFIG.ENVIRONMENT,
        hostname: CONFIG.HOSTNAME,
        pid: process.pid,
        uptime: process.uptime(),
        uptimeFormatted: this.formatUptime(process.uptime()),
      },
      health: this.lastHealthCheck || { status: 'unknown' },
      performance: {
        requestsPerSecond: perfMetrics.http.requests.rate,
        errorRate: perfMetrics.http.errors.rate,
        averageResponseTime: perfMetrics.http.duration.mean,
        p95ResponseTime: perfMetrics.http.duration.p95,
      },
      resources: {
        cpu: perfMetrics.system.cpu,
        memory: perfMetrics.system.memory,
        eventLoopLag: perfMetrics.system.eventLoop.lag,
      },
      uptime: this.uptimeTracker.getStats(),
    };
  }

  /**
   * Format uptime seconds to readable string
   * @param {number} seconds - Uptime in seconds
   * @returns {string} Formatted uptime
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  }

  // ==================== Uptime Monitoring ====================

  /**
   * Record uptime metrics
   */
  recordUptime() {
    const status = this.lastHealthCheck?.status || 'unknown';
    this.uptimeTracker.recordCheck(status);
    
    this.emit('uptimeRecorded', {
      timestamp: new Date().toISOString(),
      status,
      stats: this.uptimeTracker.getStats(),
    });
  }

  /**
   * Get uptime statistics
   * @param {number} timeWindowHours - Time window in hours
   * @returns {Object} Uptime statistics
   */
  getUptimeStats(timeWindowHours = 24) {
    const timeWindowMs = timeWindowHours * 60 * 60 * 1000;
    return this.uptimeTracker.getStats(timeWindowMs);
  }

  // ==================== Log Aggregation ====================

  /**
   * Log an event
   * @param {string} level - Log level (debug, info, warn, error, critical)
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  logEvent(level, message, metadata = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata: {
        ...metadata,
        service: CONFIG.SERVICE_NAME,
        hostname: CONFIG.HOSTNAME,
        pid: process.pid,
      },
    };

    this.logBuffer.push(entry);
    this.emit('log', entry);

    // Also log to console based on level
    const logMethod = this.getLogMethod(level);
    if (logMethod && metadata.error) {
      console[logMethod](`[${level.toUpperCase()}] ${message}`, metadata.error);
    } else if (logMethod) {
      console[logMethod](`[${level.toUpperCase()}] ${message}`, metadata);
    }

    return entry;
  }

  /**
   * Get console log method for level
   * @param {string} level - Log level
   * @returns {string|null} Console method name
   */
  getLogMethod(level) {
    switch (level) {
      case 'debug':
        return 'debug';
      case 'info':
        return 'info';
      case 'warn':
      case 'warning':
        return 'warn';
      case 'error':
      case 'critical':
        return 'error';
      default:
        return 'log';
    }
  }

  /**
   * Get recent logs
   * @param {string} level - Filter by level
   * @param {number} limit - Maximum number of logs
   * @returns {Array} Recent logs
   */
  getRecentLogs(level = null, limit = 100) {
    return this.logBuffer.getAll(level, limit);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logBuffer.clear();
    this.emit('logsCleared');
  }

  // ==================== Lifecycle Methods ====================

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Start health checks
    this.runHealthChecks();
    this.healthCheckInterval = setInterval(
      this.runHealthChecks,
      CONFIG.HEALTH_CHECK_INTERVAL
    );

    // Start uptime recording
    this.uptimeInterval = setInterval(
      this.recordUptime,
      CONFIG.UPTIME_INTERVAL
    );

    // Start external service checks
    this.externalCheckInterval = setInterval(
      this.checkExternalServices,
      CONFIG.EXTERNAL_CHECK_INTERVAL
    );

    this.emit('monitoringStarted');
    console.log('Monitoring started');
  }

  /**
   * Run health checks and emit results
   */
  async runHealthChecks() {
    try {
      await this.checkHealth();
    } catch (error) {
      this.emit('healthCheckError', error);
      console.error('Health check failed:', error);
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval);
      this.uptimeInterval = null;
    }

    if (this.externalCheckInterval) {
      clearInterval(this.externalCheckInterval);
      this.externalCheckInterval = null;
    }

    this.emit('monitoringStopped');
    console.log('Monitoring stopped');
  }

  /**
   * Get monitoring status
   * @returns {Object} Monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      lastHealthCheck: this.lastHealthCheck,
      logCount: this.logBuffer.getCount(),
      externalServices: Array.from(this.externalServices.keys()),
      uptime: this.uptimeTracker.getStats(),
    };
  }
}

// Export singleton instance
const monitoringService = new MonitoringService();
module.exports = monitoringService;
  MonitoringService, 
  LogBuffer, 
  ExternalServiceChecker, 
  UptimeTracker,
  DependencyManager,
};