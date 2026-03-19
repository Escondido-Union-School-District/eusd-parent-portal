# EUSD Parent Portal — Maintenance Guide

This file tracks all content that requires manual updates. Grouped by update frequency.

---

## Annual

| What | Where | When to update | How to update |
|------|-------|----------------|---------------|
| Bell schedules (all schools) | `data/schools.json` → `bellSchedule` | Annually, when board approves new schedule (typically November) | Edit start/end/thursday/minimum times per school, redeploy |
| School year calendar dates | `data/calendar.json` → `schoolYears` | Annually, when board approves new calendar | Add new school year object with all dates, redeploy |
| Calendar PDF download links | `data/calendar.json` → `pdfUrl` | Annually, when new PDF is published on eusd.org | Update the URL, redeploy |
| Principal names | `data/schools.json` → `principal` | Annually or when principals change | Edit the name string, redeploy |
| Current school year setting | `data/config.json` → `currentSchoolYear` | Annually, at start of new school year | Change to new year (e.g., "2026-2027"), redeploy |
| SARC report URLs | `data/schools.json` → `sarcUrl` | Annually, when new SARC reports are published | Update URLs per school, redeploy |
| Promo video URLs | `data/schools.json` → `promoVideoUrl` | Annually or when new videos are published | Update YouTube URLs per school, redeploy |
| Copyright year in footer | `index.html` → footer | January each year | Update © year, redeploy |

## Seasonal

| What | Where | When to update | How to update |
|------|-------|----------------|---------------|
| Enrollment dates & info | `data/tasks.json` → `enroll` entry → `trayHtml` | When enrollment windows open/close (typically 3-4 times/year) | Edit the HTML content in the tray, redeploy. You see these changes when you approve them on eusd.org. |
| EXPLORE program offerings | `data/tasks.json` → `explore` entry → `trayHtml` | When new camps/opportunities are announced | Add links to flyers/PDFs in the tray HTML, redeploy |
| Forms inventory | `data/forms.json` | When new forms are added to eusd.org | Re-run the forms crawler or manually add entries, redeploy |

## As-needed

| What | Where | When to update | How to update |
|------|-------|----------------|---------------|
| Urgent alert banner | `data/config.json` → `urgentAlert` | Emergency closures, weather, urgent notices | Set to a string message to activate, set to `null` to deactivate, redeploy |
| Last updated date | `data/config.json` → `lastUpdated` | Any time you update content | Set to current date (YYYY-MM-DD format), redeploy |
| School contact info (phone, address) | `data/schools.json` → `phone`, `address` | When a school's contact info changes | Edit the field, redeploy |
| App help links | `data/apps.json` → `helpUrl` | When help/support pages are created | Replace `#` with actual URL, redeploy |
| Task tray content | `data/tasks.json` → any entry → `trayHtml` | When procedures change (e.g., attendance policy) | Edit the HTML content, redeploy |
| GA4 measurement ID | `index.html` → `G-XXXXXXXXXX` | Once, when real GA4 property is created | Replace placeholder with real ID, redeploy |
| School site URLs | `data/schools.json` → `siteUrl` | If EUSD changes their URL structure | Update URLs, redeploy |
| "Having trouble?" help links | `data/apps.json` → `helpUrl` | When support pages are created for each app | Replace `#` with actual URL, redeploy |
