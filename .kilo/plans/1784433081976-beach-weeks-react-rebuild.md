# Beach Weeks App - React Rebuild Plan

## Overview
Rebuild the legacy AngularJS "iGoodTimes" app as a modern React SPA for the **Gast family only**. Displays pre-computed Gast beach week dates with infinite scroll, date search, and mobile/desktop responsiveness. No backend required for v1; data layer abstracted for future backend integration.

## Key Decisions

### Scope
- **Gast family only** — no multi-family display, no family mapping, no family color coding
- CSV data used solely for algorithm validation at build time, not at runtime

### Data Strategy: Pre-computed Static Data
- **Range**: 2005–2075 (70 years, ~280 entries)
- **Format**: Static TypeScript module exporting a typed array of beach week objects
- **Generation**: Build-time script runs the algorithm, validates against CSV, outputs the data file
- **Runtime**: Frontend imports the data — zero date math in the browser
- **Future backend**: Data access layer abstracted behind a single function (`getBeachWeeks()`) that can swap from local import to API fetch with no UI changes

**Why pre-computation wins:**
- Eliminates all date math, timezone handling, and rotation logic from the browser
- Reduces frontend to: import data → render → handle scroll/search/countdown
- 280 entries is ~10KB — negligible bundle impact
- Algorithm changes only require re-running the generation script
- With a future backend, the same pre-computed data is served via API — no redesign needed

### Technology Stack
- **Framework**: Vite + React 18+ + TypeScript
- **Styling**: Tailwind CSS (mobile-first responsive design)
- **State Management**: React hooks (useState, useEffect, useMemo)
- **Build Tool**: Vite

### Data Model
- **Pre-computed entry shape**:
  ```ts
  interface BeachWeek {
    n: number;           // season index
    startDate: string;   // ISO date (YYYY-MM-DD)
    endDate: string;     // ISO date (YYYY-MM-DD)
    isDouble: boolean;   // true if merged consecutive week
  }
  ```
- **Grouped by year** for efficient rendering:
  ```ts
  type BeachWeeksByYear = Record<number, BeachWeek[]>;
  ```

### Date Algorithm (build-time only)
- Epoch: December 30, 2005 (EST)
- Days per season: 91
- Interval: 8 (validated against CSV)
- Formula: `rotation = Math.floor(n / 4 + interval) % 13`
- Start date: `epoch + (n * 91 + rotation * 7) days`
- End date: `start + 7 days`
- Consecutive week detection: if same family has adjacent weeks (every 13 years), merge into 14-day "Special Double Beach Weeks"

### Special Features
1. **Double Beach Weeks**: Pre-computed and flagged in data (`isDouble: true`)
2. **Infinite Scroll**: Load years dynamically as user scrolls (Intersection Observer)
3. **Date Search**: Input field to find beach week containing a specific date
4. **Countdown Display**: Days until next Gast beach week
5. **Current Week Highlight**: Visual indicator for current/next beach week
6. **Year Navigation**: Quick jump to specific year
7. **Shareable URLs**: Deep link to specific year via URL hash
8. **Today Marker**: Visual indicator of current date in timeline

## Implementation Tasks

### Phase 1: Project Setup
1. Initialize Vite + React + TypeScript project
2. Install and configure Tailwind CSS
3. Set up project structure:
   - `src/components/` — React components
   - `src/data/` — Pre-computed beach weeks data + types
   - `src/hooks/` — Custom React hooks (useBeachWeeks, useCountdown)
   - `src/services/` — Data access layer (abstracted for future API swap)
   - `scripts/` — Build-time generation script

### Phase 2: Data Generation Script
1. Implement `generateBeachWeeks()` in `scripts/generate.ts`
   - Compute all Gast beach weeks from 2005–2075 using the algorithm
   - Detect and merge consecutive weeks into double weeks
   - Validate output against CSV for 2026–2027
   - Output typed TypeScript data file to `src/data/beachWeeks.ts`
2. Validate Gast weeks match CSV: Mar 20, Jun 19, Sep 18, Dec 25 (2026)
3. Run script once to produce the static data file

### Phase 3: Data Access Layer
1. Create `src/services/beachWeeksService.ts`
   - `getBeachWeeks(): BeachWeek[]` — currently imports from static data
   - `getBeachWeeksByYear(year: number): BeachWeek[]`
   - `findWeekByDate(date: Date): BeachWeek | undefined`
   - `getNextWeek(): BeachWeek | undefined`
   - Single point of change for future API migration

### Phase 4: UI Components
1. **BeachWeekCard** — Date range display, double-week styling, current/next highlight
2. **CountdownBanner** — Days until next Gast beach week, updates dynamically
3. **SearchBar** — Date input, finds and scrolls to matching week
4. **YearNavigator** — Year selector, updates URL hash
5. **Timeline** — Infinite scroll container (Intersection Observer), today marker

### Phase 5: Features Implementation
1. **Infinite Scroll** — Intersection Observer, load 5 years at a time, forward + backward
2. **Date Search** — Parse input date, find containing week via service, scroll + highlight
3. **URL Hash Routing** — Parse year from hash on load, update on navigation, back/forward support
4. **Responsive Design** — Mobile: single column; Desktop: 2–3 column grid; touch-friendly

### Phase 6: Validation & Testing
1. Verify pre-computed dates match CSV for 2026–2027 Gast weeks
2. Verify double weeks detected correctly (every 13 years)
3. Test edge cases: year boundaries, leap years
4. Cross-browser: Chrome, Firefox, Safari, Edge, mobile browsers

### Phase 7: Polish & Deployment
1. Loading states and error handling
2. Performance optimization (memoization, lazy loading)
3. Meta tags for SEO and social sharing
4. Deploy to static hosting (Vercel, Netlify, or GitHub Pages)

## Data Flow

```
Build Time:
  Algorithm → Generate 280 entries → Validate against CSV → Output src/data/beachWeeks.ts

Runtime:
  User Input (scroll/search)
      ↓
  Data Service (getBeachWeeks / findWeekByDate)
      ↓
  Render Components (cards, countdown, search)
```

## Future Backend Migration Path

When storage/auth features arrive:
1. Move `beachWeeks.ts` data to a database or serve via API endpoint
2. Change `getBeachWeeks()` in `beachWeeksService.ts` from `import` to `fetch('/api/beach-weeks')`
3. Add auth-gated endpoints for new features (storage, user preferences)
4. No UI component changes required — data layer is the only seam

## Validation Checklist

- [ ] Generation script produces dates matching CSV for Gast 2026
- [ ] Double weeks flagged correctly in pre-computed data
- [ ] Infinite scroll loads years smoothly
- [ ] Date search finds correct week
- [ ] Countdown updates correctly
- [ ] Responsive on mobile (320px+) and desktop (1920px)
- [ ] URL hash navigation works
- [ ] No console errors or warnings
- [ ] Build succeeds with no TypeScript errors
- [ ] Data service is the single point of data access (future-proofed for API)

## Risks & Mitigations

**Risk**: Algorithm drift over 70 years
**Mitigation**: Validate against CSV for known years; generation script includes assertion checks

**Risk**: Performance with infinite scroll (too many DOM nodes)
**Mitigation**: Virtualize list (react-window) if needed; data is pre-grouped by year

**Risk**: Timezone display issues
**Mitigation**: Dates stored as ISO strings; display in local timezone; no runtime date math

## Success Criteria

1. App displays Gast beach weeks with correct dates for 2005–2075
2. Gast weeks match CSV: Mar 20, Jun 19, Sep 18, Dec 25 (2026)
3. Double weeks flagged and styled correctly
4. Infinite scroll works smoothly (no jank)
5. Date search finds correct week within 1 second
6. Responsive on all screen sizes (320px–2560px)
7. No backend required for v1 (100% client-side)
8. Loads in < 2 seconds on 3G connection
9. Data service abstraction allows future backend swap with zero UI changes
