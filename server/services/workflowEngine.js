/**
 * Workflow Engine Service
 * Core service for executing automated follow-up workflows
 * Part of the Auto-Followup Workflow Engine for TRM platform
 */

const mongoose = require('mongoose');
const axios = require('axios');
const Workflow = require 
  TRIGGER_TYPES, 
  WORKFLOW_STATUS, 
  ACTION_TYPES,
  CONDITION_OPERATORS 
} = require('../models/Workflow.js');
const WorkflowExecution = require 
  EXECUTION_STATUS, 
  ACTION_STATUS,
  ENTITY_TYPES 
} = require('../models/WorkflowExecution.js');
const { 
  User, 
  Job, 
  Company, 
  Referral, 
  Application,
  EmailTemplate,
  WhatsAppTemplate,
  EmailLog,
  WhatsAppMessage,
  Notification
} = require('../models/index.js');
const { sendEmail } = require('./emailMarketingService.js');
const { sendTemplateMessage, formatPhoneNumber } = require('./whatsappService.js');
const { sendNotification as sendAppNotification } = require('./notificationService.js');

// ==================== PREDEFINED WORKFLOWS ====================

/**
 * Predefined workflow configurations
 * These are the standard auto-followup workflows for TRM platform
 */
const PREDEFINED_WORKFLOWS = {
  // 1. Candidate Applied but Not Completed
  CANDIDATE_INCOMPLETE_APPLICATION: {
    name: 'Candidate Incomplete Application Follow-up',
    description: 'Follow up with candidates who started but did not complete their application',
    category: 'candidate_engagement',
    trigger: {
      type: TRIGGER_TYPES.CANDIDATE_APPLIED_INCOMPLETE,
      config: {
        incompleteAfterMinutes: 30, // Consider incomplete after 30 minutes
      },
    },
    entryConditions: [
      { field: 'application.status', operator: 'equals', value: 'started', valueType: 'string' },
    ],
    actions: [
      {
        type: ACTION_TYPES.DELAY,
        name: 'Wait 24 Hours',
        description: 'Wait for 24 hours before first follow-up',
        delayHours: 24,
        enabled: true,
      },
      {
        type: ACTION_TYPES.CONDITION,
        name: 'Check Still Incomplete',
        description: 'Verify application is still incomplete',
        conditions: [
          { field: 'application.status', operator: 'equals', value: 'started', valueType: 'string' },
        ],
        conditionLogic: 'and',
        trueActions: [
          {
            type: ACTION_TYPES.SEND_EMAIL,
            name: 'Send Email Reminder - 24hr',
            emailSubject: 'Complete Your Application - {{job.title}} is Waiting!',
            emailBody: `
              <h2>Hi {{user.name}},</h2>
              <p>You started applying for <strong>{{job.title}}</strong> at {{company.name}} but didn't complete your application.</p>
              <p>Don't miss this opportunity! Complete your application now:</p>
              <a href="{{application.resumeUrl}}" style="padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">Complete Application</a>
              <p>Need help? Reply to this email or contact our support team.</p>
            `,
            enabled: true,
          },
          {
            type: ACTION_TYPES.SEND_WHATSAPP,
            name: 'Send WhatsApp Reminder - 24hr',
            whatsappTemplateName: 'application_incomplete_reminder',
            whatsappLanguage: 'en',
            enabled: true,
          },
        ],
        falseActions: [],
        enabled: true,
      },
      {
        type: ACTION_TYPES.DELAY,
        name: 'Wait 48 More Hours (72hr total)',
        delayHours: 48,
        enabled: true,
      },
      {
        type: ACTION_TYPES.CONDITION,
        name: 'Check Still Incomplete at 72hr',
        conditions: [
          { field: 'application.status', operator: 'equals', value: 'started', valueType: 'string' },
        ],
        conditionLogic: 'and',
        trueActions: [
          {
            type: ACTION_TYPES.SEND_EMAIL,
            name: 'Send Email Reminder - 72hr',
            emailSubject: 'Last Chance: Complete Your Application for {{job.title}}',
            emailBody: `
              <h2>Hi {{user.name}},</h2>
              <p>We noticed you still haven't completed your application for <strong>{{job.title}}</strong>.</p>
              <p>This is a popular position with many applicants. Complete your application now to be considered:</p>
              <a href="{{application.resumeUrl}}" style="padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px;">Complete Now</a>
              <p>Questions? Our team is here to help!</p>
            `,
            enabled: true,
          },
          {
            type: ACTION_TYPES.SEND_WHATSAPP,
            name: 'Send WhatsApp Reminder - 72hr',
            whatsappTemplateName: 'application_urgent_reminder',
            whatsappLanguage: 'en',
            enabled: true,
          },
        ],
        falseActions: [],
        enabled: true,
      },
      {
        type: ACTION_TYPES.DELAY,
        name: 'Wait 5 More Days (7day total)',
        delayHours: 120,
        enabled: true,
      },
      {
        type: ACTION_TYPES.CONDITION,
        name: 'Check Still Incomplete at 7 days',
        conditions: [
          { field: 'application.status', operator: 'equals', value: 'started', valueType: 'string' },
        ],
        conditionLogic: 'and',
        trueActions: [
          {
            type: ACTION_TYPES.SEND_EMAIL,
            name: 'Send Final Email - 7day',
            emailSubject: 'Your Application for {{job.title}} Will Expire Soon',
            emailBody: `
              <h2>Hi {{user.name}},</h2>
              <p>Your incomplete application for <strong>{{job.title}}</strong> will be removed from our system in 24 hours.</p>
              <p>If you're still interested, please complete your application:</p>
              <a href="{{application.resumeUrl}}" style="padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 4px;">Complete Application</a>
              <p>Not interested? No problem! You can ignore this email.</p>
            `,
            enabled: true,
          },
          {
            type: ACTION_TYPES.UPDATE_STATUS,
            name: 'Mark as Abandoned',
            statusField: 'application.status',
            statusValue: 'abandoned',
            enabled: true,
          },
        ],
        falseActions: [],
        enabled: true,
      },
    ],
    settings: {
      maxExecutionsPerEntity: 1,
      cooldownHours: 168, // 7 days
      allowReEntry: false,
    },
  },

  // 2. Company Posted Job but No Referrals
  COMPANY_NO_REFERRALS: {
    name: 'Company No Referrals Follow-up',
    description: 'Follow up with companies who posted jobs but received no referrals',
    category: 'company_engagement',
    trigger: {
      type: TRIGGER_TYPES.COMPANY_NO_REFERRALS,
      config: {
        checkAfterDays: 3,
      },
    },
    entryConditions: [
      { field: 'job.referralCount', operator: 'equals', value: 0, valueType: 'number' },
      { field: 'job.status', operator: 'equals', value: 'active', valueType: 'string' },
    ],
    actions: [
      {
        type: ACTION_TYPES.DELAY,
        name: 'Wait 3 Days',
        delayHours: 72,
        enabled: true,
      },
      {
        type: ACTION_TYPES.CONDITION,
        name: 'Check Still No Referrals',
        conditions: [
          { field: 'job.referralCount', operator: 'equals', value: 0, valueType: 'number' },
        ],
        conditionLogic: 'and',
        trueActions: [
          {
            type: ACTION_TYPES.SEND_EMAIL,
            name: 'Send Stats Email - 3 Days',
            emailSubject: 'Boost Your Job Visibility: {{job.title}}',
            emailBody: `
              <h2>Hi {{company.contactName}},</h2>
              <p>Your job posting <strong>{{job.title}}</strong> has been live for 3 days.</p>
              <h3>Current Stats:</h3>
              <ul>
                <li>Views: {{job.viewCount}}</li>
                <li>Referrals: 0</li>
                <li>Applications: {{job.applicationCount}}</li>
              </ul>
              <p><strong>Tips to get more referrals:</strong></p>
              <ol>
                <li>Increase the referral bonus amount</li>
                <li>Share the job on your social media</li>
                <li>Reach out to your existing referrer network</li>
              </ol>
              <a href="{{job.manageUrl}}" style="padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">Manage Job Posting</a>
            `,
            enabled: true,
          },
        ],
        falseActions: [],
        enabled: true,
      },
      {
        type: ACTION_TYPES.DELAY,
        name: 'Wait 4 More Days (7day total)',
        delayHours: 96,
        enabled: true,
      },
      {
        type: ACTION_TYPES.CONDITION,
        name: 'Check Still No Referrals at 7 Days',
        conditions: [
          { field: 'job.referralCount', operator: 'equals', value: 0, valueType: 'number' },
        ],
        conditionLogic: 'and',
        trueActions: [
          {
            type: ACTION_TYPES.SEND_EMAIL,
            name: 'Send Urgent Email - 7 Days',
            emailSubject: 'Action Needed: Your Job {{job.title}} Needs Attention',
            emailBody: `
              <h2>Hi {{company.contactName}},</h2>
              <p>Your job <strong>{{job.title}}</strong> has been live for a week with no referrals yet.</p>
              <p>This could indicate:</p>
              <ul>
                <li>The referral bonus may not be competitive</li>
                <li>The job requirements may be too restrictive</li>
                <li>Not enough visibility in our referrer network</li>
              </ul>
              <p><strong>Recommended actions:</strong></p>
              <ol>
                <li>Review and increase your referral bonus</li>
                <li>Simplify job requirements if possible</li>
                <li>Contact our team for a featured placement</li>
              </ol>
              <a href="{{job.manageUrl}}" style="padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px;">Review Job Now</a>
            `,
            enabled: true,
          },
          {
            type: ACTION_TYPES.SEND_NOTIFICATION,
            name: 'Notify Account Manager',
            notificationType: 'company_engagement_alert',
            notificationTitle: 'Company Needs Help: No Referrals for 7 Days',
            notificationMessage: '{{company.name}} has had {{job.title}} posted for 7 days with no referrals.',
            notificationPriority: 'high',
            enabled: true,
          },
        ],
        falseActions: [],
        enabled: true,
      },
    ],
    settings: {
      maxExecutionsPerEntity: 1,
      cooldownHours: 168,
      allowReEntry: true,
    },
  },

  // 3. Referrer Has Pending Referrals
  REFERRER_PENDING_REFERRALS: {
    name: 'Referrer Pending Referrals Reminder',
    description: 'Weekly reminder to referrers with pending referrals about earnings potential',
    category: 'referrer_engagement',
    trigger: {
      type: TRIGGER_TYPES.REFERRER_PENDING_REFERRALS,
      config: {
        minPendingReferrals: 1,
      },
    },
    entryConditions: [
      { field: 'referrer.pendingReferralsCount', operator: 'greater_than_or_equal', value: 1, valueType: 'number' },
    ],
    actions: [
      {
        type: ACTION_TYPES.DELAY,
        name: 'Wait for Weekly Schedule',
        delayHours: 168, // 1 week
        enabled: true,
      },
      {
        type: ACTION_TYPES.SEND_EMAIL,
        name: 'Weekly Pending Referrals Summary',
        emailSubject: 'Your Weekly Referral Summary: {{referrer.pendingEarnings}} MMK Waiting!',
        emailBody: `
          <h2>Hi {{user.name}},</h2>
          <p>Here's your weekly referral update:</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">💰 Pending Earnings</h3>
            <p style="font-size: 32px; font-weight: bold; color: #28a745; margin: 10px 0;">{{referrer.pendingEarnings}} MMK</p>
            <p>From {{referrer.pendingReferralsCount}} pending referrals</p>
          </div>
          <h3>Your Pending Referrals:</h3>
          <p>{{referrer.pendingReferralsList}}</p>
          <p><strong>What's next?</strong></p>
          <ul>
            <li>Follow up with your referrals to complete their applications</li>
            <li>Share more jobs to increase your earnings</li>
            <li>Check your referral dashboard for updates</li>
          </ul>
          <a href="{{referrer.dashboardUrl}}" style="padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">View Dashboard</a>
        `,
        enabled: true,
      },
      {
        type: ACTION_TYPES.SEND_WHATSAPP,
        name: 'WhatsApp Weekly Reminder',
        whatsappTemplateName: 'referrer_weekly_summary',
        whatsappLanguage: 'en',
        enabled: true,
      },
    ],
    settings: {
      maxExecutionsPerEntity: 0, // Unlimited (weekly recurring)
      cooldownHours: 144, // 6 days (allow some flexibility)
      allowReEntry: true,
    },
  },

  // 4. Referrer Inactive 14+ Days
  REFERRER_INACTIVE: {
    name: 'Inactive Referrer Re-engagement',
    description: 'Re-engage referrers who have been inactive for 14+ days with top jobs',
    category: 'referrer_engagement',
    trigger: {
      type: TRIGGER_TYPES.REFERRER_INACTIVE,
      config: {
        inactiveAfterDays: 14,
      },
    },
    entryConditions: [
      { field: 'referrer.daysSinceLastActivity', operator: 'greater_than_or_equal', value: 14, valueType: 'number' },
      { field: 'user.role', operator: 'equals', value: 'referrer', valueType: 'string' },
    ],
    actions: [
      {
        type: ACTION_TYPES.SEND_EMAIL,
        name: 'We Miss You Email',
        emailSubject: 'We Miss You, {{user.name}}! Top Jobs Await 🚀',
        emailBody: `
          <h2>Hi {{user.name}},</h2>
          <p>We noticed you haven't been active on TRM Jobs for a while. We've missed you!</p>
          <p>The referral market is hot right now. Here are some top opportunities:</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">🔥 Hot Jobs This Week</h3>
            {{topJobsList}}
          </div>
          <p><strong>Why come back?</strong></p>
          <ul>
            <li>New high-paying referral opportunities</li>
            <li>Improved referral tracking</li>
            <li>Faster payout processing</li>
          </ul>
          <a href="{{jobs.browseUrl}}" style="padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 4px;">Browse Jobs Now</a>
          <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
            Don't want these emails? <a href="{{unsubscribeUrl}}">Unsubscribe</a>
          </p>
        `,
        enabled: true,
      },
      {
        type: ACTION_TYPES.SEND_WHATSAPP,
        name: 'We Miss You WhatsApp',
        whatsappTemplateName: 'referrer_reengagement',
        whatsappLanguage: 'en',
        enabled: true,
      },
      {
        type: ACTION_TYPES.SEND_NOTIFICATION,
        name: 'In-App Re-engagement Notification',
        notificationType: 'referrer_reengagement',
        notificationTitle: 'We Miss You!',
        notificationMessage: 'New high-paying referral opportunities are waiting for you.',
        notificationPriority: 'normal',
        enabled: true,
      },
    ],
    settings: {
      maxExecutionsPerEntity: 3, // Max 3 re-engagement attempts
      cooldownHours: 168, // Weekly
      allowReEntry: true,
    },
  },

  // 5. Referral Status Changed
  REFERRAL_STATUS_CHANGED: {
    name: 'Referral Status Change Notification',
    description: 'Instant notification to referrer when their referral status changes',
    category: 'referral_management',
    trigger: {
      type: TRIGGER_TYPES.REFERRAL_STATUS_CHANGED,
      config: {
        notifyOnStatuses: ['submitted', 'under_review', 'interview_scheduled', 'hired', 'rejected'],
      },
    },
    entryConditions: [],
    actions: [
      {
        type: ACTION_TYPES.SEND_EMAIL,
        name: 'Status Update Email',
        emailSubject: 'Update: Your Referral to {{job.title}} is Now {{referral.status}}',
        emailBody: `
          <h2>Hi {{user.name}},</h2>
          <p>Great news! There's an update on your referral:</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Referral Details</h3>
            <p><strong>Candidate:</strong> {{referral.candidateName}}</p>
            <p><strong>Job:</strong> {{job.title}} at {{company.name}}</p>
            <p><strong>Status:</strong> <span style="color: #007bff; font-weight: bold;">{{referral.status}}</span></p>
            <p><strong>Updated:</strong> {{referral.updatedAt}}</p>
          </div>
          <p>{{statusMessage}}</p>
          <a href="{{referral.trackingUrl}}" style="padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">Track Referral</a>
        `,
        enabled: true,
      },
      {
        type: ACTION_TYPES.SEND_WHATSAPP,
        name: 'Status Update WhatsApp',
        whatsappTemplateName: 'referral_status_update',
        whatsappLanguage: 'en',
        enabled: true,
      },
      {
        type: ACTION_TYPES.SEND_NOTIFICATION,
        name: 'In-App Status Notification',
        notificationType: 'referral_status_changed',
        notificationTitle: 'Referral Status Updated',
        notificationMessage: 'Your referral for {{job.title}} is now {{referral.status}}',
        notificationPriority: 'high',
        enabled: true,
      },
    ],
    settings: {
      maxExecutionsPerEntity: 0, // Unlimited (every status change)
      cooldownHours: 0, // No cooldown
      allowReEntry: true,
    },
  },
};

// ==================== WORKFLOW ENGINE ====================

/**
 * Initialize predefined workflows
 * Creates default workflows if they don't exist
 */
const initializePredefinedWorkflows = async () => {
  try {
    console.log('[WorkflowEngine] Initializing predefined workflows...');
    
    for (const [key, config] of Object.entries(PREDEFINED_WORKFLOWS)) {
      const existing = await Workflow.findOne({ name: config.name });
      
      if (!existing) {
        await Workflow.create({
          ...config,
          status: WORKFLOW_STATUS.ACTIVE,
        });
        console.log(`[WorkflowEngine] Created workflow: ${config.name}`);
      } else {
        console.log(`[WorkflowEngine] Workflow already exists: ${config.name}`);
      }
    }
    
    console.log('[WorkflowEngine] Predefined workflows initialized');
  } catch (error) {
    console.error('[WorkflowEngine] Error initializing workflows:', error);
    throw error;
  }
};

/**
 * Trigger a workflow execution
 * @param {string} workflowId - Workflow ID or predefined key
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Execution result
 */
const triggerWorkflow = async (workflowId, options = {}) => {
  const {
    entityType,
    entityId,
    inputData = {},
    triggeredBy = 'system',
    triggeredByUserId = null,
    scheduledAt = null,
    priority = 5,
  } = options;

  try {
    // Find workflow
    let workflow;
    if (mongoose.Types.ObjectId.isValid(workflowId)) {
      workflow = await Workflow.findById(workflowId);
    } else if (PREDEFINED_WORKFLOWS[workflowId]) {
      workflow = await Workflow.findOne({ name: PREDEFINED_WORKFLOWS[workflowId].name });
    }

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (workflow.status !== WORKFLOW_STATUS.ACTIVE) {
      throw new Error(`Workflow is not active: ${workflow.name}`);
    }

    // Check if entity already has a pending execution for this workflow
    const existingPending = await WorkflowExecution.findOne({
      workflowId: workflow._id,
      entityId,
      status: { $in: [EXECUTION_STATUS.PENDING, EXECUTION_STATUS.RUNNING] },
    });

    if (existingPending) {
      return {
        success: false,
        message: 'Pending execution already exists for this entity',
        executionId: existingPending._id,
      };
    }

    // Check cooldown period
    const lastExecution = await WorkflowExecution.findOne({
      workflowId: workflow._id,
      entityId,
      status: { $in: [EXECUTION_STATUS.COMPLETED, EXECUTION_STATUS.FAILED] },
    }).sort({ completedAt: -1 });

    if (lastExecution && !workflow.canExecuteForEntity(entityId, lastExecution.completedAt)) {
      return {
        success: false,
        message: 'Cooldown period not elapsed',
        nextEligibleAt: new Date(lastExecution.completedAt.getTime() + (workflow.settings.cooldownHours * 60 * 60 * 1000)),
      };
    }

    // Build execution context
    const context = await buildExecutionContext(entityType, entityId, inputData);

    // Check entry conditions
    const entryConditionsMet = evaluateConditions(
      workflow.entryConditions,
      workflow.entryConditionLogic,
      context
    );

    if (!entryConditionsMet) {
      return {
        success: false,
        message: 'Entry conditions not met',
      };
    }

    // Create execution record
    const execution = new WorkflowExecution({
      workflowId: workflow._id,
      workflowName: workflow.name,
      triggerType: workflow.trigger.type,
      triggeredBy,
      triggeredByUserId,
      entityType,
      entityId,
      relatedEntities: context.relatedEntities || {},
      status: EXECUTION_STATUS.PENDING,
      scheduledAt: scheduledAt || new Date(),
      actionResults: workflow.actions.map((action, index) => ({
        actionId: action._id || new mongoose.Types.ObjectId(),
        actionType: action.type,
        actionName: action.name,
        status: ACTION_STATUS.PENDING,
        maxRetries: action.retryCount || 3,
      })),
      context,
      inputData,
      priority,
    });

    await execution.save();

    // Execute immediately if not scheduled
    if (!scheduledAt || scheduledAt <= new Date()) {
      await executeWorkflow(execution._id);
    }

    return {
      success: true,
      executionId: execution._id,
      status: execution.status,
    };
  } catch (error) {
    console.error('[WorkflowEngine] Error triggering workflow:', error);
    throw error;
  }
};

/**
 * Execute a workflow
 * @param {string} executionId - Workflow execution ID
 */
const executeWorkflow = async (executionId) => {
  const execution = await WorkflowExecution.findById(executionId);
  if (!execution) {
    throw new Error(`Execution not found: ${executionId}`);
  }

  if (execution.status !== EXECUTION_STATUS.PENDING && execution.status !== EXECUTION_STATUS.RETRYING) {
    return { success: false, message: `Execution is ${execution.status}` };
  }

  // Update status to running
  execution.status = EXECUTION_STATUS.RUNNING;
  execution.startedAt = new Date();
  execution.addLog('info', 'Workflow execution started', 'workflow_engine');
  await execution.save();

  try {
    const workflow = await Workflow.findById(execution.workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Execute actions sequentially
    for (let i = execution.currentActionIndex; i < workflow.actions.length; i++) {
      // Check if execution was cancelled
      const currentExecution = await WorkflowExecution.findById(executionId);
      if (currentExecution.status === EXECUTION_STATUS.CANCELLED) {
        return { success: false, message: 'Execution cancelled' };
      }

      const action = workflow.actions[i];
      execution.currentActionIndex = i;
      await execution.save();

      try {
        await executeAction(execution, action, i, workflow);
      } catch (error) {
        console.error(`[WorkflowEngine] Action ${i} failed:`, error);
        execution.updateActionStatus(i, ACTION_STATUS.FAILED, null, {
          message: error.message,
          code: error.code || 'ACTION_ERROR',
          stack: error.stack,
        });
        execution.addLog('error', `Action ${action.name} failed: ${error.message}`, 'action_handler');
        
        // Continue or stop based on action configuration
        if (action.stopOnFailure !== false) {
          execution.status = EXECUTION_STATUS.FAILED;
          execution.error = {
            message: error.message,
            code: error.code || 'ACTION_ERROR',
            actionIndex: i,
          };
          await execution.save();
          return { success: false, message: error.message };
        }
      }
    }

    // Mark as completed
    execution.status = EXECUTION_STATUS.COMPLETED;
    execution.completedAt = new Date();
    execution.addLog('info', 'Workflow execution completed successfully', 'workflow_engine');
    await execution.save();

    // Update workflow stats
    await workflow.incrementStats('success');

    return { success: true, executionId: execution._id };
  } catch (error) {
    console.error('[WorkflowEngine] Workflow execution failed:', error);
    execution.status = EXECUTION_STATUS.FAILED;
    execution.error = {
      message: error.message,
      code: error.code || 'EXECUTION_ERROR',
      stack: error.stack,
    };
    await execution.save();

    // Update workflow stats
    const workflow = await Workflow.findById(execution.workflowId);
    if (workflow) {
      await workflow.incrementStats('failed');
    }

    throw error;
  }
};

/**
 * Execute a single action
 * @param {WorkflowExecution} execution - Execution document
 * @param {Object} action - Action configuration
 * @param {number} actionIndex - Action index
 * @param {Workflow} workflow - Workflow document
 */
const executeAction = async (execution, action, actionIndex, workflow) => {
  if (!action.enabled) {
    execution.updateActionStatus(actionIndex, ACTION_STATUS.SKIPPED, { message: 'Action disabled' });
    await execution.save();
    return;
  }

  execution.updateActionStatus(actionIndex, ACTION_STATUS.RUNNING);
  await execution.save();

  let result;

  switch (action.type) {
    case ACTION_TYPES.DELAY:
      result = await executeDelayAction(action, execution);
      break;
    case ACTION_TYPES.CONDITION:
      result = await executeConditionAction(action, execution, workflow);
      break;
    case ACTION_TYPES.SEND_EMAIL:
      result = await executeEmailAction(action, execution);
      break;
    case ACTION_TYPES.SEND_WHATSAPP:
      result = await executeWhatsAppAction(action, execution);
      break;
    case ACTION_TYPES.SEND_NOTIFICATION:
      result = await executeNotificationAction(action, execution);
      break;
    case ACTION_TYPES.UPDATE_STATUS:
      result = await executeUpdateStatusAction(action, execution);
      break;
    case ACTION_TYPES.WEBHOOK:
      result = await executeWebhookAction(action, execution);
      break;
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }

  execution.updateActionStatus(actionIndex, ACTION_STATUS.COMPLETED, result);
  execution.addActionLog(actionIndex, 'info', `Action completed: ${action.name}`, result);
  await execution.save();
};

// ==================== ACTION HANDLERS ====================

const executeDelayAction = async (action, execution) => {
  const delayMs = ((action.delayHours || 0) * 60 + (action.delayMinutes || 0)) * 60 * 1000;
  
  if (delayMs > 0) {
    execution.nextScheduledAt = new Date(Date.now() + delayMs);
    await execution.save();
    
    // In a real implementation, this would schedule the continuation
    // For now, we'll just log it
    console.log(`[WorkflowEngine] Delay action: waiting ${action.delayHours}h ${action.delayMinutes}m`);
  }
  
  return { delayed: true, delayMs };
};

const executeConditionAction = async (action, execution, workflow) => {
  const conditionsMet = evaluateConditions(
    action.conditions,
    action.conditionLogic,
    execution.context
  );

  // Execute true/false actions
  const actionsToExecute = conditionsMet ? action.trueActions : action.falseActions;
  
  if (actionsToExecute && actionsToExecute.length > 0) {
    for (const nestedAction of actionsToExecute) {
      // In a real implementation, these would be properly resolved action references
      console.log(`[WorkflowEngine] Would execute nested action: ${nestedAction.name || nestedAction}`);
    }
  }

  return { conditionsMet, actionsExecuted: actionsToExecute?.length || 0 };
};

const executeEmailAction = async (action, execution) => {
  const { context } = execution;
  const user = context.user;
  
  if (!user || !user.email) {
    throw new Error('No recipient email available');
  }

  // Process template variables
  const subject = processTemplate(action.emailSubject, context);
  const body = processTemplate(action.emailBody, context);

  // Send email using existing service
  const result = await sendEmail({
    to: user.email,
    subject,
    html: body,
    metadata: {
      workflowExecutionId: execution._id,
      workflowId: execution.workflowId,
      actionIndex: execution.currentActionIndex,
    },
  });

  return {
    success: true,
    messageId: result.messageId,
    emailLogId: result.emailLogId,
    recipient: user.email,
  };
};

const executeWhatsAppAction = async (action, execution) => {
  const { context } = execution;
  const user = context.user;
  
  if (!user || !user.phone) {
    throw new Error('No recipient phone available');
  }

  const phoneNumber = formatPhoneNumber(user.phone);

  // Use template if specified
  if (action.whatsappTemplateName) {
    const result = await sendTemplateMessage({
      to: phoneNumber,
      templateName: action.whatsappTemplateName,
      language: action.whatsappLanguage || 'en',
      parameters: context.templateVariables || {},
    });

    return {
      success: true,
      messageId: result.messageId,
      whatsappMessageId: result.whatsappMessageId,
      recipient: phoneNumber,
    };
  }

  throw new Error('WhatsApp template name not specified');
};

const executeNotificationAction = async (action, execution) => {
  const { context } = execution;
  const user = context.user;
  
  if (!user || !user._id) {
    throw new Error('No user available for notification');
  }

  const title = processTemplate(action.notificationTitle, context);
  const message = processTemplate(action.notificationMessage, context);

  const result = await sendAppNotification({
    userId: user._id,
    type: action.notificationType || 'workflow_notification',
    title,
    message,
    priority: action.notificationPriority || 'normal',
    channels: ['in_app', 'push'],
    metadata: {
      workflowExecutionId: execution._id,
      workflowId: execution.workflowId,
    },
  });

  return {
    success: true,
    notificationId: result.notification?._id,
    recipient: user._id.toString(),
  };
};

const executeUpdateStatusAction = async (action, execution) => {
  const { entityType, entityId } = execution;
  
  let model;
  switch (entityType) {
    case ENTITY_TYPES.APPLICATION:
      model = Application;
      break;
    case ENTITY_TYPES.REFERRAL:
      model = Referral;
      break;
    case ENTITY_TYPES.JOB:
      model = Job;
      break;
    default:
      throw new Error(`Cannot update status for entity type: ${entityType}`);
  }

  const update = { [action.statusField]: action.statusValue };
  await model.findByIdAndUpdate(entityId, update);

  return {
    success: true,
    field: action.statusField,
    value: action.statusValue,
  };
};

const executeWebhookAction = async (action, execution) => {
  const { context } = execution;
  
  const url = processTemplate(action.webhookUrl, context);
  const body = processTemplate(JSON.stringify(action.webhookBody), context);

  const response = await axios({
    method: action.webhookMethod || 'POST',
    url,
    headers: {
      'Content-Type': 'application/json',
      ...action.webhookHeaders,
    },
    data: JSON.parse(body),
    timeout: 30000,
  });

  return {
    success: true,
    statusCode: response.status,
    responseBody: response.data,
  };
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Build execution context with all relevant data
 */
const buildExecutionContext = async (entityType, entityId, inputData) => {
  const context = {
    entityType,
    entityId,
    inputData,
    relatedEntities: {},
    templateVariables: {},
  };

  try {
    // Load entity and related data
    switch (entityType) {
      case ENTITY_TYPES.USER:
        context.user = await User.findById(entityId).lean();
        break;
      case ENTITY_TYPES.APPLICATION:
        context.application = await Application.findById(entityId).lean();
        if (context.application) {
          context.user = await User.findById(context.application.userId).lean();
          context.job = await Job.findById(context.application.jobId).lean();
          if (context.job) {
            context.company = await Company.findById(context.job.companyId).lean();
          }
          context.relatedEntities = {
            userId: context.application.userId,
            jobId: context.application.jobId,
            companyId: context.job?.companyId,
          };
        }
        break;
      case ENTITY_TYPES.REFERRAL:
        context.referral = await Referral.findById(entityId).lean();
        if (context.referral) {
          context.user = await User.findById(context.referral.referrerId).lean();
          context.job = await Job.findById(context.referral.jobId).lean();
          if (context.job) {
            context.company = await Company.findById(context.job.companyId).lean();
          }
          context.relatedEntities = {
            userId: context.referral.referrerId,
            jobId: context.referral.jobId,
            companyId: context.job?.companyId,
            referralId: context.referral._id,
          };
        }
        break;
      case ENTITY_TYPES.JOB:
        context.job = await Job.findById(entityId).lean();
        if (context.job) {
          context.company = await Company.findById(context.job.companyId).lean();
          context.relatedEntities = {
            jobId: context.job._id,
            companyId: context.job.companyId,
          };
        }
        break;
      case ENTITY_TYPES.COMPANY:
        context.company = await Company.findById(entityId).lean();
        context.relatedEntities = {
          companyId: context.company?._id,
        };
        break;
    }

    // Build template variables
    context.templateVariables = buildTemplateVariables(context);

  } catch (error) {
    console.error('[WorkflowEngine] Error building context:', error);
  }

  return context;
};

/**
 * Build template variables from context
 */
const buildTemplateVariables = (context) => {
  const vars = {};

  if (context.user) {
    vars.user = {
      name: context.user.name,
      email: context.user.email,
      phone: context.user.phone,
    };
  }

  if (context.job) {
    vars.job = {
      title: context.job.title,
      location: context.job.location,
      viewCount: context.job.viewCount || 0,
      referralCount: context.job.referralCount || 0,
      applicationCount: context.job.applicationCount || 0,
    };
  }

  if (context.company) {
    vars.company = {
      name: context.company.name,
      contactName: context.company.contactName,
    };
  }

  if (context.referral) {
    vars.referral = {
      status: context.referral.status,
      candidateName: context.referral.referredPerson?.name,
      updatedAt: context.referral.updatedAt,
    };
  }

  if (context.application) {
    vars.application = {
      status: context.application.status,
      resumeUrl: context.application.resumeUrl,
    };
  }

  return vars;
};

/**
 * Process template string with variables
 */
const processTemplate = (template, context) => {
  if (!template) return '';
  
  return template.replace(/\{\{(\w+\.?\w*)\}\}/g, (match, path) => {
    const keys = path.split('.');
    let value = context;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined || value === null) {
        return match; // Keep original if not found
      }
    }
    
    return String(value);
  });
};

/**
 * Evaluate conditions
 */
const evaluateConditions = (conditions, logic, context) => {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  const results = conditions.map(condition => {
    const value = getValueFromPath(context, condition.field);
    return evaluateCondition(condition, value);
  });

  if (logic === 'or') {
    return results.some(r => r);
  }
  return results.every(r => r);
};

/**
 * Evaluate a single condition
 */
const evaluateCondition = (condition, actualValue) => {
  const { operator, value, valueType } = condition;

  // Convert actual value to appropriate type
  let typedActualValue = actualValue;
  if (valueType === 'number' && typeof actualValue === 'string') {
    typedActualValue = parseFloat(actualValue);
  } else if (valueType === 'boolean' && typeof actualValue === 'string') {
    typedActualValue = actualValue.toLowerCase() === 'true';
  } else if (valueType === 'date' && typeof actualValue === 'string') {
    typedActualValue = new Date(actualValue);
  }

  switch (operator) {
    case CONDITION_OPERATORS.EQUALS:
      return typedActualValue === value;
    case CONDITION_OPERATORS.NOT_EQUALS:
      return typedActualValue !== value;
    case CONDITION_OPERATORS.GREATER_THAN:
      return typedActualValue > value;
    case CONDITION_OPERATORS.LESS_THAN:
      return typedActualValue < value;
    case CONDITION_OPERATORS.GREATER_THAN_OR_EQUAL:
      return typedActualValue >= value;
    case CONDITION_OPERATORS.LESS_THAN_OR_EQUAL:
      return typedActualValue <= value;
    case CONDITION_OPERATORS.CONTAINS:
      return String(typedActualValue).includes(String(value));
    case CONDITION_OPERATORS.NOT_CONTAINS:
      return !String(typedActualValue).includes(String(value));
    case CONDITION_OPERATORS.EXISTS:
      return typedActualValue !== undefined && typedActualValue !== null;
    case CONDITION_OPERATORS.NOT_EXISTS:
      return typedActualValue === undefined || typedActualValue === null;
    case CONDITION_OPERATORS.IN:
      return Array.isArray(value) && value.includes(typedActualValue);
    case CONDITION_OPERATORS.NOT_IN:
      return Array.isArray(value) && !value.includes(typedActualValue);
    default:
      return false;
  }
};

/**
 * Get value from nested object path
 */
const getValueFromPath = (obj, path) => {
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) {
      return undefined;
    }
  }
  
  return value;
};

// ==================== EXPORT ADDITIONAL FUNCTIONS ====================

  buildExecutionContext,
  evaluateConditions,
  processTemplate,
};