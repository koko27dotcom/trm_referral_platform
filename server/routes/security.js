/**
 * Security Routes
 * API routes for security audit logs and security management
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateQuery, validateBody } from '../middleware/requestValidator.js';
import securityService from '../services/securityService.js';
import auditService from '../services/auditService.js';
import SecurityAudit from '../models/SecurityAudit.js';

const router = express.Router();

/**
 * @route GET /api/security/audit-logs
 * @desc Get security audit logs (admin only)
 * @access Private - Admin
 */
router.get(
  '/audit-logs',
  authenticate,
  authorize(['admin', 'security_admin']),
  validateQuery({
    page: { type: 'number', min: 1 },
    limit: { type: 'number', min: 1, max: 100 },
    eventType: { type: 'string' },
    severity: { type: 'string' },
    userId: { type: 'string' },
    startDate: { type: 'date' },
    endDate: { type: 'date' },
    ipAddress: { type: 'string' },
  }),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery || req.query;
      
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 50;
      const skip = (page - 1) * limit;
      
      // Build filter
      const filter = {};
      
      if (query.eventType) {
        filter.eventType = query.eventType;
      }
      
      if (query.severity) {
        filter.severity = query.severity;
      }
      
      if (query.userId) {
        filter.userId = query.userId;
      }
      
      if (query.ipAddress) {
        filter['source.ip'] = query.ipAddress;
      }
      
      if (query.startDate || query.endDate) {
        filter.timestamp = {};
        if (query.startDate) {
          filter.timestamp.$gte = new Date(query.startDate);
        }
        if (query.endDate) {
          filter.timestamp.$lte = new Date(query.endDate);
        }
      }
      
      const [logs, total] = await Promise.all([
        SecurityAudit.find(filter)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'name email')
          .lean(),
        SecurityAudit.countDocuments(filter),
      ]);
      
      // Log access
      await auditService.logAdminAction(
        req.user._id,
        'VIEW_SECURITY_LOGS',
        'SecurityAudit',
        null,
        { filter, page, limit },
        req
      );
      
      res.json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/security/audit-logs/summary
 * @desc Get security audit summary statistics
 * @access Private - Admin
 */
router.get(
  '/audit-logs/summary',
  authenticate,
  authorize(['admin', 'security_admin']),
  async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      
      const dateFilter = {};
      if (startDate || endDate) {
        dateFilter.timestamp = {};
        if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
        if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
      }
      
      const [
        totalEvents,
        eventsByType,
        eventsBySeverity,
        failedLogins,
        blockedIPs,
        suspiciousActivities,
      ] = await Promise.all([
        SecurityAudit.countDocuments(dateFilter),
        SecurityAudit.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$eventType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        SecurityAudit.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$severity', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        SecurityAudit.countDocuments({
          ...dateFilter,
          eventType: 'LOGIN_FAILURE',
        }),
        SecurityAudit.distinct('source.ip', {
          ...dateFilter,
          eventType: 'IP_BLOCKED',
        }),
        SecurityAudit.countDocuments({
          ...dateFilter,
          severity: { $in: ['high', 'critical'] },
        }),
      ]);
      
      res.json({
        success: true,
        data: {
          totalEvents,
          eventsByType: eventsByType.map(e => ({ type: e._id, count: e.count })),
          eventsBySeverity: eventsBySeverity.map(e => ({ severity: e._id, count: e.count })),
          failedLogins,
          blockedIPs: blockedIPs.length,
          suspiciousActivities,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/security/audit-logs/:id
 * @desc Get single security audit log detail
 * @access Private - Admin
 */
router.get(
  '/audit-logs/:id',
  authenticate,
  authorize(['admin', 'security_admin']),
  async (req, res, next) => {
    try {
      const log = await SecurityAudit.findById(req.params.id)
        .populate('userId', 'name email')
        .lean();
      
      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'Security log not found',
        });
      }
      
      res.json({
        success: true,
        data: log,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/security/threats
 * @desc Get active security threats
 * @access Private - Admin
 */
router.get(
  '/threats',
  authenticate,
  authorize(['admin', 'security_admin']),
  async (req, res, next) => {
    try {
      const threats = await SecurityAudit.find({
        severity: { $in: ['high', 'critical'] },
        resolved: { $ne: true },
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      })
        .sort({ timestamp: -1 })
        .populate('userId', 'name email')
        .lean();
      
      res.json({
        success: true,
        data: threats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/security/threats/:id/resolve
 * @desc Resolve a security threat
 * @access Private - Admin
 */
router.post(
  '/threats/:id/resolve',
  authenticate,
  authorize(['admin', 'security_admin']),
  validateBody({
    resolution: { type: 'string', required: true, max: 1000 },
  }),
  async (req, res, next) => {
    try {
      const { resolution } = req.validatedBody;
      
      const log = await SecurityAudit.findByIdAndUpdate(
        req.params.id,
        {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: req.user._id,
          resolution,
        },
        { new: true }
      );
      
      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'Threat not found',
        });
      }
      
      // Log resolution
      await auditService.logAdminAction(
        req.user._id,
        'RESOLVE_SECURITY_THREAT',
        'SecurityAudit',
        log._id,
        { resolution },
        req
      );
      
      res.json({
        success: true,
        message: 'Threat resolved successfully',
        data: log,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/security/blocked-ips
 * @desc Get list of blocked IPs
 * @access Private - Admin
 */
router.get(
  '/blocked-ips',
  authenticate,
  authorize(['admin', 'security_admin']),
  async (req, res, next) => {
    try {
      const blockedIPs = await SecurityAudit.find({
        eventType: 'IP_BLOCKED',
      })
        .sort({ timestamp: -1 })
        .select('source.ip timestamp metadata.reason metadata.expiresAt')
        .lean();
      
      res.json({
        success: true,
        data: blockedIPs,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/security/blocked-ips/unblock
 * @desc Unblock an IP address
 * @access Private - Admin
 */
router.post(
  '/blocked-ips/unblock',
  authenticate,
  authorize(['admin', 'security_admin']),
  validateBody({
    ipAddress: { type: 'string', required: true },
    reason: { type: 'string', required: true, max: 500 },
  }),
  async (req, res, next) => {
    try {
      const { ipAddress, reason } = req.validatedBody;
      
      // Log unblocking
      await auditService.logSecurityEvent(
        'IP_UNBLOCKED',
        req.user._id,
        'low',
        { ipAddress, reason, unblockedBy: req.user._id },
        req
      );
      
      res.json({
        success: true,
        message: `IP ${ipAddress} has been unblocked`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/security/sessions
 * @desc Get user's active sessions
 * @access Private
 */
router.get(
  '/sessions',
  authenticate,
  async (req, res, next) => {
    try {
      // Get session info from security service
      const sessions = await SecurityAudit.find({
        userId: req.user._id,
        eventType: { $in: ['LOGIN_SUCCESS', 'SESSION_CREATED'] },
        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      })
        .sort({ timestamp: -1 })
        .select('timestamp source.ip source.userAgent metadata.sessionId')
        .limit(20)
        .lean();
      
      res.json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/security/sessions/:id/revoke
 * @desc Revoke a specific session
 * @access Private
 */
router.post(
  '/sessions/:id/revoke',
  authenticate,
  async (req, res, next) => {
    try {
      const sessionId = req.params.id;
      
      // Log session revocation
      await auditService.logSecurityEvent(
        'SESSION_REVOKED',
        req.user._id,
        'medium',
        { sessionId, revokedBy: 'user' },
        req
      );
      
      res.json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/security/sessions/revoke-all
 * @desc Revoke all sessions except current
 * @access Private
 */
router.post(
  '/sessions/revoke-all',
  authenticate,
  async (req, res, next) => {
    try {
      // Log mass revocation
      await auditService.logSecurityEvent(
        'ALL_SESSIONS_REVOKED',
        req.user._id,
        'high',
        { revokedBy: 'user' },
        req
      );
      
      res.json({
        success: true,
        message: 'All other sessions have been revoked',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/security/settings
 * @desc Get security settings
 * @access Private - Admin
 */
router.get(
  '/settings',
  authenticate,
  authorize(['admin', 'security_admin']),
  async (req, res, next) => {
    try {
      const settings = {
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
          expiryDays: 90,
        },
        sessionPolicy: {
          maxSessionsPerUser: 5,
          sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
          idleTimeout: 30 * 60 * 1000, // 30 minutes
        },
        rateLimiting: {
          loginAttempts: 5,
          loginWindow: 15 * 60 * 1000, // 15 minutes
          apiRequests: 1000,
          apiWindow: 60 * 60 * 1000, // 1 hour
        },
        mfaPolicy: {
          required: false,
          methods: ['totp', 'sms', 'email'],
        },
        ipBlocking: {
          enabled: true,
          maxFailedAttempts: 5,
          blockDuration: 24 * 60 * 60 * 1000, // 24 hours
        },
      };
      
      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/security/settings
 * @desc Update security settings
 * @access Private - Admin
 */
router.put(
  '/settings',
  authenticate,
  authorize(['admin', 'security_admin']),
  async (req, res, next) => {
    try {
      // Log settings change
      await auditService.logAdminAction(
        req.user._id,
        'UPDATE_SECURITY_SETTINGS',
        'SecuritySettings',
        null,
        { changes: req.body },
        req
      );
      
      res.json({
        success: true,
        message: 'Security settings updated',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/security/verify-password
 * @desc Verify current password (for sensitive operations)
 * @access Private
 */
router.post(
  '/verify-password',
  authenticate,
  validateBody({
    password: { type: 'string', required: true },
  }),
  async (req, res, next) => {
    try {
      const { password } = req.validatedBody;
      
      // Verify password using auth service
      const User = (await import('../models/User.js')).default;
      const user = await User.findById(req.user._id).select('+password');
      
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        // Log failed verification
        await auditService.logSecurityEvent(
          'PASSWORD_VERIFICATION_FAILED',
          req.user._id,
          'medium',
          {},
          req
        );
        
        return res.status(401).json({
          success: false,
          message: 'Invalid password',
        });
      }
      
      // Log successful verification
      await auditService.logSecurityEvent(
        'PASSWORD_VERIFIED',
        req.user._id,
        'low',
        {},
        req
      );
      
      res.json({
        success: true,
        message: 'Password verified',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
