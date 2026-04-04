# Disruptive Experience

Production code for:
- `https://disruptiveexperience.com`
- `https://boss.disruptiveexperience.com`

## Active Surface

The live project is intentionally small now.

- `index.html`
  Public homepage
- `styles.css`
  Homepage styles
- `script.js`
  Homepage interactions, validation, and analytics events
- `boss.html`
  Private analytics dashboard shell
- `boss.css`
  Dashboard styles
- `boss.js`
  Dashboard client logic and charts
- `api/contact.js`
  Contact form handler
- `api/boss-auth.js`
  Dashboard password login
- `api/boss-session.js`
  Dashboard session check
- `api/boss-logout.js`
  Dashboard logout endpoint
- `api/boss-stats.js`
  Dashboard data endpoint backed by PostHog
- `api/_boss.js`
  Shared dashboard helpers
- `assets/images/`
  Local images used by the homepage
- `vercel.json`
  Host routing and security headers
- `scripts/check.mjs`
  Lightweight project verification

Everything else that used to clutter the root has been moved to [`_archive`](/Users/patu/Documents/CursorProjects/DE.Main/_archive).

## Local Development

```bash
npm run dev
```

Open:
- `http://localhost:8080`
- `http://localhost:8080/boss`

## Checks

```bash
npm run check
```

This validates:
- required project files exist
- key JS files parse cleanly
- `vercel.json` is valid JSON

## Environment Variables

Production uses Vercel environment variables for:
- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL`
- `TASTE_OF_GASCONY_TO_EMAIL`
- `CONTACT_FROM_EMAIL`
- `POSTHOG_PERSONAL_API_KEY`
- `POSTHOG_PROJECT_ID`
- `BOSS_DASHBOARD_PASSWORD`
- `BOSS_SESSION_SECRET`

## Notes

- `boss.disruptiveexperience.com` redirects into the dashboard route and serves the private analytics surface.
- The dashboard is intentionally a lightweight custom layer over PostHog, optimized for readability rather than raw analytics complexity.
