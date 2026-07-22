# Module 7 — Frontend Assembly (Catalyst Slate)

## What's in this module
- `frontend/src/api/` — three new fetch wrappers: `analyticsService.js`
  (hotspots/trends), `dataService.js` (case lookup/list), `reportService.js`
  (PDF report generation).
- `frontend/src/components/`:
  - `HotspotMap.jsx` — Leaflet.js map, circle markers sized by case count
    per grid cell (from Module 3's `/hotspots`).
  - `TrendChart.jsx` — Chart.js line chart, one line per crime sub-head
    over time (from Module 3's `/trends`).
  - `CasePanel.jsx` — case list + detail + "Generate PDF Report" button
    (Modules 1, 2, 6).
- `frontend/src/Dashboard.jsx` — tabbed shell wiring together every
  component built so far: Cases, Hotspot Map, Trends, Criminal Network
  (Module 4), Assistant (Module 5).
- `frontend/src/App.jsx`, `index.js`, `public/index.html` — standard CRA-style
  entry points.
- `frontend/package.json` — updated with `leaflet`, `chart.js`,
  `react-chartjs-2`, plus `react-scripts` so it builds/runs like a normal
  Create React App project.
- `frontend/src/styles/` — shared styling, pulled out of inline JS:
  - `variables.css` — CSS custom properties (colors, spacing, radii, font
    sizes) — the single source of truth for the visual palette.
  - `global.css` — base reset, imports `variables.css`, loaded once in
    `index.js`.
- Each component now has a matching `<Component>.module.css` (CSS Modules,
  supported out of the box by `react-scripts`) instead of inline `style={}`
  objects — e.g. `Dashboard.module.css`, `CasePanel.module.css`,
  `ChatAssistant.module.css`, `HotspotMap.module.css`,
  `TrendChart.module.css`, `CriminalNetworkGraph.module.css`.
  - **Exception, by necessity**: Leaflet circle markers, Cytoscape node/edge
    styling, and Chart.js dataset colors are configured through each
    library's own JS style API, not the DOM's `class`/`style` attributes —
    they can't read `.module.css` classes directly. Where possible
    (Leaflet's `className` option on vector layers) the CSS module still
    owns the actual color values; where the library only accepts inline
    color strings (Cytoscape, Chart.js), the component reads the value
    from the shared CSS custom properties in `variables.css` at render
    time via `getComputedStyle`, so the palette still has one source of
    truth even though it's applied through JS.

## Setup steps

1. **Install dependencies**:
   ```
   cd frontend
   npm install
   ```
2. **Set environment variables** (`.env` in `frontend/`, or Slate's env var
   config once deployed) for each backend function's route:
   ```
   REACT_APP_DATA_SERVICE_URL=/server/data-service
   REACT_APP_ANALYTICS_SERVICE_URL=/server/analytics-service
   REACT_APP_NETWORK_SERVICE_URL=/server/network-service
   REACT_APP_ASSISTANT_SERVICE_URL=/server/assistant-service
   REACT_APP_REPORT_SERVICE_URL=/server/report-service
   ```
   The relative-path defaults already baked into each API client work as-is
   as long as the frontend is served from the same Catalyst project domain
   as the functions — only override these if hosting separately.
3. **Run locally**: `npm start` (standard CRA dev server).

## Deploying via Slate

Slate deploys **from a connected Git repository** (GitHub/GitLab/Bitbucket)
rather than needing its own config file in the repo — this lines up with
the GitHub repo already set up for this project:

1. Push this repo to GitHub (if not already).
2. Catalyst console → Slate → connect your GitHub account (if not already
   connected).
3. Slate → Add App → pick the `frontend/` directory as the app root,
   framework: React.
4. Slate auto-detects the build command and deploys via Catalyst Pipelines
   internally — every push to the connected branch redeploys automatically.
5. Set the environment variables from step 2 above in Slate's app settings
   (not just locally), since Slate builds happen in Catalyst's environment,
   not yours.

## What's still missing for a full demo
- `HotspotMap`/`TrendChart` currently call `analytics-service` directly —
  swapping the map's default view to read from `hotspot-refresh-job`'s
  Cache entry (Module 3) instead would be a nice-to-have for load speed,
  not required for the demo.
- Styling is now structured (CSS Modules + shared variables), but it's
  still a plain/functional look — no design polish pass yet. Worth
  revisiting with actual visual design (spacing, typography, a proper
  color scheme) before the final demo if time allows.

## Next module
Module 8 (originally not in the 5-feature plan, but worth doing before the
deck) — wiring the process-flow and architecture diagrams in the pitch deck
to reflect this actual, now-built module structure, since the ones in
`ppt_model-1.pptx` were rough ASCII sketches from before any of this existed.
