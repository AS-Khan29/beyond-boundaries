# Beyond Boundaries

**An AI-powered digital opportunity ecosystem for girls of Balochistan.**

An interactive, large-screen-ready platform that maps the distance between girls' potential and digital freelancing opportunity across Balochistan, and shows the path across it.

## Modules

| # | Module | What it does |
|---|--------|--------------|
| 01 | **Interactive district map** | D3 choropleth of 27 districts (real geoBoundaries outlines). Switch between opportunity gap, connectivity, training, earning and mentor metrics. Select a district for its access profile and illustrative student personas. |
| 02 | **AI career simulator** | Visitors enter education, languages, skills, interests, device, internet quality and weekly hours. The engine ranks 12 digital careers, explains every score, builds a week-by-week roadmap scaled to her time, and suggests portfolio projects and first opportunities. |
| 03 | **From skills to earnings** | A complete sample journey (Sabiha, Kech): learn → build → apply → earn → verified, with month-by-month charts. |
| 04 | **Digital Independence Wall** | Visitors add their ambition; it joins a live force-directed network. Full-screen wall mode with a QR code so the audience can post from their phones. It refreshes every 6 seconds. |
| 05 | **Opportunity gap analytics** | Connectivity vs. conversion scatter, ranked gap index, and a data-provenance panel. |
| 06 | **Personal dashboard** | Skill-assessment radar, interactive roadmap checklist, portfolio status, mentor match and opportunities. |

**Stage mode:** press `S` (or the button) for larger type, then use ← → to move between sections on the big screen.

## Data honesty

All district figures, personas and the sample journey are **illustrative samples** and are labelled `sample` in the UI. District boundaries come from [geoBoundaries](https://www.geoboundaries.org/) (CC BY 4.0, pre-2021 district layout).

To load real data, insert rows into `district_metrics` with `source_type='verified'` and a `source_note` (see `schema.sql`). Verified rows replace the samples automatically, and the UI switches the label to `verified`.

## AI engine

1. **Scoring model** (always on): weighted matching on skills (42%), interests (30%), feasibility given device and bandwidth (18%), and education (10%), with plain-language reasons. See `bb/engine.py`.
2. **Claude mentor note** (optional): set `ANTHROPIC_API_KEY` and the top match gets a personalised note from Claude. Without the key, or if the call fails, a template note is used so the live demo never breaks. Override the model with `BB_AI_MODEL`.

## Stack

Python Flask · MySQL (PyMySQL) with SQLite fallback · D3.js · Chart.js · vanilla JS/CSS. Fonts and libraries are self-hosted, so the demo runs without CDNs.

## Run locally

```bash
pip install -r requirements.txt
python app.py            # http://localhost:5000
```

Without `DATABASE_URL` it uses a local SQLite file.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `mysql://user:pass@host:3306/dbname`. Enables MySQL. |
| `MYSQL_SSL` | `true` for hosted MySQL that requires TLS (e.g. Aiven, PlanetScale, TiDB Cloud). |
| `ANTHROPIC_API_KEY` | Optional. Enables Claude-written mentor notes. |
| `BB_AI_MODEL` | Optional model override. |

## Deploy on Vercel

1. Import this repository at [vercel.com/new](https://vercel.com/new). Vercel detects Flask from `app.py` and `requirements.txt`; no build settings are needed.
2. (Recommended) Add `DATABASE_URL` pointing to a hosted MySQL database. Without it the app runs on temporary SQLite in `/tmp`, so wall posts reset when the serverless instance recycles.
3. (Optional) Add `ANTHROPIC_API_KEY`.

Static assets live in `public/static/` and are served by Vercel's CDN at `/static/...`.

## Project structure

```
app.py                  Flask app and API routes
bb/engine.py            career recommendation engine (+ optional Claude layer)
bb/careers.py           12-career catalogue: skills, roadmaps, projects, opportunities
bb/db.py                MySQL / SQLite layer, auto-schema, seeding
bb/seed.py              sample district metrics, personas, journey
templates/index.html    single-page experience
public/static/          CSS, JS modules, GeoJSON, vendored libs and fonts
schema.sql              MySQL schema + example verified-data insert
```

## API

`GET /api/districts` · `GET /api/options` · `POST /api/simulate` · `GET|POST /api/wall` · `GET /api/journey` · `GET /api/analytics` · `GET /api/health`
