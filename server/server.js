/**
 * Express Server
 * Main entry point for the referral platform API
 * Cache-bust: 2026-02-04T04:10:00Z
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDatabase, disconnectDatabase } = require('./config/database.js');
const { errorHandler, notFoundHandler, setupUnhandledRejectionHandler, setupUncaughtExceptionHandler } = require('./middleware/errorHandler.js');
const { initializeWorkflowCron, stopWorkflowCron } = require('./cron/workflowCron.js');
const { initializeRevenueCron, stopRevenueCron } = require('./cron/revenueCron.js');
const { initializePayoutCron, stopPayoutCron } = require('./cron/payoutCron.js');
const { leaderboardCron } = require('./cron/leaderboardCron.js');
const analyticsCron = require('./cron/analyticsCron.js');

// Import routes
const authRoutes = require('./routes/auth.js');
const userRoutes = require('./routes/users.js');
const companyRoutes = require('./routes/companies.js');
const jobRoutes = require('./routes/jobs.js');
const referralRoutes = require('./routes/referrals.js');
const referralNetworkRoutes = require('./routes/referralNetwork.js');
const billingRoutes = require('./routes/billing.js');
const subscriptionRoutes = require('./routes/subscriptions.js');
const payoutRoutes = require('./routes/payouts.js');
const whatsappRoutes = require('./routes/whatsapp.js');
const leadRoutes = require('./routes/leads.js');
const emailMarketingRoutes = require('./routes/emailMarketing.js');
const matchingRoutes = require('./routes/matching.js');
const workflowRoutes = require('./routes/workflows.js');
const analyticsRoutes = require('./routes/analytics.js');
const insightsRoutes = require('./routes/insights.js');
const pricingRoutes = require('./routes/pricing.js');
const featuredJobsRoutes = require('./routes/featuredJobs.js');
const enterpriseRoutes = require('./routes/enterprise.js');
const kycRoutes = require('./routes/kyc.js');
const talentPoolRoutes = require('./routes/talentPool.js');
const outreachRoutes = require('./routes/outreach.js');
const gamificationRoutes = require('./routes/gamification.js');
const leaderboardRoutes = require('./routes/leaderboards.js');
const challengeRoutes = require('./routes/challenges.js');
const dataProductsRoutes = require('./routes/dataProducts.js');
const reportsRoutes = require('./routes/reports.js');
const marketIntelligenceRoutes = require('./routes/marketIntelligence.js');
const dataAPIRoutes = require('./routes/dataAPI.js');
const predictiveRoutes = require('./routes/predictive.js');
const aiRoutes = require('./routes/ai.js');
const adminRoutes = require('./routes/admin.js');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// ==================== GLOBAL ERROR HANDLERS ====================

setupUncaughtExceptionHandler();
setupUnhandledRejectionHandler();

// ==================== MIDDLEWARE ====================

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`[${timestamp}] ${method} ${url} - ${ip}`);
  
  // Add request ID for tracing
  req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-Id', req.requestId);
  
  next();
});

// Response time middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.requestId}] Response: ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ==================== API ROUTES ====================

const API_PREFIX = '/api/v1';

// Auth routes
app.use(`${API_PREFIX}/auth`, authRoutes);

// User routes
app.use(`${API_PREFIX}/users`, userRoutes);

// Company routes
app.use(`${API_PREFIX}/companies`, companyRoutes);

// Job routes
app.use(`${API_PREFIX}/jobs`, jobRoutes);

// Referral routes (existing job referral system)
app.use(`${API_PREFIX}/referrals`, referralRoutes);

// Referral Network routes (viral referral system)
app.use(`${API_PREFIX}/referrals`, referralNetworkRoutes);

// Billing routes
app.use(`${API_PREFIX}/billing`, billingRoutes);

// Subscription routes
app.use(`${API_PREFIX}/subscriptions`, subscriptionRoutes);

// Payout routes
app.use(`${API_PREFIX}/payouts`, payoutRoutes);

// WhatsApp routes
app.use(`${API_PREFIX}/whatsapp`, whatsappRoutes);

// Lead scoring routes
app.use(`${API_PREFIX}/leads`, leadRoutes);

// Email marketing routes
app.use(`${API_PREFIX}/email`, emailMarketingRoutes);

// Matching routes (job-candidate matching)
app.use(`${API_PREFIX}/matching`, matchingRoutes);

// Workflow routes (auto-followup workflow engine)
app.use(`${API_PREFIX}/workflows`, workflowRoutes);

// Analytics routes (revenue analytics dashboard)
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);

// Insights routes (AI-powered analytics and predictions)
app.use(`${API_PREFIX}/insights`, insightsRoutes);

// Pricing routes (dynamic pricing engine)
app.use(`${API_PREFIX}/pricing`, pricingRoutes);

// Featured jobs routes (revenue generator)
app.use(`${API_PREFIX}/featured-jobs`, featuredJobsRoutes);

// Enterprise routes (B2B portal)
app.use(`${API_PREFIX}/enterprise`, enterpriseRoutes);

// KYC routes (verification system)
app.use(`${API_PREFIX}/kyc`, kycRoutes);

// Talent Pool routes (AI-powered talent sourcing)
app.use(`${API_PREFIX}/talent-pool`, talentPoolRoutes);

// Outreach routes (campaign management)
app.use(`${API_PREFIX}/outreach`, outreachRoutes);

// Gamification routes
app.use(`${API_PREFIX}/gamification`, gamificationRoutes);

// Leaderboard routes
app.use(`${API_PREFIX}/leaderboards`, leaderboardRoutes);

// Challenge routes
app.use(`${API_PREFIX}/challenges`, challengeRoutes);

// Data Products routes (Phase 4 - Data Marketplace)
app.use(`${API_PREFIX}/data-products`, dataProductsRoutes);

// Reports routes (Phase 4 - Report Builder)
app.use(`${API_PREFIX}/reports`, reportsRoutes);

// Market Intelligence routes (Phase 4 - Market Insights)
app.use(`${API_PREFIX}/market-intelligence`, marketIntelligenceRoutes);

// Data API routes (Phase 4 - Data API)
app.use(`${API_PREFIX}/data-api`, dataAPIRoutes);

// Predictive Analytics routes (Phase 4 - ML Predictions)
app.use(`${API_PREFIX}/predictive`, predictiveRoutes);

// AI routes (Resume Optimizer and other AI features)
app.use(`${API_PREFIX}/ai`, aiRoutes);

// Admin routes (God Mode dashboard)
app.use(`${API_PREFIX}/admin`, adminRoutes);

// ==================== ERROR HANDLING ====================

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Initialize workflow cron jobs
    initializeWorkflowCron();

    // Initialize revenue analytics cron jobs
    initializeRevenueCron();

      // Initialize payout processing cron jobs
      initializePayoutCron();
      
      // Initialize leaderboard/gamification cron jobs
      leaderboardCron.init();
      
      // Initialize analytics cron jobs (Phase 4)
      analyticsCron.start();
      
      // Start server
    const server = app.listen(PORT, HOST, () => {
      console.log('='.repeat(60));
      console.log('🚀 Server started successfully');
      console.log('='.repeat(60));
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 URL: http://${HOST}:${PORT}`);
      console.log(`📚 API Docs: http://${HOST}:${PORT}${API_PREFIX}`);
      console.log(`💾 Database: MongoDB`);
      console.log(`⚙️  Workflow Engine: Active`);
      console.log(`📊 Revenue Analytics: Active`);
      console.log(`💰 Payout Processing: Active`);
      console.log(`🎮 Gamification System: Active`);
      console.log(`📈 Data Marketplace: Active`);
      console.log(`🤖 Predictive Analytics: Active`);
      console.log('='.repeat(60));
    });
    
    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      // Stop workflow cron jobs
      stopWorkflowCron();

      // Stop revenue analytics cron jobs
      stopRevenueCron();

      // Stop payout processing cron jobs
      stopPayoutCron();
      
      // Stop leaderboard/gamification cron jobs
      leaderboardCron.stop();
      
      // Stop analytics cron jobs (Phase 4)
      analyticsCron.stop();
      
      // Close HTTP server
      server.close(async () => {
        console.log('HTTP server closed');
        
        // Disconnect from database
        await disconnectDatabase();
        
        console.log('Graceful shutdown complete');
        process.exit(0);
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
