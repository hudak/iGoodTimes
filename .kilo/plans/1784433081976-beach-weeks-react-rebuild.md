# Beach Weeks App - React Rebuild Plan

## Overview
Rebuild the legacy AngularJS "iGoodTimes" app as a modern React single-page application with infinite scroll, date search, and mobile/desktop responsiveness. No backend required.

## Key Decisions

### Technology Stack
- **Framework**: Vite + React 18+
- **Styling**: Tailwind CSS (mobile-first responsive design)
- **State Management**: React hooks (useState, useEffect, useMemo)
- **Build Tool**: Vite (fast, minimal config)

### Data Model
- **Display Scope**: 4 beach weeks per "year" (season-based, matching original app)
- **Date Algorithm**: 
  - Epoch: December 30, 2005 (EST)
  - Days per season: 91
  - Interval: 8 (validated against CSV data)
  - Formula: `rotation = Math.floor(n / 4 + interval) % 13`
  - Start date: `epoch + (n * 91 + rotation * 7) days`
  - End date: `start + 7 days`
- **Family Mapping**: Derive from rotation value
  - Rotation 0-12 maps to Folly # 1-13
  - Family names: Alexander, Stritch, Craig & Chandler, Siragusa, Carnahan, Hopkins, Hearp/Neely, Mueller, Gast, Hopkins (was Rimany), Piero & Annie LLC, O'Brien/Nels, Merrill

### Special Features
1. **Merge Consecutive Weeks**: Detect when same family has consecutive weeks (every 13 years) and merge into "Special Double Beach Weeks" (14-day display)
2. **Infinite Scroll**: Load years dynamically as user scrolls (past and future)
3. **Date Search**: Input field to find beach week containing a specific date
4. **Countdown Display**: Show days until next beach week
5. **Current Week Highlight**: Visual indicator for current/next beach week
6. **Family Color Coding**: Consistent colors for each family across all years
7. **Year Navigation**: Quick jump to specific year (in addition to scroll)
8. **Shareable URLs**: Deep link to specific year via URL hash
9. **Today Marker**: Visual indicator of current date in timeline

## Implementation Tasks

### Phase 1: Project Setup
1. Initialize Vite + React project with TypeScript
2. Install and configure Tailwind CSS
3. Set up project structure:
   - `src/components/` - React components
   - `src/utils/` - Date calculation utilities
   - `src/data/` - Family mapping constants
   - `src/hooks/` - Custom React hooks

### Phase 2: Core Algorithm
1. Implement `calculateBeachWeeks(year)` function
   - Input: year (number)
   - Output: array of 4 beach week objects with { n, startDate, endDate, family, follyNumber }
   - Validate against CSV data for 2026-2027
2. Implement family mapping logic
   - Map rotation to Folly # (1-13)
   - Map Folly # to family name
3. Implement consecutive week detection
   - Compare end date of week N with start date of week N+1
   - If same family and consecutive, merge into double week

### Phase 3: UI Components
1. **BeachWeekCard Component**
   - Display date range, family name, Folly #
   - Color-coded by family
   - Special styling for "Double Beach Weeks"
   - Highlight current/next week
2. **CountdownBanner Component**
   - Show days until next beach week
   - Update dynamically
3. **SearchBar Component**
   - Date input field
   - Find and scroll to matching week
4. **YearNavigator Component**
   - Year selector dropdown/buttons
   - Update URL hash
5. **Timeline Component**
   - Infinite scroll container
   - Load years on demand (Intersection Observer)
   - Today marker line

### Phase 4: Features Implementation
1. **Infinite Scroll**
   - Use Intersection Observer API
   - Load 5 years at a time (20 beach weeks)
   - Support both forward and backward scrolling
2. **Date Search**
   - Parse user input date
   - Calculate which beach week contains that date
   - Scroll to that week and highlight
3. **URL Hash Routing**
   - Parse year from URL hash on load
   - Update hash when year changes
   - Enable browser back/forward navigation
4. **Responsive Design**
   - Mobile: single column cards
   - Desktop: grid layout (2-3 columns)
   - Touch-friendly interactions

### Phase 5: Validation & Testing
1. **Algorithm Validation**
   - Compare calculated dates against CSV for 2026-2027
   - Verify Gast weeks match: Mar 20, Jun 19, Sep 18, Dec 25 (2026)
   - Test edge cases: year boundaries, leap years
2. **Consecutive Week Detection**
   - Verify double weeks appear every 13 years
   - Test merging logic with CSV data
3. **Cross-Browser Testing**
   - Chrome, Firefox, Safari, Edge
   - Mobile browsers (iOS Safari, Chrome Mobile)

### Phase 6: Polish & Deployment
1. Add loading states and error handling
2. Optimize performance (memoization, lazy loading)
3. Add meta tags for SEO and social sharing
4. Deploy to static hosting (Vercel, Netlify, or GitHub Pages)

## Data Flow

```
User Input (scroll/search)
    ↓
Year Calculation (which years to load)
    ↓
Beach Week Generation (algorithm)
    ↓
Consecutive Week Detection (merge logic)
    ↓
Render Components (cards, countdown, search)
```

## Validation Checklist

- [ ] Algorithm produces dates matching CSV for Gast weeks (2026)
- [ ] Double weeks detected and merged correctly
- [ ] Infinite scroll loads years smoothly
- [ ] Date search finds correct week
- [ ] Countdown updates correctly
- [ ] Responsive on mobile (320px+) and desktop (1920px)
- [ ] URL hash navigation works
- [ ] Family colors consistent across years
- [ ] No console errors or warnings
- [ ] Build succeeds with no TypeScript errors

## Open Questions (Resolved)

- ✅ Interval value: 8 (matches CSV)
- ✅ Display scope: 4 beach weeks per year
- ✅ Framework: Vite + React + Tailwind
- ✅ Data source: Algorithmic calculation (not static CSV)
- ✅ Consecutive weeks: Merge and label as "Special Double Beach Weeks"

## Risks & Mitigations

**Risk**: Algorithm drift over long time periods (100+ years)
**Mitigation**: Validate against CSV data; add unit tests for known dates

**Risk**: Performance with infinite scroll (too many DOM nodes)
**Mitigation**: Virtualize list (react-window) if needed; limit loaded years

**Risk**: Timezone issues with date calculations
**Mitigation**: Use UTC internally; display in local timezone; test across timezones

## Success Criteria

1. App displays 4 beach weeks per year with correct dates
2. Gast weeks match CSV: Mar 20, Jun 19, Sep 18, Dec 25 (2026)
3. Double weeks merged and labeled correctly
4. Infinite scroll works smoothly (no jank)
5. Date search finds correct week within 1 second
6. Responsive on all screen sizes (320px - 2560px)
7. No backend required (100% client-side)
8. Loads in < 2 seconds on 3G connection
