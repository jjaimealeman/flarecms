# Workflow Engine — Team Collaboration & Content Approval

## The Big Idea
Transform Flare CMS from a solo-dev CMS into a team CMS. Built-in content approval workflows that competitors charge $99+/mo for or lock behind Enterprise plans.

## Target Users
- **Law firms** — paralegal drafts, associate reviews, partner approves
- **Schools** — teacher creates announcements, principal approves before parents see them
- **Podcast teams** — producer writes show notes, host reviews, editor publishes
- **Publishing companies** — writer → editor → chief editor → published
- **Agencies** — designer uploads, account manager reviews, client approves
- **Small/medium businesses** — any team where "not everyone should be able to hit Publish"

## Competitive Advantage
- **WordPress** — needs plugins for approval workflows
- **Sanity** — custom roles locked behind $99/mo Team plan
- **Strapi** — custom roles are Enterprise-only
- **Directus** — approval workflows require custom extensions
- **Flare CMS** — ships free, built-in, ready to go

## What Already Exists (the bones)
- `workflow-plugin/` directory with real services:
  - `WorkflowService` + `WorkflowEngine` — state management, transitions, history
  - `SchedulerService` — scheduled publish/unpublish (already active in production)
  - `ContentWorkflow` + `WorkflowManager` — content status and workflow actions
  - `AutomationEngine` — workflow automation logic
  - `NotificationService` — notifications for assigned content
  - `WebhookService` — webhook integration for workflow events
- 7 DB tables already created by migrations (workflow_states, workflows, workflow_transitions, etc.)
- Admin templates: dashboard, content workflow detail, scheduled content
- Routes exist but are commented out in index.ts

## What Needs to Be Built

### Phase 1: Core Roles & Permissions
- Define role hierarchy: admin > editor > author > contributor > viewer
- Per-collection role assignments (editor of Blog, viewer of Legal Docs)
- Role-based UI — hide Publish button if you're just an author

### Phase 2: Approval Workflows
- Configurable per-collection workflows (Blog needs approval, FAQ doesn't)
- Default workflow: Draft → In Review → Approved → Published
- Custom workflows: admin creates their own states and transitions
- Assignment: "Send this to [person] for review"
- Dashboard: "3 items waiting for your approval"

### Phase 3: Notifications
- In-app notifications (bell icon in admin header)
- Email notifications via existing email plugin (Resend)
- "Hey Sarah, the blog post 'Q4 Results' needs your review"
- Configurable: who gets notified for what

### Phase 4: Activity Feed & Audit Trail
- Who changed what, when, and why
- Content version history with diff view
- "John moved 'Q4 Results' from Draft to In Review at 3:42 PM"

### Phase 5: Webhooks & Integrations
- Fire webhooks on state transitions (Slack notification when content approved)
- Zapier/n8n integration possibilities

## Design Principles
- Zero-config for solo users — workflow is invisible if you're the only user
- Progressive complexity — starts simple, grows with the team
- Per-collection opt-in — not every collection needs an approval chain
- Mobile-friendly approval — approve content from your phone

## Revenue Angle
This is the feature that makes Flare CMS viable for agencies selling to clients. Instead of setting up WordPress + 3 plugins + custom roles, they deploy Flare CMS with workflows out of the box.
