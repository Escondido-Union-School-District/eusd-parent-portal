# EUSD Parent Portal — Original Build Spec

This was the original build prompt used to create the Parent Portal. It's preserved here for reference but is no longer loaded into every Claude Code session. The active project instructions are in `CLAUDE.md` at the project root.

---

## Phase 0 — Data collection (completed)

Before building anything, scrape the following EUSD pages using Playwright to populate the data files. These are Thrillshare/Apptegy pages that render content client-side with JavaScript — a simple HTTP fetch will NOT work. You MUST use Playwright, wait for content to render, then extract.

### 0a. Scrape school directory
**URL:** https://www.eusd.org/page/schools
**Extract per school:**
- Official school name
- Phone number
- Principal name
- Address
- School page URL on eusd.org
- School type (elementary, middle, specialty)

### 0b. Scrape bell schedules
**URL:** https://www.eusd.org/page/eusd-bell-schedules
**Extract per school:**
- Regular day start time
- Regular day end time
- Minimum day times (if listed)

### 0c. Merge into `data/schools.json`
Combine the scraped data into a single JSON file. Schema per school:

```json
{
  "id": "bernardo",
  "name": "Bernardo Elementary School",
  "shortName": "Bernardo",
  "type": "elementary",
  "phone": "760-432-XXXX",
  "principal": "Name Here",
  "address": "123 Street, Escondido, CA 92029",
  "bellSchedule": {
    "regularStart": "8:00 AM",
    "regularEnd": "2:30 PM",
    "minimumEnd": "12:30 PM"
  },
  "siteUrl": "https://www.eusd.org/o/school-name",
  "sarcUrl": "",
  "promoVideoUrl": "",
  "trayLinks": {
    "grades": "https://www.eusd.org/o/eusd/page/powerschool-for-parents",
    "calendar": "",
    "lunchMenu": "https://www.ezschoollunch.com/p/Escondido/home",
    "staffDirectory": "",
    "reportAbsence": "https://www.eusd.org/page/attendance",
    "forms": ""
  }
}
```

### 0d. Crawl eusd.org for forms and PDFs
**Starting URL:** https://www.eusd.org
**Output:** `data/forms.json`

---

## Page architecture — Zone by zone

The entire page uses ONE consistent interaction model: **tap to reveal, tap to close**. School tiles and task tiles both expand inline — nothing navigates away unless the user explicitly taps a link.

### Zone 0: Top bar
- Left: Phone number `760.432.2400` (tel: link)
- Right: Google Translate widget. Apply `class="notranslate"` to proper nouns.

### Zone 1: Header
- EUSD logo (white on blue), "Parent Portal", subtitle

### Zone 2: Dynamic alert banner
- Auto-populates from `calendar.json` — next upcoming event
- Override via `config.json` `urgentAlert` field
- `role="alert"` or `aria-live="polite"`

### Zone 3: Search
- Fuse.js powered, indexes all JSON data
- Suggestion chips: Calendar, Lunch menu, Grades, Report absence, Contact teacher, Enroll, Get the app

### Zone 4: Find your school
- 3-column grid grouped by type (17 elementary, 5 middle, 1 specialty)
- School tray: principal, phone, bell schedule, 2x3 quick-link grid, SARC, promo video

### Zone 5: I need to...
- Task tiles grouped by category: Daily life, Stay connected, Apps & Logins, Enrollment, Calendar, EXPLORE, Support, New to EUSD FAQ, Get involved

### Zone 6: Still can't find it?
- Phone, address, social media

### Zone 7: Footer

---

## Data file schemas

### `data/tasks.json`
```json
{
  "id": "grades",
  "title": { "en": "Check grades & attendance" },
  "icon": "📊",
  "iconBg": "#E6F1FB",
  "category": "daily",
  "subtitle": { "en": "PowerSchool portal" },
  "trayHtml": { "en": "<p>HTML content for the tray...</p>" },
  "actionLabel": { "en": "Open PowerSchool →" },
  "actionUrl": "https://...",
  "links": [{ "label": { "en": "Setup guide" }, "url": "#" }],
  "moreUrl": "https://..."
}
```

All text fields use `{ "en": "..." }` — ready for `"es"` key later.

### `data/calendar.json`
Three school years: 2025-2026, 2026-2027, 2027-2028.

**2025-2026 (Board Approved 11/17/2022):**
Aug 19 First Day, Sep 1 Labor Day, Oct 9-10 Conference Days, Nov 11 Veterans Day, Nov 21 Minimum Day, Nov 24-28 Thanksgiving, Dec 19 Minimum Day, Dec 22-Jan 5 Winter Recess, Jan 6 Return, Jan 19 MLK Day, Feb 13-16 Presidents' Day, Apr 1 Minimum Day, Apr 2-13 Spring Break, May 25 Memorial Day, Jun 10 Last Day/Minimum Day

**2026-2027 (Board Approved 11/06/2025):**
Aug 18 First Day, Sep 7 Labor Day, Oct 8-9 Conference Days, Nov 11 Veterans Day, Nov 20 Minimum Day, Nov 23-27 Thanksgiving, Dec 18 Minimum Day, Dec 21-Jan 4 Winter Recess, Jan 5 Return, Jan 18 MLK Day, Feb 12-15 Presidents' Day, Mar 24 Minimum Day, Mar 25-Apr 5 Spring Break, May 31 Memorial Day, Jun 9 Last Day/Minimum Day

**2027-2028 (Board Approved 11/06/2025):**
Aug 17 First Day, Sep 6 Labor Day, Oct 7-8 Conference Days, Nov 11 Veterans Day, Nov 18 Minimum Day, Nov 22-26 Thanksgiving, Dec 17 Minimum Day, Dec 21-Jan 3 Winter Recess, Jan 4 Return, Jan 17 MLK Day, Feb 18-21 Presidents' Day, Apr 7 Minimum Day, Apr 10-19 Spring Break, May 29 Memorial Day, Jun 7 Last Day/Minimum Day

### `data/apps.json`
- PowerSchool, Rooms (Thrillshare), EZSchoolLunch, School Site Locator, Say Something

### `data/config.json`
```json
{ "lastUpdated": "2026-03-19", "urgentAlert": null, "currentSchoolYear": "2025-2026" }
```

---

## GA4 custom events
- `school_tray_open`, `task_tray_open`, `search_query`, `chip_click`, `outbound_link`, `alert_banner_next`, `calendar_filter`, `app_download_click`

---

## Detailed WCAG requirements

### Structure
- Skip nav, landmarks, heading hierarchy, lang attribute

### Expandable trays
- `<button>` with `aria-expanded`, `aria-controls`
- Focus management: move to tray on open, return to button on close
- Keyboard: Enter/Space opens, Escape closes

### Alert banner
- `role="status"` / `aria-live="polite"`, `role="alert"` for urgent

### Forms and inputs
- Labels, tel: links, descriptive link text, new-tab warnings

### Touch targets, contrast, focus indicators, reflow
- 44x44px minimum, 4.5:1 contrast, visible focus-visible, 320px reflow
