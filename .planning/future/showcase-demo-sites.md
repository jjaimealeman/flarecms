# Showcase Demo Sites

## Vision

Build multiple demo websites powered by Flare CMS to showcase real-world use cases.
Each demo = Astro frontend + mock CMS data + AI-generated images.
Hosted on subdomains (e.g., restaurant.flarecms.dev, tattoo.flarecms.dev).

## Why

- Don't wait for users to provide showcase projects — build them ourselves
- Client proposal tool: "This is what your website could look like" + hand them admin credentials
- Real UAT feedback: discover confusing UI, missing features, plugin ideas
- Differentiator: most headless CMS products just show dashboard screenshots
- Dogfooding: proves Flare CMS works for real business types

## Target Business Types

- **Restaurant** — menu items, food photos, categories, prices, hours
- **Tattoo shop / artist gallery** — portfolio, image-heavy, artist bios
- **HVAC / landscaping / dog grooming** — services, pricing, testimonials, booking
- **Small law firm** — practice areas, team bios, case results, contact
- **Photography studio** — galleries, packages, client proofs
- More as ideas come up

## Implementation Per Demo

1. Define collections (menu-items, services, team-members, etc.)
2. Generate mock content (AI text + AI images)
3. Seed CMS database with realistic data
4. Build Astro frontend using Lexington themes as starting point
   - Source: `/home/jaime/www/_github/lexington-themes`
5. Deploy to subdomain on Cloudflare Pages
6. Create demo admin account for client walkthroughs

## Plugin Ideas Surfaced

- **Blog comments** — comment system plugin (moderation, spam filtering)
- **AI chatbot** — already in future/ planning
- **Messaging/contact system** — save form submissions to DB, admin inbox
- **Booking/scheduling** — for service businesses
- **Menu builder** — structured menu with categories, dietary tags, prices

## Prerequisites

- CMS feature-complete and deployed
- All current roadmap items done (dark mode, rate limiting, snippets)
- Stable plugin system

## 915website.com Integration

These demos double as sales tools for Jaime's agency work.
Each demo shows a prospect exactly what they'd get, with real CMS access.
Client feedback loops back into product improvements.
