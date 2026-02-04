/**
 * Performance Monitoring Routes
 * Performance and optimization API endpoints for TRM
 * Features: Performance reports, query stats, optimization recommendations
 */

const express = require('express');
const performanceMonitor = require('../services/performanceMonitor.js');
const queryOptimizer = require('../services/queryOptimizer.js');
const { asyncHandler } = require('../middleware/errorHandler.js');
const { authenticate } = require('../middleware/auth.js');
const { requireAdmin } = require('../middleware/rbac.js');

const router = express.Router();

// Apply authentication and admin authorization to all performance routes
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route   GET /api/performance/report
 * @desc    Get full performance report
 * @access  Admin only
 */
router.get('/report', asyncHandler(async (req, res) => {
  const { timeWindow = '1h' } = req.query;
  
  // Parse time window
  const timeWindowMs = parseTimeWindow(timeWindow);
  
  const metrics = performanceMonitor.getMetrics();
  const healthMetrics = performanceMonitor.getHealthMetrics();
  const queryStats = queryOptimizer.getQueryStats();
  
  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      timeWindow,
      service: metrics.service,
      health: healthMetrics,
      summary: {
        status: healthMetrics.status,
        requestsPerSecond: metrics.http.requests.rate.toFixed(2),
        errorRate: `${(metrics.http.errors.rate * 100).toFixed(2)}%`,
        avgResponseTime: `${metrics.http.duration.mean.toFixed(2)}ms`,
        p95ResponseTime: `${metrics.http.duration.p95.toFixed(2)}ms`,
        cpuUsage: `${metrics.system.cpu.usage.toFixed(2)}%`,
        memoryUsage: `${metrics.system.memory.percentUsed}%`,
        eventLoopLag: `${metrics.system.eventLoop.lag.toFixed(2)}ms`,
        cacheHitRate: `${(metrics.cache.hitRate * 100).toFixed(2)}%`,
      },
      http: metrics.http,
      database: metrics.database,
      cache: metrics.cache,
      system: metrics.system,
      queries: queryStats,
      endpoints: metrics.endpoints,
    },
  });
}));

/**
 * @route   GET /api/performance/queries
 * @desc    Get query statistics
 * @access  Admin only
 */
router.get('/queries', asyncHandler(async (req, res) => {
  const stats = queryOptimizer.getQueryStats();
  
  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      ...stats,
      avgDuration: `${stats.avgDuration.toFixed(2)}ms`,
      slowQueryRate: `${(stats.slowQueryRate * 100).toFixed(2)}%`,
    },
  });
}));

/**
 * @route   GET /api/performance/queries/slow
 * @desc    Get slow queries list
 * @access  Admin only
 */
router.get('/queries/slow', asyncHandler(async (req, res) => {
  const { 
    threshold = 100, 
    limit = 50,
    modelName,
  } = req.query;
  
  const thresholdNum = parseInt(threshold, 10);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  
  let slowQueries = queryOptimizer.getSlowQueries(thresholdNum, limitNum);
  
  // Filter by model name if provided
  if (modelName) {
    slowQueries = slowQueries.filter(q => q.modelName === modelName);
  }
  
  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      threshold: thresholdNum,
      total: slowQueries.length,
      queries: slowQueries.map(q => ({
        ...q,
        duration: `${q.duration}ms`,
        query: JSON.parse(JSON.stringify(q.query, (key, value) => {
          // Sanitize large values for readability
          if (typeof value === 'string' && value.length > 100) {
            return value.substring(0, 100) + '...';
          }
          return value;
        })),
      })),
    },
  });
}));

/**
 * @route   GET /api/performance/optimization
 * @desc    Get optimization recommendations
 * @access  Admin only
 */
router.get('/optimization', asyncHandler(async (req, res) => {
  const { modelName } = req.query;
  
  const recommendations = [];
  const metrics = performanceMonitor.getMetrics();
  const queryStats = queryOptimizer.getQueryStats();
  
  // Performance-based recommendations
  if (metrics.http.duration.p95 > 5000) {
    recommendations.push({
      type: 'performance',
      severity: 'high',
      message: 'High P95 response time detected',
      details: `Current P95 is ${metrics.http.duration.p95.toFixed(2)}ms`,
      actions: [
        'Review slow queries',
        'Check database index usage',
        'Consider adding caching',
      ],
    });
  }
  
  if (metrics.http.errors.rate > 0.05) {
    recommendations.push({
      type: 'performance',
      severity: 'high',
      message: 'High error rate detected',
      details: `Current error rate is ${(metrics.http.errors.rate * 100).toFixed(2)}%`,
      actions: [
        'Check error logs',
        'Review recent deployments',
        'Examine external service health',
      ],
    });
  }
  
  if (metrics.cache.hitRate < 0.5) {
    recommendations.push({
      type: 'caching',
      severity: 'medium',
      message: 'Low cache hit rate',
      details: `Current hit rate is ${(metrics.cache.hitRate * 100).toFixed(2)}%`,
      actions: [
        'Review cache configuration',
        'Identify cacheable patterns',
        'Adjust TTL values',
      ],
    });
  }
  
  if (queryStats.slowQueryRate > 0.1) {
    recommendations.push({
      type: 'database',
      severity: 'medium',
      message: 'High slow query rate',
      details: `${(queryStats.slowQueryRate * 100).toFixed(2)}% of queries are slow`,
      actions: [
        'Add indexes for slow queries',
        'Review query patterns',
        'Consider query restructuring',
      ],
    });
  }
  
  // Memory recommendations
  const memPercent = parseFloat(metrics.system.memory.percentUsed);
  if (memPercent > 80) {
    recommendations.push({
      type: 'memory',
      severity: 'medium',
      message: 'High memory usage',
      details: `Memory usage is ${memPercent.toFixed(2)}%`,
      actions: [
        'Review memory leaks',
        'Check for large objects in memory',
        'Consider scaling vertically',
      ],
    });
  }
  
  // Event loop recommendations
  if (metrics.system.eventLoop.lag > 50) {
    recommendations.push({
      type: 'event_loop',
      severity: 'medium',
      message: 'High event loop lag',
      details: `Event loop lag is ${metrics.system.eventLoop.lag.toFixed(2)}ms`,
      actions: [
        'Identify blocking operations',
        'Offload heavy tasks to workers',
        'Review synchronous code',
      ],
    });
  }
  
  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      totalRecommendations: recommendations.length,
      highPriority: recommendations.filter(r => r.severity === 'high').length,
      mediumPriority: recommendations.filter(r => r.severity === 'medium').length,
      lowPriority: recommendations.filter(r => r.severity === 'low').length,
      recommendations: recommendations.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
    },
  });
}));

/**
 * @route   GET /api/performance/database
 * @desc    Get database statistics
 * @access  Admin only
 */
router.get('/database', asyncHandler(async (req, res) => {
  const { modelName } = req.query;
  
  const queryStats = queryOptimizer.getQueryStats();
  const metrics = performanceMonitor.getMetrics();
  
  let collectionStats = null;
  if (modelName) {
    // Dynamically import model
    const models = await import('../models/index.js');
    const model = models[modelName] || models.default?.[modelName];
    
    if (model) {
      collectionStats = await queryOptimizer.analyzeCollectionStats(model);
    }
  }
  
  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      queryStats: {
        ...queryStats,
        avgDuration: `${queryStats.avgDuration.toFixed(2)}ms`,
        totalQueries: queryStats.totalQueries,
        slowQueries: queryStats.slowQueries,
        slowQueryRate: `${(queryStats.slowQueryRate * 100).toFixed(2)}%`,
      },
      connectionPool: metrics.database.connectionPool,
      collectionStats,
      topPatterns: queryStats.topPatterns,
      slowestPatterns: queryStats.slowestPatterns,
    },
  });
}));

/**
 * @route   GET /api/performance/endpoints
 * @desc    Get endpoint performance metrics
 * @access  Admin only
 */
router.get('/endpoints', asyncHandler(async (req, res) => {
  const { 
    sortBy = 'requests', 
    order = 'desc',
    minRequests = 10,
  } = req.query;
  
  const metrics = performanceMonitor.getMetrics();
  const endpoints = Object.entries(metrics.endpoints).map(([key, data]) => ({
    key,
    ...data,
  }));
  
  // Filter by minimum requests
  let filteredEndpoints = endpoints.filter(e => e.requests >= parseInt(minRequests, 10));
  
  // Sort endpoints
  const sortField = sortBy === 'errorRate' ? 'errorRate' : 
                    sortBy === 'duration' ? 'duration.p95' : 'requests';
  
  filteredEndpoints.sort((a, b) => {
    const aVal = sortField.includes('.') ? 
      sortField.split('.').reduce((obj, key) => obj[key], a) : a[sortField];
    const bVal = sortField.includes('.') ? 
      sortField.split('.').reduce((obj, key) => obj[key], b) : b[sortField];
    
    return order === 'desc' ? bVal - aVal : aVal - bVal;
  });
  
  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      totalEndpoints: endpoints.length,
      filteredCount: filteredEndpoints.length,
      sortBy,
      order,
      endpoints: filteredEndpoints,
    },
  });
}));

/**
 * Parse time window string to milliseconds
 * @param {string} timeWindow - Time window string (e.g., '1h', '30m', '1d')
 * @returns {number} Milliseconds
 */
function parseTimeWindow(timeWindow) {
  const match = timeWindow.match(/^(\d+)([smhd])$/);
  if (!match) return 60 * 60 * 1000; // Default 1 hour
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  
  return value * multipliers[unit];
}

module.exports = router;
