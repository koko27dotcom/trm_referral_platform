/**
 * Admin Routes
 * "God Mode" API routes for platform administration
 * Provides secure endpoints for dashboard, user management, and payout processing
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireAdmin } = require('../middleware/rbac.js');
const { asyncHandler } = require('../middleware/errorHandler.js');
const {
  getDashboardStats,
  getPendingPayouts,
  batchProcessPayouts,
  getAllUsers,
  getAllCompanies,
  getRevenueAnalytics,
  updateUserStatus,
} = require('../controllers/adminController.js');

const router = express.Router();

// Apply authentication and admin requirement to all routes
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get comprehensive admin dashboard statistics
 * @access  Private (Admin)
 * @query   period - Time period for stats (24h, 7d, 30d, 90d, 1y)
 */
router.get('/dashboard', asyncHandler(getDashboardStats));

/**
 * @route   GET /api/v1/admin/payouts/pending
 * @desc    Get detailed pending payouts list
 * @access  Private (Admin)
 * @query   page - Page number
 * @query   limit - Items per page
 * @query   status - Filter by status (pending, approved, all)
 */
router.get('/payouts/pending', asyncHandler(getPendingPayouts));

/**
 * @route   POST /api/v1/admin/payouts/process
 * @desc    Batch process payouts (approve/reject/mark_paid)
 * @access  Private (Admin)
 * @body    payoutIds - Array of payout IDs to process
 * @body    action - Action to perform (approve, reject, mark_paid)
 * @body    paymentInfo - Optional payment details for mark_paid action
 */
router.post('/payouts/process', asyncHandler(batchProcessPayouts));

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with optional filtering
 * @access  Private (Admin)
 * @query   page - Page number
 * @query   limit - Items per page
 * @query   search - Search by name or email
 * @query   role - Filter by role
 * @query   status - Filter by status
 * @query   sortBy - Sort field
 * @query   sortOrder - Sort direction (asc/desc)
 */
router.get('/users', asyncHandler(getAllUsers));

/**
 * @route   PATCH /api/v1/admin/users/:id/status
 * @desc    Update user status (suspend/activate)
 * @access  Private (Admin)
 * @param   id - User ID
 * @body    status - New status (active/suspended)
 * @body    reason - Reason for status change
 */
router.patch('/users/:id/status', asyncHandler(updateUserStatus));

/**
 * @route   GET /api/v1/admin/companies
 * @desc    Get all companies with optional filtering
 * @access  Private (Admin)
 * @query   page - Page number
 * @query   limit - Items per page
 * @query   search - Search by name or email
 * @query   status - Filter by status
 * @query   verificationStatus - Filter by verification status
 */
router.get('/companies', asyncHandler(getAllCompanies));

/**
 * @route   GET /api/v1/admin/revenue
 * @desc    Get platform revenue analytics
 * @access  Private (Admin)
 * @query   period - Time period (7d, 30d, 90d, 1y)
 * @query   groupBy - Group by day or month
 */
router.get('/revenue', asyncHandler(getRevenueAnalytics));

/**
 * @route   GET /api/v1/admin/health
 * @desc    Get system health status
 * @access  Private (Admin)
 */
router.get('/health', asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  
  // Check database connection
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  }[dbState] || 'unknown';
  
  // Get memory usage
  const memUsage = process.memoryUsage();
  
  // Get uptime
  const uptime = process.uptime();
  
  res.json({
    success: true,
    data: {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        host: mongoose.connection.host || 'unknown',
        name: mongoose.connection.name || 'unknown',
      },
      system: {
        uptime: Math.floor(uptime),
        uptimeFormatted: formatUptime(uptime),
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
        },
        nodeVersion: process.version,
        platform: process.platform,
      },
    },
  });
}));

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(days + 'd');
  if (hours > 0) parts.push(hours + 'h');
  if (minutes > 0) parts.push(minutes + 'm');
  if (secs > 0 || parts.length === 0) parts.push(secs + 's');
  
  return parts.join(' ');
}

module.exports = router;
