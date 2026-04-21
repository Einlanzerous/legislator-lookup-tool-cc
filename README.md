# Strong Towns Chicago — Elected Official Lookup

A lightweight Vue 3 + TypeScript + Tailwind CSS component that lets a Chicago
resident type a street address and see their Ward Alderman, Illinois state
legislators, and federal legislators. Built to be dropped onto
[strongtownschicago.org](https://www.strongtownschicago.org/) or embedded via
`<iframe>` on any site.

- **No tracking. No cookies. No persistence.** Addresses stay in the browser
  and are sent only to Google's Civic Information and (optionally) Geocoding
  APIs.
- **Hierarchy-first layout**: Ward Alderman is shown first and visually
  highlighted, then State Senate / House, then U.S. Senate / House. The U.S.
  President and other executive roles are filtered out.
- **Stretch goal included**: an optional map-based picker (Leaflet +
  OpenStreetMap tiles + Google reverse geocoding).

## Requirements

- Node 20.19+ or 22.12+ (Vite 8 requirement)
- A Google Cloud project with:
  - **Civic Information API** enabled — required
  - **Geocoding API** enabled — required only if you want the map picker

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Provide your API keys
cp .env.example .env.local
# then edit .env.local and paste in:
#   VITE_GOOGLE_CIVIC_API_KEY=...
#   VITE_GOOGLE_MAPS_API_KEY=...    # optional, for the map picker

# 3. Run the dev server
npm run dev
```

Open `http://localhost:5173`.

### Production build

```bash
npm run build
npm run preview   # to smoke-test the built bundle locally
```

The built app lands in `dist/` as fully static HTML/CSS/JS — host it anywhere
(Netlify, Cloudflare Pages, S3/CloudFront, the existing site's `/public`
directory, etc).

## Getting Google API keys

1. Create a project at <https://console.cloud.google.com/>.
2. Under **APIs & Services → Library**, enable:
   - *Google Civic Information API*
   - *Geocoding API* (only for the map picker)
3. Under **Credentials**, create an **API key**.
4. **Restrict the key** before shipping:
   - **Application restrictions → HTTP referrers**, then list the domains you
     serve from (e.g. `https://www.strongtownschicago.org/*`,
     `https://find-reps.strongtownschicago.org/*`).
   - **API restrictions → Restrict key**, then check only the APIs you
     actually use.
5. You can use a single key for both APIs, or (cleaner) one key per API.

> Because this is a client-side Vue app, the key is visible in the browser —
> HTTP-referrer restrictions are what actually protect it. Don't skip step 4.

## Embedding as an iframe

The app renders into whatever viewport it's given, uses a transparent `body`
background, and doesn't set `html { height: 100% }`. So it embeds cleanly:

```html
<iframe
  src="https://find-reps.strongtownschicago.org/"
  title="Find your elected officials"
  style="width: 100%; min-height: 720px; border: 0;"
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
></iframe>
```

For a tighter fit, use
[iframe-resizer](https://github.com/davidjbradshaw/iframe-resizer) on the
parent page.

## Architecture

```
src/
  App.vue                      # shell, orchestrates search/map/results
  main.ts                      # app bootstrap
  style.css                    # Tailwind + small component utility layer
  types.ts                     # API + domain types
  services/
    civicApi.ts                # fetch + normalize + categorize reps
    geocoding.ts               # optional reverse geocoding for the map
  components/
    AddressSearch.vue          # input + submit/reset buttons
    ResultsDisplay.vue         # ordered list of groups
    RepresentativeGroup.vue    # section per category
    RepresentativeCard.vue     # single rep card
    PlaceholderAvatar.vue      # initials fallback when no photoUrl
    MapPicker.vue              # Leaflet pin picker (stretch)
    LoadingSpinner.vue
    ErrorMessage.vue
```

### How categorization works

`civicApi.ts` pulls the full Civic API response, then bins each office into
one of five categories using the office's `levels` and `roles`:

| Category                    | Match rule                                                               |
| --------------------------- | ------------------------------------------------------------------------ |
| **Ward Alderman**           | office name matches `Alderman`/`Council Member`/`Ward N`                 |
| **Illinois State Senate**   | `levels: administrativeArea1` + `roles: legislatorUpperBody`             |
| **Illinois State House**    | `levels: administrativeArea1` + `roles: legislatorLowerBody`             |
| **U.S. Senate**             | `levels: country` + `roles: legislatorUpperBody`                         |
| **U.S. House**              | `levels: country` + `roles: legislatorLowerBody`                         |

The U.S. President and other `headOfGovernment`/`headOfState` roles are
explicitly dropped.

## Known limitations

- **Google Civic Information API — representative endpoints are deprecated.**
  As of Google's April 2025 notice, the `representativeInfoByAddress` endpoint
  is scheduled to be sunset. The abstraction in `services/civicApi.ts` is
  narrow enough that it can be swapped for an alternative data source (e.g.
  the City of Chicago ward GeoJSON + OpenStates for legislators) without
  touching the UI.
- Chicago's 2023 ward remap may lag in the API's data; verify the alderman
  name matches the city's own
  [Find My Alderman](https://www.chicago.gov/city/en/depts/mayor/provdrs/your_ward_and_alderman/svcs/find_my_alderman.html)
  tool when testing border addresses.
- The map picker uses OpenStreetMap tiles (no key required) and only calls
  the Google Geocoding API when the user moves the pin.

## Privacy

- No analytics, no cookies, no `localStorage`.
- `referrerpolicy="no-referrer"` is set on external links and images.
- The only outbound network calls are direct-from-browser requests to
  `googleapis.com` when the user submits an address or moves the map pin.

## License

TBD by Strong Towns Chicago.
