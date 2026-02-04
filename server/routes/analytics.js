/**
 * Analytics Routes
 * Provides comprehensive revenue analytics endpoints for the TRM platform
 * Enables data-driven decisions through real-time and historical data
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const { RevenueAnalytics } = require('../models/index.js');
const { revenueCalculator } = require('../services/revenueCalculator.js');

const router = express.Router();

// ==================== MIDDLEWARE ====================

/**
 * Ensure user is admin
 */
const requireAdmin = requireRole(['admin']);

// ==================== REVENUE OVERVIEW ====================

/**
 * @route   GET /api/v1/analytics/revenue/overview
 * @desc    Get revenue overview dashboard data
 * @access  Admin only
 */
router.get('/revenue/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const { period = 'daily', days = 30 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get latest snapshot
    const latestSnapshot = await RevenueAnalytics.getLatestSnapshot(period);
    
    // Get historical data for trends
    const historicalData = await RevenueAnalytics.getSnapshotsInRange(
      period,
      startDate,
      endDate
    );

    // Calculate summary metrics
    const summary = await RevenueAnalytics.getRevenueByDateRange(startDate, endDate);

    res.json({
      success: true,
      data: {
        current: latestSnapshot || null,
        historical: historicalData,
        summary: {
          totalRevenue: summary.totalRevenue,
          avgMrr: summary.avgMrr,
          totalReferrals: summary.totalReferrals,
          successfulReferrals: summary.successfulReferrals,
          conversionRate: summary.totalReferrals > 0 
            ? (summary.successfulReferrals / summary.totalReferrals) * 100 
            : 0,
        },
        period,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching revenue overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue overview',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/analytics/revenue/mrr
 * @desc    Get MRR data with trends
 * @access  Admin only
 */
router.get('/revenue/mrr', authenticate, requireAdmin, async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    // Get MRR snapshots
    const mrrData = await RevenueAnalytics.find({
      period: 'monthly',
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .select('date mrr arr mrrGrowth mrrBreakdown')
      .sort({ date: 1 });

    // Calculate current MRR
    const currentMrr = await revenueCalculator.calculateMRR();

    res.json({
      success: true,
      data: {
        current: currentMrr,
        historical: mrrData,
        trends: {
          growthRate: mrrData.length > 1 
            ? ((mrrData[mrrData.length - 1].mrr - mrrData[0].mrr) / mrrData[0].mrr) * 100 
            : 0,
          avgMrr: mrrData.length > 0 
            ? mrrData.reduce((sum, d) => sum + d.mrr, 0) / mrrData.length 
            : 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching MRR data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch MRR data',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/analytics/revenue/by-source
 * @desc    Get revenue breakdown by source
 * @access  Admin only
 */
router.get('/revenue/by-source', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const revenueBySource = await revenueCalculator.calculateRevenueBySource(start, end);

    res.json({
      success: true,
      data: {
        breakdown: revenueBySource,
        total: revenueBySource.reduce((sum, item) => sum + item.amount, 0),
        dateRange: {
          start,
          end,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching revenue by source:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue by source',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/analytics/revenue/by-company
 * @desc    Get revenue per company
 * @access  Admin only
 */
router.get('/revenue/by-company', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, limit = 20 } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const revenueByCompany = await revenueCalculator.calculateRevenueByCompany(
      start,
      end,
      parseInt(limit)
    );

    // Calculate totals
    const totalRevenue = revenueByCompany.reduce((sum, item) => sum + item.amount, 0);

    res.json({
      success: true,
      data: {
        companies: revenueByCompany,
        summary: {
          totalRevenue,
          companyCount: revenueByCompany.length,
          avgRevenue: revenueByCompany.length > 0 ? totalRevenue / revenueByCompany.length : 0,
        },
        dateRange: {
          start,
          end,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching revenue by company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue by company',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/analytics/revenue/forecast
 * @desc    Get predictive revenue forecast
 * @access  Admin only
 */
router.get('/revenue/forecast', authenticate, requireAdmin, async (req, res) => {
  try {
    const { periods = 3, periodType = 'monthly' } = req.query;

    const forecast = await revenueCalculator.generateRevenueForecast(
      parseInt(periods),
      periodType
    );

    res.json({
      success: true,
      data: {
        forecast,
        periodType,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error generating revenue forecast:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate revenue forecast',
      error: error.message,
    });
  }
});

// ==================== REFERRER METRICS ====================

/**
 * @route   GET /api/v1/analytics/referrers/activation
 * @desc    Get referrer activation rates
 * @access  Admin only
 */
router.get('/referrers/activation', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const activationMetrics = await revenueCalculator.calculateReferrerActivation(start, end);

    // Get historical data for trends
    const historicalSnapshots = await RevenueAnalytics.find({
      period: 'daily',
      date: { $gte: start, $lte: end },
    })
      .select('date referrerMetrics')
      .sort({ date: 1 });

    res.json({
      success: true,
      data: {
        current: activationMetrics,
        historical: historicalSnapshots.map(s => ({
          date: s.date,
          ...s.referrerMetrics,
        })),
        dateRange: {
          start,
          end,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching referrer activation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referrer activation metrics',
      error: error.message,
    });
  }
});

// ==================== HIRE METRICS ====================

/**
 * @route   GET /api/v1/analytics/hires/time-to-first
 * @desc    Get time-to-first-hire metrics
 * @access  Admin only
 */
router.get('/hires/time-to-first', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const timeToFirstHire = await revenueCalculator.calculateTimeToFirstHire(start, end);

    res.json({
      success: true,
      data: {
        metrics: timeToFirstHire,
        dateRange: {
          start,
          end,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching time-to-first-hire:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time-to-first-hire metrics',
      error: error.message,
    });
  }
});

// ==================== CONVERSION METRICS ====================

/**
 * @route   GET /api/v1/analytics/conversions/referral-to-hire
 * @desc    Get referral-to-hire conversion rates
 * @access  Admin only
 */
router.get('/conversions/referral-to-hire', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const conversionRates = await revenueCalculator.calculateConversionRates(start, end);

    res.json({
      success: true,
      data: {
        rates: conversionRates,
        dateRange: {
          start,
          end,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching conversion rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversion rates',
      error: error.message,
    });
  }
});

// ==================== COHORT ANALYSIS ====================

/**
 * @route   GET /api/v1/analytics/cohorts
 * @desc    Get cohort analysis data
 * @access  Admin only
 */
router.get('/cohorts', authenticate, requireAdmin, async (req, res) => {
  try {
    const { months = 12 } = req.query;

    const cohorts = await revenueCalculator.generateCohortAnalysis(parseInt(months));

    res.json({
      success: true,
      data: {
        cohorts,
        summary: {
          totalCohorts: cohorts.length,
          avgRetention: cohorts.length > 0
            ? cohorts.reduce((sum, c) => {
                const latestRetention = c.retentionRates[c.retentionRates.length - 1];
                return sum + (latestRetention ? latestRetention.rate : 0);
              }, 0) / cohorts.length
            : 0,
          avgLTV: cohorts.length > 0
            ? cohorts.reduce((sum, c) => sum + c.ltv, 0) / cohorts.length
            : 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching cohort analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cohort analysis',
      error: error.message,
    });
  }
});

// ==================== REPORTS ====================

/**
 * @route   GET /api/v1/analytics/reports/daily
 * @desc    Get daily revenue report
 * @access  Admin only
 */
router.get('/reports/daily', authenticate, requireAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();

    // Get or generate daily snapshot
    let snapshot = await RevenueAnalytics.findOne({
      period: 'daily',
      date: {
        $gte: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate()),
        $lt: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate() + 1),
      },
    });

    if (!snapshot) {
      // Generate new snapshot
      snapshot = await revenueCalculator.generateSnapshot('daily', reportDate);
    }

    res.json({
      success: true,
      data: {
        report: snapshot,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily report',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/analytics/reports/weekly
 * @desc    Get weekly revenue report
 * @access  Admin only
 */
router.get('/reports/weekly', authenticate, requireAdmin, async (req, res) => {
  try {
    const { week } = req.query;
    const reportDate = week ? new Date(week) : new Date();

    // Get or generate weekly snapshot
    let snapshot = await RevenueAnalytics.findOne({
      period: 'weekly',
      date: {
        $gte: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate()),
        $lt: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate() + 7),
      },
    });

    if (!snapshot) {
      // Generate new snapshot
      snapshot = await revenueCalculator.generateSnapshot('weekly', reportDate);
    }

    res.json({
      success: true,
      data: {
        report: snapshot,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate weekly report',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/analytics/reports/export
 * @desc    Export reports for accounting
 * @access  Admin only
 */
router.post('/reports/export', authenticate, requireAdmin, async (req, res) => {
  try {
    const { 
      reportType = 'revenue', 
      format = 'json', 
      startDate, 
      endDate,
      includeMetrics = [],
    } = req.body;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    let exportData = {};

    // Gather data based on report type
    switch (reportType) {
      case 'revenue':
        exportData = {
          revenue: await revenueCalculator.calculateRevenueInRange(start, end),
          bySource: await revenueCalculator.calculateRevenueBySource(start, end),
          byCompany: await revenueCalculator.calculateRevenueByCompany(start, end, 100),
        };
        break;
      case 'mrr':
        exportData = {
          mrr: await revenueCalculator.calculateMRR(),
          historical: await RevenueAnalytics.find({
            period: 'monthly',
            date: { $gte: start, $lte: end },
          }).select('date mrr arr mrrGrowth'),
        };
        break;
      case 'full':
        exportData = {
          revenue: await revenueCalculator.calculateRevenueInRange(start, end),
          bySource: await revenueCalculator.calculateRevenueBySource(start, end),
          byCompany: await revenueCalculator.calculateRevenueByCompany(start, end, 100),
          mrr: await revenueCalculator.calculateMRR(),
          referrerMetrics: await revenueCalculator.calculateReferrerActivation(start, end),
          conversionRates: await revenueCalculator.calculateConversionRates(start, end),
          timeToFirstHire: await revenueCalculator.calculateTimeToFirstHire(start, end),
        };
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type',
        });
    }

    // Format response
    const report = {
      reportType,
      generatedAt: new Date(),
      dateRange: { start, end },
      data: exportData,
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(exportData, reportType);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="trm-revenue-report-${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report',
      error: error.message,
    });
  }
});

// ==================== REAL-TIME ENDPOINTS ====================

/**
 * @route   GET /api/v1/analytics/realtime
 * @desc    Get real-time analytics data
 * @access  Admin only
 */
router.get('/realtime', authenticate, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayRevenue,
      currentMrr,
      activeSubscriptions,
      todayReferrals,
    ] = await Promise.all([
      revenueCalculator.calculateRevenueInRange(today, new Date()),
      revenueCalculator.calculateMRR(),
      RevenueAnalytics.countDocuments({ period: 'daily', date: { $gte: today } }),
      RevenueAnalytics.aggregate([
        { $match: { period: 'daily', date: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$referralMetrics.totalReferrals' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        todayRevenue: todayRevenue.totalRevenue,
        currentMrr: currentMrr.mrr,
        activeSubscriptions: currentMrr.activeSubscriptions,
        todayReferrals: todayReferrals[0]?.total || 0,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time analytics',
      error: error.message,
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Convert data to CSV format
 */
function convertToCSV(data, reportType) {
  let csv = '';
  
  if (reportType === 'revenue' && data.bySource) {
    csv = 'Source,Amount,Count,Percentage\n';
    data.bySource.forEach(item => {
      csv += `${item.source},${item.amount},${item.count},${item.percentage}\n`;
    });
  } else if (reportType === 'mrr' && data.historical) {
    csv = 'Date,MRR,ARR,MRR Growth\n';
    data.historical.forEach(item => {
      csv += `${item.date.toISOString()},${item.mrr},${item.arr},${item.mrrGrowth}\n`;
    });
  } else {
    // Generic JSON to CSV conversion
    csv = JSON.stringify(data, null, 2);
  }
  
  return csv;
}

module.exports = router;
