/**
 * Express Server
 * Main entry point for the referral platform API
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { errorHandler, notFoundHandler, setupUnhandledRejectionHandler, setupUncaughtExceptionHandler } from './middleware/errorHandler.js';
import { initializeWorkflowCron, stopWorkflowCron } from './cron/workflowCron.js';
import { initializeRevenueCron, stopRevenueCron } from './cron/revenueCron.js';
import { initializePayoutCron, stopPayoutCron } from './cron/payoutCron.js';
import { leaderboardCron } from './cron/leaderboardCron.js';
import analyticsCron from './cron/analyticsCron.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import companyRoutes from './routes/companies.js';
import jobRoutes from './routes/jobs.js';
import referralRoutes from './routes/referrals.js';
import referralNetworkRoutes from './routes/referralNetwork.js';
import billingRoutes from './routes/billing.js';
import subscriptionRoutes from './routes/subscriptions.js';
import payoutRoutes from './routes/payouts.js';
import whatsappRoutes from './routes/whatsapp.js';
import leadRoutes from './routes/leads.js';
import emailMarketingRoutes from './routes/emailMarketing.js';
import matchingRoutes from './routes/matching.js';
import workflowRoutes from './routes/workflows.js';
import analyticsRoutes from './routes/analytics.js';
import insightsRoutes from './routes/insights.js';
import pricingRoutes from './routes/pricing.js';
import featuredJobsRoutes from './routes/featuredJobs.js';
import enterpriseRoutes from './routes/enterprise.js';
import kycRoutes from './routes/kyc.js';
import talentPoolRoutes from './routes/talentPool.js';
import outreachRoutes from './routes/outreach.js';
import gamificationRoutes from './routes/gamification.js';
import leaderboardRoutes from './routes/leaderboards.js';
import challengeRoutes from './routes/challenges.js';
import dataProductsRoutes from './routes/dataProducts.js';
import reportsRoutes from './routes/reports.js';
import marketIntelligenceRoutes from './routes/marketIntelligence.js';
import dataAPIRoutes from './routes/dataAPI.js';
import predictiveRoutes from './routes/predictive.js';

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

export default app;
