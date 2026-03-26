# EUSD Parent Portal

Mobile-first, single-page web app for EUSD parents and families. Static site on Netlify — vanilla HTML/CSS/JS, no framework, Fuse.js for search.

## Layout

```
index.html          # Single page
css/styles.css      # All styles
js/app.js           # Tray expand/collapse, search, banner
js/fuse.min.js      # Client-side fuzzy search
data/               # schools.json, tasks.json, calendar.json, apps.json, config.json
img/                # EUSD logo only
docs/               # User guide, build spec (original build prompt)
MAINTENANCE.md      # Manual update tracking
```

## Interaction model

Everything uses **tap to reveal, tap to close**. School tiles and task tiles expand inline — nothing navigates away unless the user taps a link. Tapping a different tile closes the current tray.

## Branding

- Primary blue: `#1031A3` — Dark secondary: `#111928`
- Font: DM Sans (Google Fonts)
- Logo: white version on blue backgrounds

## Standing instructions

### WCAG 2.1 AA
This site must be fully accessible. The ada-wcag skill covers the full checklist. Key points for this project:
- Tray buttons: `aria-expanded`, `aria-controls`, focus management on open/close, Escape to close
- Alert banner: `aria-live="polite"` (or `role="alert"` for urgent overrides)
- 44x44px touch targets on all interactive elements
- Visible `:focus-visible` on everything

### Mobile-first
Mobile is the primary experience. Design at 375px first. No hover-dependent interactions. Phone numbers are `tel:` links. Responsive at 375px, 480px, 768px, 1024px+.

### Google Translate — notranslate rule
Apply `class="notranslate"` to all proper nouns, brand names, acronyms, and technical names: school names, person names, EUSD, Parent Portal, PowerSchool, Rooms, Thrillshare, EZSchoolLunch, EXPLORE, Project SUCCESS, DELAC, DAC, SARC, LCAP, Say Something, Sandy Hook Promise, and all URLs displayed as text.

### Maintenance manifest
Keep `MAINTENANCE.md` current. When adding content that needs manual updates, log: what, where (file + field), when to update, how to update.

## What NOT to include
- No superintendent welcome letter or mission statement
- No framework dependencies, no backend, no dark mode
- No chatbot or AI features (search is Fuse.js only)

## Future features (deferred — don't prevent them architecturally)
- School context persistence (selecting a school filters the whole page)
- Hand-translated Spanish (`es` keys in JSON)
- Layer 2/3 destination pages
- Nightly scrape pipeline, ICS calendar export, content change monitoring

## Reference
The original build spec with full zone descriptions, data schemas, calendar dates, and GA4 events is at `docs/build-spec.md`. Read it when you need the details — it is not loaded automatically.
