# Requirements: Flare CMS -- Live Demo

**Defined:** 2026-03-16
**Core Value:** Let visitors experience FlareCMS firsthand with zero friction -- email in, demo out.

## v2.1 Requirements

### Demo Access

- [ ] **DEMO-01**: Visitor enters email on /demo page and receives OTP code via Resend
- [ ] **DEMO-02**: Visitor enters OTP code and is logged into admin as `demo` role
- [ ] **DEMO-03**: Demo user session expires after 30 minutes
- [ ] **DEMO-04**: Demo signup captured in `demo_signups` table (email, IP, timestamp)

### Sandbox

- [ ] **SAND-01**: `demo-sandbox` collection exists with sample fields (title, content, status)
- [ ] **SAND-02**: Demo role has read-only access to all collections except sandbox
- [ ] **SAND-03**: Demo role has full CRUD on `demo-sandbox` collection only
- [ ] **SAND-04**: Demo users limited to 50 mutations per session
- [ ] **SAND-05**: Demo file uploads restricted to images only, max 2MB

### Demo Page

- [ ] **PAGE-01**: `/demo` Astro page with brief explanation and email input
- [ ] **PAGE-02**: Disclaimer about data reset and session limits displayed on page
- [ ] **PAGE-03**: After OTP verification, redirect to admin.flarecms.dev with demo session

### Reset & Cleanup

- [ ] **RESET-01**: Cron trigger runs every 6 hours
- [ ] **RESET-02**: Cron deletes all demo-sandbox content and re-seeds with clean data
- [ ] **RESET-03**: Cron purges expired demo user sessions

## Future Requirements

- **DEMO-F01**: Polished landing page with screenshots, feature highlights, and CTA
- **DEMO-F02**: Demo analytics dashboard (how many signups, avg session time, popular actions)
- **DEMO-F03**: Demo user can save their sandbox work and return later

## Out of Scope

| Feature | Reason |
|---------|--------|
| Social login (Google/GitHub) | OTP is simpler, no OAuth complexity |
| Persistent demo accounts | Defeats sandbox isolation, increases abuse surface |
| Demo on custom domains | This is for flarecms.dev only |
| Admin panel theming for demo | Use existing dark/light mode as-is |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEMO-01 | Phase 12 | Pending |
| DEMO-02 | Phase 12 | Pending |
| DEMO-03 | Phase 12 | Pending |
| DEMO-04 | Phase 11 | Pending |
| SAND-01 | Phase 11 | Pending |
| SAND-02 | Phase 11 | Pending |
| SAND-03 | Phase 11 | Pending |
| SAND-04 | Phase 11 | Pending |
| SAND-05 | Phase 11 | Pending |
| PAGE-01 | Phase 13 | Pending |
| PAGE-02 | Phase 13 | Pending |
| PAGE-03 | Phase 13 | Pending |
| RESET-01 | Phase 14 | Pending |
| RESET-02 | Phase 14 | Pending |
| RESET-03 | Phase 14 | Pending |

**Coverage:**
- v2.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-03-16*
*Traceability updated: 2026-03-16*
