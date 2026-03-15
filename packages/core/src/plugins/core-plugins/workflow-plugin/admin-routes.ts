import { Hono } from 'hono'
import type { Bindings, Variables } from '../../../app'
import { requireAuth } from '../../../middleware'
import { WorkflowEngine } from './services/workflow-service'
import { SchedulerService } from './services/scheduler'
import { renderWorkflowDashboard } from './templates/workflow-dashboard'
import { renderWorkflowContentDetail } from './templates/workflow-content'
import { renderScheduledContent } from './templates/scheduled-content'

export function createWorkflowAdminRoutes() {
  const adminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

  // Auth middleware — decodes JWT and sets c.get('user') for all workflow admin routes
  adminRoutes.use('*', requireAuth())

  // Workflow Dashboard
  adminRoutes.get('/dashboard', async (c) => {
    const user = c.get('user')
    if (!user) {
      return c.redirect('/auth/login')
    }

    // Check permissions (simplified for now - assume admin has all permissions)
    if (user.role !== 'admin') {
      return c.text('Forbidden', 403)
    }

    try {
      const workflowEngine = new WorkflowEngine(c.env.DB)

      // Auto-enroll any content missing workflow status (one-time backfill per item)
      try {
        const { results: unenrolled } = await c.env.DB.prepare(`
          SELECT c.id, c.collection_id, c.status
          FROM content c
          LEFT JOIN content_workflow_status cws ON c.id = cws.content_id
          WHERE cws.id IS NULL
        `).all() as { results: Array<{ id: string, collection_id: string, status: string }> }
        for (const item of unenrolled) {
          await workflowEngine.initializeContentWorkflow(item.id, item.collection_id)
          // Sync workflow state to match current content status
          const stateId = item.status || 'draft'
          await c.env.DB.prepare(`
            UPDATE content_workflow_status SET current_state_id = ? WHERE content_id = ?
          `).bind(stateId, item.id).run()
          await c.env.DB.prepare(`
            UPDATE content SET workflow_state_id = ? WHERE id = ?
          `).bind(stateId, item.id).run()
        }
        if (unenrolled.length > 0) {
          console.log(`[workflow] Backfilled ${unenrolled.length} content items into workflow`)
        }
      } catch (backfillErr) {
        console.error('[workflow] Backfill failed:', backfillErr)
      }

      // Get workflow states and counts with error handling
      console.log('Fetching workflow states...')
      const states = await workflowEngine.getWorkflowStates()
      console.log(`Found ${states.length} workflow states:`, states.map(s => s.name))
      
      const stateData = []
      
      for (const state of states) {
        console.log(`Processing state: ${state.name} (${state.id})`)
        try {
          const content = await workflowEngine.getContentByState(state.id, 10)
          console.log(`Found ${content.length} content items for state ${state.name}`)
          
          stateData.push({
            ...state,
            count: content.length,
            content: content.slice(0, 5) // Show first 5 items
          })
        } catch (stateError) {
          console.error(`Error getting content for state ${state.name}:`, stateError)
          // Add state with zero count if there's an error
          stateData.push({
            ...state,
            count: 0,
            content: []
          })
        }
      }

      // Get assigned content with error handling
      console.log('Fetching assigned content...')
      let assignedContent: any[] = []
      try {
        assignedContent = await workflowEngine.getAssignedContent(user.userId)
        console.log(`Found ${assignedContent.length} assigned content items`)
      } catch (assignedError) {
        console.error('Error getting assigned content:', assignedError)
      }

      const data = {
        user,
        states: stateData,
        assignedContent
      }

      console.log('Dashboard data prepared:', {
        stateCount: data.states.length,
        assignedCount: data.assignedContent.length
      })

      return c.html(renderWorkflowDashboard(data))
    } catch (error) {
      console.error('Critical error in workflow dashboard:', error)
      
      // Return error page or basic HTML with error info
      return c.html(`
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h1>Workflow Dashboard Error</h1>
          <p><strong>Error:</strong> ${(error as Error).message}</p>
          <p><strong>Stack:</strong> <pre>${(error as Error).stack}</pre></p>
          <hr>
          <p><a href="/admin/workflow/debug">Check Debug Endpoint</a></p>
          <p><a href="/admin">Return to Admin</a></p>
        </div>
      `)
    }
  })

  // Content workflow detail
  adminRoutes.get('/content/:contentId', async (c) => {
    const user = c.get('user')
    if (!user) {
      return c.redirect('/auth/login')
    }

    const contentId = c.req.param('contentId')
    const workflowEngine = new WorkflowEngine(c.env.DB)

    // Get content details (LEFT JOIN users — author_id may not match users.id)
    const content = await c.env.DB.prepare(`
      SELECT c.*, col.name as collection_name, u.username as author_name
      FROM content c
      JOIN collections col ON c.collection_id = col.id
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `).bind(contentId).first()

    if (!content) {
      return c.text('Content not found', 404)
    }

    // Get workflow status
    const workflowStatus = await workflowEngine.getContentWorkflowStatus(contentId)
    const currentState = await c.env.DB.prepare(`
      SELECT * FROM workflow_states WHERE id = ?
    `).bind(workflowStatus?.current_state_id || 'draft').first()

    // Get available transitions (uses userRole, not userId)
    const availableTransitions = workflowStatus
      ? await workflowEngine.getAvailableTransitions(
          workflowStatus.workflow_id,
          workflowStatus.current_state_id,
          user.role || 'viewer'
        )
      : []

    // Get workflow history
    const history = await workflowEngine.getWorkflowHistory(contentId)

    // Get scheduled actions
    const scheduler = new SchedulerService(c.env.DB)
    const scheduledActions = await scheduler.getScheduledContentForContent(contentId)

    const data = {
      user,
      content,
      currentState,
      workflowStatus,
      availableTransitions,
      history,
      scheduledActions
    }

    return c.html(renderWorkflowContentDetail(data))
  })

  // Get scheduled content
  adminRoutes.get('/scheduled', async (c) => {
    const user = c.get('user')
    if (!user) {
      return c.redirect('/auth/login')
    }

    const scheduler = new SchedulerService(c.env.DB)
    const scheduledContent = await scheduler.getScheduledContentForUser(user.userId)
    const stats = await scheduler.getScheduledContentStats()

    const data = {
      user,
      scheduledContent,
      stats
    }

    return c.html(renderScheduledContent(data))
  })

  return adminRoutes
}