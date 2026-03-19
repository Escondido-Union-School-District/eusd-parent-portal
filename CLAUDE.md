# EUSD Parent Portal — Claude Code Build Prompt

## Project overview

Build the **EUSD Parent Portal** — a mobile-first, single-page web application for parents and families of Escondido Union School District (K-8, 23 schools, 17,000+ students in Escondido, CA). This is NOT a traditional resource page. It's a utility — a concierge that makes parents feel like they can easily get whatever information they want without ever navigating away from the page.

**Inspiration page:** https://hwps.netlify.app/hwstart (Hewlett-Woodmere Staff Tech Orientation). We are going well beyond this — our page is interactive with expandable trays, not just static accordions.

**Deploy target:** Netlify (static site, no backend)

**Working directory:** `C:/Users/mberning/projects/eusd/parent-portal`

---

## Phase 0 — Data collection (do this FIRST)

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

Leave `sarcUrl`, `promoVideoUrl`, and some `trayLinks` as empty strings — Mark will fill these in manually.

### 0d. Crawl eusd.org for forms and PDFs
**Starting URL:** https://www.eusd.org
**Method:** Use Playwright to spider the site. Follow internal links (same domain only). Collect every URL that:
- Ends in `.pdf`
- Is on a page with "form" in the URL or title

**Output:** `data/forms.json` with this schema:
```json
[
  {
    "url": "https://www.eusd.org/path/to/form.pdf",
    "title": "The link text or page title",
    "foundOn": "https://www.eusd.org/page/where-it-was-linked",
    "category": ""
  }
]
```

Leave `category` empty — Mark will categorize them manually after reviewing the list. Deduplicate by URL. Sort alphabetically by title.

**Scope limits:** Stay on eusd.org (don't follow external links). Cap at 500 pages to avoid runaway crawling. Log progress to console so Mark can see it working.

---

## Phase 1 — Project structure and site build

### File structure
```
parent-portal/
├── index.html              # Main (and only) page
├── css/
│   └── styles.css          # All styles
├── js/
│   ├── app.js              # Main app logic (tray expand/collapse, search, banner)
│   └── fuse.min.js         # Fuse.js for client-side search (CDN fallback OK)
├── data/
│   ├── schools.json         # All 23 schools (from Phase 0 scrape)
│   ├── tasks.json           # All task tile content
│   ├── calendar.json        # School year calendar dates
│   ├── apps.json            # Apps & Logins section content
│   └── config.json          # Urgent alert override, last-updated date, etc.
├── img/
│   └── eusd-logo-white.png  # EUSD logo (download from CDN below)
├── CLAUDE.md                # Project-level instructions
└── netlify.toml             # Netlify config
```

### EUSD branding
- Primary blue: `#1031A3` (rgb 16, 49, 163)
- Dark secondary: `#111928` (rgb 17, 25, 40)
- Logo (white, for dark backgrounds): `https://cmsv2-assets.apptegy.net/uploads/11435/logo/12888/Logo-NameAtRight-White.png`
- Font: Use a clean sans-serif — DM Sans from Google Fonts (the mockup uses this). NOT Times New Roman (that's what the current EUSD site uses and it looks dated).
- Approach: Inspired by EUSD branding, not pixel-matched. Clean, warm, modern.

### EUSD district info
- Address: 2310 Aldergrove Avenue, Escondido, CA 92029
- Phone: 760.432.2400
- Social: Facebook (facebook.com/EscondidoUSD), X (@EUSD), YouTube (youtube.com/c/EscondidoUnionSchoolDistrict), Instagram (@eusd_learns)
- K-8 district in Escondido, CA (San Diego County)
- 17 elementary schools, 5 middle schools, 1 specialty school = 23 total
- Comms platform: Thrillshare (app called "Rooms")
- Thrillshare web login: https://escondidousdca.id.thrillshare.com/

---

## Phase 2 — Page architecture and interaction model

The entire page uses ONE consistent interaction model: **tap to reveal, tap to close**. School tiles and task tiles both expand inline — nothing navigates away unless the user explicitly taps a link. This page is a single-surface app.

### Page zones (top to bottom):

#### Zone 0: Top bar
- Left: Phone number `760.432.2400` (tel: link)
- Right: Language area — integrate Google Translate widget. Apply `class="notranslate"` to all proper nouns, brand names, acronyms, and technical names (see full list and standing instruction in the Google Translate section under Phase 4).

#### Zone 1: Header
- EUSD logo image (white version on blue background)
- Text: "Parent Portal"
- Subtitle: "Your starting point for everything EUSD"

#### Zone 2: Dynamic alert banner
- Auto-populates from `calendar.json` — always shows the NEXT upcoming important event (holiday, break, minimum day, non-student day)
- "Next" button to cycle through upcoming 3-5 events
- Override mechanism: if `config.json` has an `urgentAlert` field set, display that instead (for emergency closures, weather, etc.)
- Uses `role="alert"` or `aria-live="polite"` for screen readers

#### Zone 3: Search
- Heading: "What can we help you find?"
- Search bar powered by Fuse.js — indexes all content from schools.json, tasks.json, calendar.json, apps.json
- Suggestion chips below the search bar: Calendar, Lunch menu, Grades, Report absence, Contact teacher, Enroll, Get the app
- Chips scroll to and open the corresponding tray when tapped
- Search results appear as a dropdown list of matching items — tapping a result scrolls to and opens that tray

#### Zone 4: Find your school
- Section heading: "Find your school"
- 3-column grid of school tiles, grouped by type:
  - Label: "Elementary schools" → 17 tiles
  - Label: "Middle schools" → 5 tiles
  - Label: "Specialty" → 1 tile (Heritage K-8)
- Below the grid: "Find by address" link (→ https://www.schoolsitelocator.com/apps/escondidounion/accessibilityFocused.html) and "New to EUSD?" link (scrolls to New Parent FAQ section or enrollment)

**School tray behavior (on tile tap):**
- Tile gets `active` styling, tray expands inline below the row
- Tray shows:
  - School full name
  - Principal name, phone (tel: link), bell schedule times
  - 2x3 grid of quick-link tiles: Grades, Calendar, Lunch menu, Staff directory, Report absence, Forms
  - SARC report card link (if populated)
  - Promo video link (if populated)
  - "Visit full [school] site →" link at bottom
- Tapping the same tile closes the tray
- Tapping a different tile closes the current tray and opens the new one
- Smooth CSS transition (max-height + opacity)
- Auto-scrolls to make tray visible

#### Zone 5: I need to...
- Section heading: "I need to..."
- 2-column grid of task tiles, grouped by category:

**Daily life:**
- Check grades (PowerSchool)
- School calendar
- Lunch menu (EZSchoolLunch)
- Bell schedules
- Report an absence

**Stay connected:**
- Get the Rooms app
- Contact a teacher
- School office contacts

**Apps & Logins:**
- PowerSchool
- Rooms / Thrillshare
- EZSchoolLunch
- Google Classroom (if applicable)
- Clever (if applicable)
- Each with: what it is, how to access, login link, "Having trouble?" help link

**Enrollment:**
- Enroll my child (with key dates from enrollment data, required docs, link to registration)
- Forms & documents (link to forms — eventually populated from Playwright crawl of all PDFs on eusd.org)
- Transfer schools

**Calendar (detailed):**
- Shows key dates for current school year
- Filter toggles: Holidays, Non-school days, Breaks, Minimum/early dismissal days. All on by default, tap to filter.
- PDF download links for all published school year calendars (2025-2026, 2026-2027, 2027-2028)
- "Add to phone" guidance

**EXPLORE program (after-school):**
- What it is (EUSD's expanded learning / before & after school program, formerly called ELOP)
- Latest camps or opportunities (links to flyers/PDFs)
- Link to eusd.org expanded learning page: https://www.eusd.org/page/expanded-learning

**Support:**
- Learning help / academic resources
- Health & wellness (counseling, nutrition, Project SUCCESS for military/foster/housing-insecure families)
- Special education / "My child has a disability" — plain language explanation of IEPs and 504 plans, who to contact first, link to EUSD special ed resources
- Safety concern (Say Something anonymous reporting → https://www.sandyhookpromise.org/say-something-tips/)
- "Have a concern?" — link to Uniform Complaint Procedure on eusd.org

**New to EUSD? (FAQ)**
- FAQ-style section for families brand new to the district
- Questions: Which school is my child assigned to? How do I enroll? What documents do I need? Is lunch free? (Yes — CEP, no application needed) What apps do I need? What's the school day look like? Does EUSD have a dual language program? (Yes — at Farr, Glen View, Lincoln, Pioneer — 90/10 model)

**Get involved:**
- Volunteer
- Board meetings & budget (LCAP)

**Task tray behavior (on tile tap):**
- Same expand/collapse pattern as school tiles
- Tray shows self-sufficient content — the full answer, not just a link
- Action buttons for primary links (e.g., "Open PowerSchool →", "View menus →")
- Supporting links as small pill-style buttons
- "Full details on eusd.org →" escape hatch at the bottom of every tray
- Data for each task tray comes from `tasks.json`

#### Zone 6: Still can't find it?
- Heading: "Still can't find it?"
- Phone: 760.432.2400 (large, prominent, tel: link)
- Address
- Social media icons (Facebook, X, YouTube, Instagram)

#### Zone 7: Footer
- © 2026 EUSD
- Accessibility, Privacy, Policies links
- "Last updated: [date from config.json]"

---

## Phase 3 — Data files

### `data/tasks.json`
Each task entry:
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
  "actionUrl": "https://www.eusd.org/o/eusd/page/powerschool-for-parents",
  "links": [
    { "label": { "en": "Setup guide" }, "url": "#" },
    { "label": { "en": "Forgot password?" }, "url": "#" }
  ],
  "moreUrl": "https://www.eusd.org/o/eusd/page/powerschool-for-parents"
}
```

Note: All text fields use `{ "en": "..." }` structure. The `es` key is omitted for now — Google Translate handles Spanish for v1. The structure is ready for hand-translated Spanish content later by adding `"es": "..."` to each field.

Populate ALL task trays with real, helpful content based on the tray content examples in the mockup. Each tray should be self-sufficient — give the 80% answer inline so parents don't need to click through to eusd.org.

### `data/calendar.json`
```json
{
  "schoolYears": [
    {
      "year": "2025-2026",
      "pdfUrl": "",
      "boardApproved": "11/17/2022",
      "dates": [
        { "date": "2025-08-19", "label": "First Day of School", "type": "first-last-day" },
        { "date": "2025-09-01", "label": "Labor Day", "type": "holiday" },
        { "date": "2025-10-09", "endDate": "2025-10-10", "label": "Parent Conference Days", "type": "non-student-day" },
        { "date": "2025-11-11", "label": "Veterans Day", "type": "holiday" },
        { "date": "2025-11-21", "label": "Minimum Student Day", "type": "minimum-day" },
        { "date": "2025-11-24", "endDate": "2025-11-28", "label": "Thanksgiving Recess", "type": "break" },
        { "date": "2025-12-19", "label": "Minimum Student Day", "type": "minimum-day" },
        { "date": "2025-12-22", "endDate": "2026-01-05", "label": "Winter Recess", "type": "break" },
        { "date": "2026-01-06", "label": "Return from Winter Recess", "type": "first-last-day" },
        { "date": "2026-01-19", "label": "Martin Luther King Jr. Day", "type": "holiday" },
        { "date": "2026-02-13", "endDate": "2026-02-16", "label": "Presidents' Day Observed", "type": "holiday" },
        { "date": "2026-04-01", "label": "Minimum Student Day", "type": "minimum-day" },
        { "date": "2026-04-02", "endDate": "2026-04-13", "label": "Spring Break", "type": "break" },
        { "date": "2026-05-25", "label": "Memorial Day", "type": "holiday" },
        { "date": "2026-06-10", "label": "Last Day of School / Minimum Day", "type": "first-last-day" }
      ]
    }
  ]
}
```

Populate ALL THREE school years (2025-2026, 2026-2027, 2027-2028) from this data:

**2025-2026 (Board Approved 11/17/2022):**
Aug 19 First Day, Sep 1 Labor Day, Oct 9-10 Conference Days, Nov 11 Veterans Day, Nov 21 Minimum Day, Nov 24-28 Thanksgiving, Dec 19 Minimum Day, Dec 22-Jan 5 Winter Recess, Jan 6 Return, Jan 19 MLK Day, Feb 13-16 Presidents' Day, Apr 1 Minimum Day, Apr 2-13 Spring Break, May 25 Memorial Day, Jun 10 Last Day/Minimum Day

**2026-2027 (Board Approved 11/06/2025):**
Aug 18 First Day, Sep 7 Labor Day, Oct 8-9 Conference Days, Nov 11 Veterans Day, Nov 20 Minimum Day, Nov 23-27 Thanksgiving, Dec 18 Minimum Day, Dec 21-Jan 4 Winter Recess, Jan 5 Return, Jan 18 MLK Day, Feb 12-15 Presidents' Day, Mar 24 Minimum Day, Mar 25-Apr 5 Spring Break, May 31 Memorial Day, Jun 9 Last Day/Minimum Day

**2027-2028 (Board Approved 11/06/2025):**
Aug 17 First Day, Sep 6 Labor Day, Oct 7-8 Conference Days, Nov 11 Veterans Day, Nov 18 Minimum Day, Nov 22-26 Thanksgiving, Dec 17 Minimum Day, Dec 21-Jan 3 Winter Recess, Jan 4 Return, Jan 17 MLK Day, Feb 18-21 Presidents' Day, Apr 7 Minimum Day, Apr 10-19 Spring Break, May 29 Memorial Day, Jun 7 Last Day/Minimum Day

### `data/apps.json`
Section name: "Apps & Logins"
Each entry follows the same expandable tray pattern. Known apps:

Each app entry must include: what the app is (plain language) and how to access it (login URL, app store links). For apps that require login or installation, include a "Having trouble with [app name]?" help link (URL TBD — use `#` as placeholder).

- **PowerSchool** — grades, attendance, teacher comments, report cards. Login via eusd.org. Parents need account from school office. Include "Having trouble?" link.
- **Rooms (Thrillshare)** — news, alerts, push notifications. App Store: https://apps.apple.com/us/app/thrillshare/id1024147876, Google Play: https://play.google.com/store/apps/details?id=com.apptegy.thrillshare, Web: https://escondidousdca.id.thrillshare.com/. Include "Having trouble?" link.
- **EZSchoolLunch** — breakfast and lunch menus, nutrition, allergens. URL: https://www.ezschoollunch.com/p/Escondido/home. Include "Having trouble?" link.
- **School Site Locator** — find your school by address. URL: https://www.schoolsitelocator.com/apps/escondidounion/accessibilityFocused.html
- **Say Something** — anonymous safety reporting. URL: https://www.sandyhookpromise.org/say-something-tips/

### `data/config.json`
```json
{
  "lastUpdated": "2026-03-19",
  "urgentAlert": null,
  "currentSchoolYear": "2025-2026"
}
```

When `urgentAlert` is set (e.g., `"School closed tomorrow due to weather"`), it overrides the dynamic calendar banner.

---

## Phase 4 — Technical requirements

### Search (Fuse.js)
- Load Fuse.js from CDN (https://cdn.jsdelivr.net/npm/fuse.js/dist/fuse.min.js) with a local fallback
- Build search index at page load from all JSON data files
- Index school names, task titles, task tray content, app names, calendar event labels
- Fuzzy matching enabled (Fuse.js defaults are fine)
- Results appear as a dropdown below the search bar
- Tapping a result scrolls to and opens the corresponding tray
- Search chips also trigger the same scroll-and-open behavior

### Google Analytics 4
- Include GA4 snippet in the page (use a placeholder measurement ID: `G-XXXXXXXXXX` — Mark will replace with real ID)
- Track custom events:
  - `school_tray_open` with school name parameter
  - `task_tray_open` with task ID parameter
  - `search_query` with query text parameter
  - `chip_click` with chip label parameter
  - `outbound_link` with destination URL parameter
  - `alert_banner_next` for cycling the banner
  - `calendar_filter` with filter type parameter
  - `app_download_click` with app name and platform (iOS/Android/web)

### Google Translate
- Integrate Google Translate widget
- Position it in or near the top bar, replacing the manual English/Español toggle from the mockup
- Apply `class="notranslate"` to any text that should NOT be translated. This is a standing instruction — every time you render text, ask: "Is this a proper noun, brand name, acronym, or technical name?" If yes, protect it. Known list (not exhaustive):
  - All school names (from schools.json)
  - All principal/person names
  - District: "EUSD", "Escondido Union School District", "Parent Portal"
  - Apps/platforms: "PowerSchool", "Rooms", "Thrillshare", "EZSchoolLunch", "Google Classroom", "Clever", "Fuse.js"
  - Programs: "EXPLORE", "Project SUCCESS"
  - Committees/reports: "DELAC", "DAC", "SARC", "LCAP"
  - External tools: "Say Something", "Sandy Hook Promise"
  - All URLs displayed as text
  - Any new proper noun or brand name you encounter while building — add `notranslate` proactively

### Open Graph meta tags
- `og:title`: "EUSD Parent Portal"
- `og:description`: "Your starting point for everything Escondido Union School District. Find your school, check grades, lunch menus, calendars, and more."
- `og:image`: EUSD logo or a branded social card image
- `og:url`: (will be set when Netlify URL is known)
- `twitter:card`: "summary_large_image"
- Include Apple mobile web app meta tags for a clean bookmark experience

### Performance
- No framework — vanilla HTML/CSS/JS only
- All data loaded from local JSON files (no API calls at runtime)
- Target: page fully interactive in under 2 seconds on 3G
- Minimize JS payload — Fuse.js is the only library
- Images: only the EUSD logo. Everything else is text/emoji/CSS.
- Use `defer` on script tags

---

## WCAG 2.1 AA compliance — STANDING INSTRUCTION

This site MUST be WCAG 2.1 AA compliant from day one. Do not build first and fix later. Every element must be accessible as it is built.

### Structure
- Skip navigation link ("Skip to main content") as the very first focusable element
- Proper HTML5 landmarks: `<header>`, `<nav>`, `<main>`, `<footer>`
- One `<h1>` per page ("EUSD Parent Portal")
- Logical heading hierarchy (h1 → h2 for section headings → h3 for subsections)
- Unique, descriptive `<title>` tag
- `lang="en"` on the `<html>` element

### Expandable trays (critical — this is the core interaction)
- School tiles and task tiles must be `<button>` elements (not divs with click handlers)
- Each button needs `aria-expanded="false"` (toggled to `"true"` when open)
- Each button needs `aria-controls="[tray-id]"` pointing to the tray element
- Tray elements need a unique `id`
- When a tray opens, move focus to the tray content or the first focusable element within it
- When a tray closes, return focus to the button that opened it
- Keyboard: Enter/Space opens tray, Escape closes it
- Tray content must be in the DOM (not display:none) and use `aria-hidden` or max-height:0 with overflow:hidden for hiding

### Alert banner
- Use `role="status"` and `aria-live="polite"` so screen readers announce changes
- If urgentAlert is active, use `role="alert"` instead

### Forms and inputs
- Search input needs a visible or visually-hidden `<label>` with matching `for`/`id`
- All phone numbers must be `<a href="tel:...">`
- Links must have descriptive text (no "click here")
- Links opening in new tabs need `aria-label` indicating this, or visually hidden "(opens in new tab)" text

### Touch targets
- Minimum 44x44px on all interactive elements
- This includes school tiles, task tiles, chip buttons, tray links, filter toggles

### Color contrast
- Verify EUSD blue (#1031A3) on white meets 4.5:1 ratio (it does — ratio is ~8.5:1)
- Verify all text in trays meets contrast requirements
- Don't rely on color alone for any meaning

### Focus indicators
- Visible `:focus-visible` styles on all interactive elements
- Must be visible in both light and dark contexts (tray backgrounds vary)

### Reflow
- Content must reflow at 400% zoom without horizontal scrolling
- Test at 320px viewport width (equivalent to 1280px at 400% zoom)

---

## Mobile-first — STANDING INSTRUCTION

This site is designed for parents on phones. Mobile is the PRIMARY experience, desktop is the enhancement.

- Design and test at mobile widths first (375px baseline)
- Touch targets minimum 44x44px
- Phone numbers are tel: links (tap to call)
- No hover-dependent interactions anywhere
- Calendar filters are tappable chips, not dropdowns
- Search bar and chips must be thumb-friendly
- Keep JS payload small — parents may have older/budget phones on slow connections
- Test on actual phones, not just browser dev tools
- Responsive: works at 375px, 480px, 768px, 1024px+

---

## Design reference

The interactive mockup is at: `eusd-parent-portal-v4.html` (in the project directory — Mark will place it there). This is the design reference for visual style, layout, spacing, and interaction patterns. Match it closely but improve where needed, especially:
- Tray animations should be smooth
- Search should feel fast and responsive
- Calendar filter toggles should be clearly tappable
- The overall feel should be warm, clean, modern — not corporate or clinical

---

## Maintenance manifest — STANDING INSTRUCTION

As you build, maintain a file called `MAINTENANCE.md` in the project root. Every time you create content that will require manual updates (not auto-generated or live-embedded), add an entry. Each entry must include:

- **What:** The specific content (e.g., "Bell schedules for all 23 schools")
- **Where:** The file and key/field (e.g., `data/schools.json` → `bellSchedule`)
- **When to update:** The trigger or cadence (e.g., "Annually, when board approves new calendar")
- **How to update:** Brief instructions (e.g., "Edit start/end times per school, redeploy")

Group entries by update frequency: Annual, Seasonal, As-needed. This file is the maintainer's reference — keep it current as the project evolves.

---

## What NOT to include
- No superintendent welcome letter or mission statement
- No marketing copy or district "about" content (except in the New to EUSD FAQ where it's relevant)
- No org-chart-based navigation
- No hover-only interactions
- No framework dependencies (no React, no Vue, no build tools)
- No backend or server-side rendering
- No chatbot or AI features (search is client-side Fuse.js only)
- No dark mode (single light theme matching EUSD branding)

---

## Known future features (NOT in scope for this build)

These were discussed during planning and deliberately deferred. Do not build them now, but do not make architectural decisions that would prevent them later.

- **School context persistence** — selecting a school filters the entire page to that school's data (calendar, contacts, lunch, etc.)
- **Hand-translated Spanish content** — `es` keys in all JSON data files, with a language toggle that swaps content without Google Translate
- **Layer 2 destination pages** — full standalone pages for the top 5-8 tasks (calendar, grades, attendance, lunch, enrollment, Rooms setup) within the same site design
- **Layer 3 school-specific pages** — each school tile becomes a full page with consistent templates, pulling from schools.json
- **Nightly scrape pipeline** — GitHub Actions → Playwright scrape → Netlify build hook for auto-updating content from eusd.org
- **ICS calendar export** — generate `.ics` file from calendar.json so parents can subscribe on their phones
- **Chatbot / AI search** — Fuse.js upgraded to an LLM-grounded search against the site's own structured content
- **Annotated stakeholder mockup** — a "director's cut" version of the page with research callout overlays explaining each design decision
- **Content change monitoring** — diff scraped content against previous scrape to flag when eusd.org pages are updated
