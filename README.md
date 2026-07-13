# Winnipeg Resources

A directory of free and low-cost facilities, meals, and services within
**4km of the Canadian Museum for Human Rights**, Winnipeg. Inspired by
[kc.cjohnson.io/resources](https://kc.cjohnson.io/resources/).

Two views over the same dataset:

- `index.html` — filterable list, sorted by distance
- `map/index.html` — Leaflet map with a 4km radius overlay

No build step. It's static HTML/CSS/JS that fetches `data/resources.json`.

## Local development

Fetching JSON requires an HTTP server (not `file://`):

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Adding a resource

Edit `data/resources.json` and add an entry to the `resources` array:

```json
{
  "id": "unique-slug",
  "name": "Location name",
  "category": "One of the values in the top-level categories array",
  "address": "Street address, Winnipeg, MB",
  "lat": 49.0000,
  "lng": -97.0000,
  "cost": "Free / $X / sliding scale",
  "hours": "Mon–Fri 9am–5pm",
  "amenities": ["24/7", "WiFi"],
  "phone": "",
  "website": "",
  "notes": "Anything a visitor should know before showing up.",
  "verified": false,
  "lastVerified": null
}
```

Distance from the museum is computed automatically at load time — you
don't need to calculate it. Remove the `example-resource` placeholder
once real entries are in.

**Accuracy matters.** This is meant to be reliable enough that someone
can act on it. Prefer verifying hours/cost/address by checking the
organization's own site or calling ahead over copying from a
secondhand source. Set `verified: true` and `lastVerified` (ISO date)
once you've confirmed a listing; unverified entries are flagged in the
UI so readers know to double check.

## Deployment

Deploys via GitHub Actions (`.github/workflows/deploy.yml`) on every
push to `main`. One-time setup: in the repo's **Settings → Pages**,
set **Build and deployment → Source** to **GitHub Actions**.
