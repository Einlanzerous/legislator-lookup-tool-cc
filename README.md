# Strong Towns Chicago — Elected Official Lookup

A lightweight Vue 3 + TypeScript + Tailwind CSS component that lets a Chicago
resident type a street address and see their Ward Alderperson, Illinois state
legislators, and federal legislators. Built to be dropped onto
[strongtownschicago.org](https://www.strongtownschicago.org/) or embedded via
`<iframe>` on any site.

![Search results in dark mode](images/search_screen_dark.png)

## Features

- **Hierarchy-first layout**: Ward Alderperson is shown first and highlighted
  as "Most local", then State Senate / House, then U.S. Senate / House.
- **Two-column results** on wider screens; single-column on mobile.
- **Dark / light mode toggle** with preference saved across sessions.
- **Map picker**: optional Leaflet + OpenStreetMap pin that reverse-geocodes
  to a street address.
- **No API keys in the browser.** All keys live in a Cloudflare Worker secret
  store and are never shipped in the frontend bundle.

## Architecture overview

```
Browser
  │
  ├─ Chicago Data Portal (public, no key) ──────────────────────┐
  │                                                              │
  └─ VITE_WORKER_URL (Cloudflare Worker)                        │
       ├─ /geocode  → maps.googleapis.com  (GOOGLE_MAPS_KEY)    │
       └─ /openstates → v3.openstates.org  (OPENSTATES_KEY)     │
                                                                 ▼
                                              Ward + state + federal reps
```

## Requirements

- Node 24 LTS or later
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- A **Google Maps API key** with the **Geocoding API** enabled
- An **OpenStates API key** — [register at open.pluralpolicy.com](https://open.pluralpolicy.com) (free tier available)

## Local development setup

You need two terminals: one for the Worker (port 8787) and one for the frontend
(port 5173).

```bash
# Terminal 1 — Worker
cd worker
npm install
cp .dev.vars.example .dev.vars   # fill in GOOGLE_MAPS_KEY and OPENSTATES_KEY
npm run dev                       # starts Worker at http://localhost:8787

# Terminal 2 — Frontend
cp .env.example .env.local        # VITE_WORKER_URL=http://localhost:8787
npm install
npm run dev                       # starts Vite at http://localhost:5173
```

## Deploying to Cloudflare

### 1. One-time CLI setup

```bash
npm install -g wrangler
wrangler login
```

### 2. Deploy the Worker and set secrets

```bash
cd worker
npm install
wrangler deploy

# Set the API keys as Worker secrets (you'll be prompted to paste each value):
wrangler secret put GOOGLE_MAPS_KEY
wrangler secret put OPENSTATES_KEY

# Optional: restrict which origins can call the Worker
wrangler secret put ALLOWED_ORIGIN
# e.g. https://stc-legislator-lookup.pages.dev,https://www.strongtownschicago.org
```

After `wrangler deploy` the Worker URL is printed — it looks like
`https://stc-legislator-lookup.<your-subdomain>.workers.dev`.

### 3. Create the Pages project (first time only)

```bash
cd ..   # back to repo root
wrangler pages project create stc-legislator-lookup
```

### 4. Set GitHub secrets

In your GitHub repo → Settings → Secrets and variables → Actions, add:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with *Workers:Edit* + *Pages:Edit* |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID (found in the dashboard sidebar) |
| `VITE_WORKER_URL` | Worker URL from step 2 |

### 5. Push to `main`

The `.github/workflows/deploy.yml` workflow deploys the Worker first, then
builds and deploys the frontend to Cloudflare Pages automatically on every push
to `main`.

## Google Maps API key setup

1. Create a project at <https://console.cloud.google.com/>.
2. Under **APIs & Services → Library**, enable **Geocoding API**.
3. Under **Credentials**, create an **API key**.
4. Under **API restrictions**, limit the key to *Geocoding API* only.
5. Set a **billing alert** under Billing → Budgets & Alerts.

> Because the key lives in a Worker secret (not the browser bundle), you do
> **not** need HTTP referrer restrictions on this key. The Worker is the only
> caller — restrict it to the Geocoding API only and monitor billing.

## Embedding as an iframe

```html
<iframe
  src="https://stc-legislator-lookup.pages.dev/"
  title="Find your elected officials"
  style="width: 100%; min-height: 720px; border: 0;"
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
></iframe>
```

For a tighter fit, use
[iframe-resizer](https://github.com/davidjbradshaw/iframe-resizer) on the
parent page.

## Project structure

```
.github/workflows/
  deploy.yml                     # deploys Worker then Pages on push to main
worker/
  src/index.ts                   # Cloudflare Worker: proxies Google + OpenStates
  wrangler.toml                  # Worker name and compatibility date
  .dev.vars.example              # template for local Worker secrets
src/
  App.vue                        # shell: search, map toggle, dark mode
  main.ts                        # app bootstrap
  style.css                      # Tailwind v4 theme + component utility layer
  types.ts                       # domain types + CivicApiError
  services/
    civicApi.ts                  # orchestrates all three data sources
    geocoding.ts                 # forward + reverse geocoding via Worker proxy
  components/
    AddressSearch.vue            # input + submit/reset
    ResultsDisplay.vue           # two-column group grid
    RepresentativeGroup.vue      # section per category
    RepresentativeCard.vue       # single rep: photo/avatar, name, party, contacts
    PlaceholderAvatar.vue        # initials fallback when no photoUrl
    MapPicker.vue                # Leaflet pin picker
    LoadingSpinner.vue
    ErrorMessage.vue
```

## Data sources

| Source | Provides | Auth |
|---|---|---|
| **Google Geocoding API** (via Worker) | Address → lat/lng | Worker secret |
| **OpenStates `/people.geo`** (via Worker) | IL state + U.S. Congress legislators | Worker secret |
| **Chicago Data Portal** (public) | Ward boundary → alderperson contact info | None |

## How categorization works

`civicApi.ts` bins each OpenStates result by its OCD jurisdiction ID and
`org_classification`:

| Category | Jurisdiction ID contains | `org_classification` |
|---|---|---|
| **Illinois State Senate** | `/state:il/` | `upper` |
| **Illinois State House** | `/state:il/` | `lower` |
| **U.S. Senate** | no `/state:` segment | `upper` |
| **U.S. House** | no `/state:` segment | `lower` |

The Ward Alderperson is sourced separately from the Chicago Data Portal using a
Socrata geospatial intersection query against the 2023 ward boundaries dataset
(`p293-wvbd`).

## Known limitations

- Chicago addresses only. Non-Chicago addresses will geocode but return no
  alderperson and may return incorrect state legislators.
- If the Chicago Data Portal is unavailable, alderperson results are silently
  omitted; state and federal results still show.
- Verify alderperson results against the city's
  [Find My Alderman](https://www.chicago.gov/city/en/depts/mayor/provdrs/your_ward_and_alderman/svcs/find_my_alderman.html)
  tool when testing boundary addresses.

## Privacy

- No analytics or tracking cookies.
- `localStorage` stores one key: the user's dark/light mode preference.
- `referrerpolicy="no-referrer"` is set on external links and images.
- Outbound network calls on each address lookup:
  - Worker (your Cloudflare domain) — geocoding + OpenStates
  - `data.cityofchicago.org` — ward boundary + alderperson (public API, no credentials)

## License

TBD by Strong Towns Chicago.
