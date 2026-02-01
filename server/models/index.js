/**
 * Models Index
 * Central export for all Mongoose models
 * Provides convenient access to all models from a single import
 */

// Import all models
import User from './User.js';
import Company from './Company.js';
import CompanyUser from './CompanyUser.js';
import Job from './Job.js';
import Referral from './Referral.js';
import Application from './Application.js';
import SubscriptionPlan from './SubscriptionPlan.js';
import Subscription from './Subscription.js';
import BillingRecord from './BillingRecord.js';
import PayoutRequest from './PayoutRequest.js';
import RevenueAnalytics from './RevenueAnalytics.js';
import AuditLog from './AuditLog.js';
import ReferralNetwork from './ReferralNetwork.js';
import TierBenefits from './TierBenefits.js';
import WhatsAppTemplate from './WhatsAppTemplate.js';
import WhatsAppSession from './WhatsAppSession.js';
import WhatsAppMessage from './WhatsAppMessage.js';
import LeadScore from './LeadScore.js';
import ReferrerQuality from './ReferrerQuality.js';
import EmailCampaign from './EmailCampaign.js';
import EmailTemplate from './EmailTemplate.js';
import EmailSequence from './EmailSequence.js';
import UserSegment from './UserSegment.js';
import EmailLog from './EmailLog.js';
import MatchScore from './MatchScore.js';
import Workflow from './Workflow.js';
import WorkflowExecution from './WorkflowExecution.js';
import PricingRule from './PricingRule.js';
import PromotionalCode from './PromotionalCode.js';
import FeaturedJobSlot from './FeaturedJobSlot.js';
import EnterprisePlan from './EnterprisePlan.js';
import KYCStatus from './KYCStatus.js';
import KYCDocument from './KYCDocument.js';
import PayoutBatch from './PayoutBatch.js';
import PayoutProvider from './PayoutProvider.js';
import PayoutTransaction from './PayoutTransaction.js';

// AI Analytics Models (Phase 3)
import AnalyticsInsight from './AnalyticsInsight.js';
import SalaryBenchmark from './SalaryBenchmark.js';
import MarketTrend from './MarketTrend.js';
import HiringVelocity from './HiringVelocity.js';
import ReferrerPrediction from './ReferrerPrediction.js';

// Internationalization Models (Phase 3)
import Localization from './Localization.js';
import RegionConfig from './RegionConfig.js';
import CurrencyRate from './CurrencyRate.js';

// Talent Sourcing Models (Phase 4)
import TalentPool from './TalentPool.js';
import CandidateSource from './CandidateSource.js';
import OutreachCampaign from './OutreachCampaign.js';

// Gamification Models (Phase 4)
import GamificationProfile from './GamificationProfile.js';
import Badge from './Badge.js';
import Achievement from './Achievement.js';
import LeaderboardEntry from './LeaderboardEntry.js';
import Challenge from './Challenge.js';
import UserActivity from './UserActivity.js';

// Community & Social Platform Models (Phase 4)
import CommunityPost from './CommunityPost.js';
import Comment from './Comment.js';
import CommunityGroup from './CommunityGroup.js';
import Event from './Event.js';
import MentorshipMatch from './MentorshipMatch.js';
import Content from './Content.js';
import PublicProfile from './PublicProfile.js';
import Review from './Review.js';

// Export all models
export {
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
  WhatsAppSession,
  WhatsAppMessage,
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
  PayoutBatch,
  PayoutProvider,
  PayoutTransaction,
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

// Default export with all models
export default {
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
  WhatsAppSession,
  WhatsAppMessage,
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
  PayoutBatch,
  PayoutProvider,
  PayoutTransaction,
  // AI Analytics Models
  AnalyticsInsight,
  SalaryBenchmark,
  MarketTrend,
  HiringVelocity,
  ReferrerPrediction,
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
