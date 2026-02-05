/**
 * Models Index
 * Central export for all Mongoose models
 * Provides convenient access to all models from a single import
 */

// Import all models
const User = require('./User.js');
const Company = require('./Company.js');
const CompanyUser = require('./CompanyUser.js');
const Job = require('./Job.js');
const Referral = require('./Referral.js');
const Application = require('./Application.js');
const SubscriptionPlan = require('./SubscriptionPlan.js');
const Subscription = require('./Subscription.js');
const BillingRecord = require('./BillingRecord.js');
const PayoutRequest = require('./PayoutRequest.js');
const RevenueAnalytics = require('./RevenueAnalytics.js');
const AuditLog = require('./AuditLog.js');
const ReferralNetwork = require('./ReferralNetwork.js');
const TierBenefits = require('./TierBenefits.js');
const WhatsAppTemplate = require('./WhatsAppTemplate.js');
const { TEMPLATE_TYPE, TEMPLATE_STATUS, TEMPLATE_CATEGORY } = require('./WhatsAppTemplate.js');
const WhatsAppSession = require('./WhatsAppSession.js');
const { SESSION_STATUS, CONTEXT_TYPE, USER_TYPE } = require('./WhatsAppSession.js');
const WhatsAppMessage = require('./WhatsAppMessage.js');
const { MESSAGE_DIRECTION, MESSAGE_TYPE, MESSAGE_STATUS, INTERACTIVE_TYPE } = require('./WhatsAppMessage.js');
const LeadScore = require('./LeadScore.js');
const ReferrerQuality = require('./ReferrerQuality.js');
const EmailCampaign = require('./EmailCampaign.js');
const EmailTemplate = require('./EmailTemplate.js');
const EmailSequence = require('./EmailSequence.js');
const UserSegment = require('./UserSegment.js');
const EmailLog = require('./EmailLog.js');
const MatchScore = require('./MatchScore.js');
const Workflow = require('./Workflow.js');
const WorkflowExecution = require('./WorkflowExecution.js');
const PricingRule = require('./PricingRule.js');
const PromotionalCode = require('./PromotionalCode.js');
const FeaturedJobSlot = require('./FeaturedJobSlot.js');
const EnterprisePlan = require('./EnterprisePlan.js');
const KYCStatus = require('./KYCStatus.js');
const KYCDocument = require('./KYCDocument.js');
const Notification = require('./Notification.js');
const { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY, NOTIFICATION_CHANNELS } = require('./Notification.js');
const PayoutBatch = require('./PayoutBatch.js');
const PayoutProvider = require('./PayoutProvider.js');
const PayoutTransaction = require('./PayoutTransaction.js');

// AI Analytics Models (Phase 3)
const AnalyticsInsight = require('./AnalyticsInsight.js');
const SalaryBenchmark = require('./SalaryBenchmark.js');
const MarketTrend = require('./MarketTrend.js');
const HiringVelocity = require('./HiringVelocity.js');
const ReferrerPrediction = require('./ReferrerPrediction.js');

// Internationalization Models (Phase 3)
const Localization = require('./Localization.js');
const RegionConfig = require('./RegionConfig.js');
const CurrencyRate = require('./CurrencyRate.js');

// Talent Sourcing Models (Phase 4)
const TalentPool = require('./TalentPool.js');
const CandidateSource = require('./CandidateSource.js');
const OutreachCampaign = require('./OutreachCampaign.js');

// Gamification Models (Phase 4)
const GamificationProfile = require('./GamificationProfile.js');
const Badge = require('./Badge.js');
const Achievement = require('./Achievement.js');
const LeaderboardEntry = require('./LeaderboardEntry.js');
const Challenge = require('./Challenge.js');
const UserActivity = require('./UserActivity.js');

// Community & Social Platform Models (Phase 4)
const CommunityPost = require('./CommunityPost.js');
const Comment = require('./Comment.js');
const CommunityGroup = require('./CommunityGroup.js');
const Event = require('./Event.js');
const MentorshipMatch = require('./MentorshipMatch.js');
const Content = require('./Content.js');
const PublicProfile = require('./PublicProfile.js');
const Review = require('./Review.js');

// Export all models
module.exports = {
  User,
  Company,
  CompanyUser,
  Job,
  Referral,
  Application,
  SubscriptionPlan,
  Subscription,
  BillingRecord,
  PayoutRequest,
  PayoutBatch,
  PayoutProvider,
  PayoutTransaction,
  RevenueAnalytics,
  AuditLog,
  ReferralNetwork,
  TierBenefits,
  WhatsAppTemplate,
  TEMPLATE_TYPE,
  TEMPLATE_STATUS,
  TEMPLATE_CATEGORY,
  WhatsAppSession,
  SESSION_STATUS,
  CONTEXT_TYPE,
  USER_TYPE,
  WhatsAppMessage,
  MESSAGE_DIRECTION,
  MESSAGE_TYPE,
  MESSAGE_STATUS,
  INTERACTIVE_TYPE,
  LeadScore,
  ReferrerQuality,
  EmailCampaign,
  EmailTemplate,
  EmailSequence,
  UserSegment,
  EmailLog,
  MatchScore,
  Workflow,
  WorkflowExecution,
  PricingRule,
  PromotionalCode,
  FeaturedJobSlot,
  EnterprisePlan,
  KYCStatus,
  KYCDocument,
  Notification,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_CHANNELS,
  // AI Analytics Models
  AnalyticsInsight,
  SalaryBenchmark,
  MarketTrend,
  HiringVelocity,
  ReferrerPrediction,
  // Internationalization Models
  Localization,
  RegionConfig,
  CurrencyRate,
  // Talent Sourcing Models (Phase 4)
  TalentPool,
  CandidateSource,
  OutreachCampaign,
  // Gamification Models (Phase 4)
  GamificationProfile,
  Badge,
  Achievement,
  LeaderboardEntry,
  Challenge,
  UserActivity,
  // Community & Social Platform Models (Phase 4)
  CommunityPost,
  Comment,
  CommunityGroup,
  Event,
  MentorshipMatch,
  Content,
  PublicProfile,
  Review,
};
