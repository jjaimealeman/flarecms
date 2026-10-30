/**
 * Workflow Plugin — Service & Type Exports
 *
 * Routes are wired directly in app.ts (not via PluginManager).
 * This file re-exports services and types for external consumers.
 */

export {
  WorkflowService,
  WorkflowEngine
} from './services/workflow-service'

export {
  SchedulerService as WorkflowSchedulerService
} from './services/scheduler'

export {
  AutomationEngine as WorkflowAutomationEngine
} from './services/automation'

export {
  NotificationService as WorkflowNotificationService
} from './services/notifications'

export {
  WebhookService as WorkflowWebhookService
} from './services/webhooks'

export {
  ContentWorkflow as WorkflowContentWorkflow,
  WorkflowManager as WorkflowContentManager,
  ContentStatus,
  WorkflowAction,
  defaultWorkflowPermissions,
  workflowTransitions
} from './services/content-workflow'
