# Winnipeg Resources

A directory of free and low-cost services, culture, events, and recreation
within **4km of the Canadian Museum for Human Rights**, Winnipeg. Inspired
by [kc.cjohnson.io/resources](https://kc.cjohnson.io/resources/).

Three views over the same dataset:

- `index.html` — filterable list, sorted by distance
- `map/index.html` — Leaflet map with a 4km radius overlay
- `timeline.html` — agenda view: what's ongoing now, and what's coming up

No build step. It's static HTML/CSS/JS that fetches `data/entries.json`.

## Local development

Fetching JSON requires an HTTP server (not `file://`):

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Data model

`data/entries.json` has three parts:

- `center` / `radiusKm` — the reference point and radius everything is filtered against
- `metaCategories` — the top-level groupings (`services`, `culture`, `events`, `recreation`), each with its own list of `categories`. Add a new meta-category or category here; it's just data
- `entries` — the actual locations/events

### Adding an entry

```json
{
  "id": "unique-slug",
  "name": "Location name",
  "metaCategory": "services",
  "category": "One of that meta-category's categories",
  "address": "Street address, Winnipeg, MB",
  "lat": 49.0000,
  "lng": -97.0000,
  "cost": "Free / $X / sliding scale",
  "amenities": ["24/7", "WiFi"],
  "phone": "",
  "website": "",
  "notes": "Anything a visitor should know before showing up.",
  "verified": false,
  "lastVerified": null,
  "availability": { "kind": "always", "hours": "Mon–Fri 9am–5pm" }
}
```

Distance from the museum is computed automatically at load time. Four
placeholder entries (one per meta-category) demonstrate the shape —
replace them with verified data as you go.

### `availability` — the timeline feature

Every entry has an `availability.kind`, which drives the Today/This
Week/This Month/Upcoming filters and the Timeline page:

| kind | use for | shape |
|---|---|---|
| `always` | open on a normal schedule (library, drop-in) | `{ "kind": "always", "hours": "Mon–Fri 9am–5pm" }` |
| `recurring` (weekly) | happens on specific weekdays | `{ "kind": "recurring", "recurrence": { "frequency": "weekly", "daysOfWeek": ["Tue","Thu"], "timeRange": {"start":"11:00","end":"13:00"} } }` |
| `recurring` (monthly) | e.g. free museum admission on the first Wednesday | `{ "kind": "recurring", "recurrence": { "frequency": "monthly", "nth": 1, "dayOfWeek": "Wed" } }` |
| `seasonal` | active within a yearly date window (outdoor pools, etc.) | `{ "kind": "seasonal", "season": { "startMonthDay": "06-01", "endMonthDay": "09-05" } }` |
| `scheduled` | one-off or short-run dated events (concerts, Fringe Fest showings) | `{ "kind": "scheduled", "occurrences": [{ "start": "2026-07-20T19:00", "end": "2026-07-20T21:00", "label": "Opening night" }] }` |

An optional top-level `hours` string on `availability` is shown verbatim
on cards/popups/timeline instead of an auto-generated description — use
it whenever the plain-language version reads better than the computed one.

**Accuracy matters.** This is meant to be reliable enough that someone
can act on it. Prefer verifying hours/cost/address/dates by checking the
organization's own site or calling ahead over copying from a secondhand
source. Set `verified: true` and `lastVerified` (ISO date) once you've
confirmed a listing; unverified entries are flagged in the UI.

## Personal interest overlay

Each entry has a "My interest" selector: `committed` / `considering` /
`interested` / `ignore`. This is **entirely local** — stored in your
browser's `localStorage`, never sent anywhere, never committed to this
repo. Use the header's **Export interests** / **Import interests**
buttons to back it up or carry it to another device/browser as a plain
JSON file (`{ "entry-id": "committed", ... }`). Import merges into
whatever's already stored locally.

## Deployment

Deploys via GitHub Actions (`.github/workflows/deploy.yml`) on every
push to `main`. One-time setup: in the repo's **Settings → Pages**,
set **Build and deployment → Source** to **GitHub Actions**.
