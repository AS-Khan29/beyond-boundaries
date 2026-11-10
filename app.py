"""Beyond Boundaries - Flask application.

Runs locally with `python app.py` and on Vercel's Python runtime (which picks
up the `app` object from this file).
"""
import os
import re

from flask import Flask, jsonify, render_template, request

from bb import db
from bb.careers import CAREERS, EDU_LEVELS, INTEREST_OPTIONS, SKILL_OPTIONS
from bb.engine import recommend
from bb.seed import JOURNEY, PROFILES, SAMPLE_NOTE

app = Flask(__name__, static_folder="public/static", static_url_path="/static", template_folder="templates")
app.json.sort_keys = False

CAREER_IDS = {c["id"] for c in CAREERS}
CAREER_TITLES = {c["id"]: c["title"] for c in CAREERS}


def _districts():
    rows = db.query("SELECT * FROM district_metrics ORDER BY year DESC")
    best = {}
    for r in rows:  # verified data always wins over sample data
        cur = best.get(r["district_id"])
        if cur is None or (cur["source_type"] != "verified" and r["source_type"] == "verified"):
            best[r["district_id"]] = r
    out = []
    for r in best.values():
        learners = r["learners"] or 0
        earning = r["earning"] or 0
        conversion = earning / learners if learners else 0
        # opportunity gap: high where access is weak AND conversion into earnings is low
        gap = round(100 * (1 - (0.5 * (r["connectivity"] or 0) / 100 + 0.5 * min(conversion / 0.25, 1))))
        out.append({
            "id": r["district_id"], "name": r["name"], "region": r["region"],
            "connectivity": r["connectivity"], "learners": learners, "earning": earning,
            "mentors": r["mentors"], "hubs": r["hubs"], "conversion": round(conversion * 100, 1),
            "learners_per_mentor": round(learners / r["mentors"]) if r["mentors"] else None,
            "gap": gap, "year": r["year"], "source_type": r["source_type"], "source_note": r["source_note"],
            "profiles": [p for p in PROFILES if p["district"] == r["district_id"]],
        })
    return sorted(out, key=lambda d: d["name"])


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/api/health")
def health():
    return jsonify(ok=True, database="mysql" if db._is_mysql() else "sqlite",
                   ai="claude" if os.environ.get("ANTHROPIC_API_KEY") else "scoring-model")


@app.get("/api/districts")
def districts():
    return jsonify(districts=_districts(), sample_note=SAMPLE_NOTE)


@app.get("/api/options")
def options():
    return jsonify(
        education=EDU_LEVELS, skills=SKILL_OPTIONS, interests=INTEREST_OPTIONS,
        careers=[{"id": c["id"], "title": c["title"], "family": c["family"]} for c in CAREERS])


@app.post("/api/simulate")
def simulate():
    p = request.get_json(silent=True) or {}
    profile = {
        "name": str(p.get("name", ""))[:40],
        "district": str(p.get("district", ""))[:64],
        "education": p.get("education") if p.get("education") in EDU_LEVELS else "intermediate",
        "skills": [s for s in p.get("skills", []) if s in SKILL_OPTIONS][:20],
        "interests": [s for s in p.get("interests", []) if s in INTEREST_OPTIONS][:20],
        "device": "laptop" if p.get("device") == "laptop" else "phone",
        "connectivity": p.get("connectivity") if p.get("connectivity") in ("low", "medium", "high") else "medium",
        "hours_per_week": max(2, min(int(p.get("hours_per_week") or 8), 30)),
        "languages": [str(x)[:20] for x in p.get("languages", [])][:6],
    }
    result = recommend(profile, use_ai=not p.get("demo"))
    if p.get("demo"):  # demo profiles rendered by the dashboard are not counted as visitor activity
        result["profile"] = profile
        return jsonify(result)
    try:
        top = result["recommendations"][0]
        db.query("INSERT INTO simulations (district_id,education,top_career,match_score,engine,created_at) VALUES (%s,%s,%s,%s,%s,%s)",
                 (profile["district"], profile["education"], top["id"], top["match"], result["engine"], db._now()), write=True)
    except Exception:
        app.logger.exception("could not log simulation")
    result["profile"] = profile
    return jsonify(result)


@app.get("/api/wall")
def wall():
    rows = db.query("SELECT id,name,district_id,career_id,message,is_seed,created_at FROM aspirations ORDER BY id DESC LIMIT 400")
    counts = {}
    for r in rows:
        counts[r["career_id"]] = counts.get(r["career_id"], 0) + 1
    total = db.query("SELECT COUNT(*) AS n FROM aspirations", one=True)["n"]
    return jsonify(items=rows, counts=counts, total=total, titles=CAREER_TITLES)


_bad = re.compile(r"https?://|www\.|<|>", re.I)


@app.post("/api/wall")
def wall_post():
    p = request.get_json(silent=True) or {}
    career = p.get("career_id")
    if career not in CAREER_IDS:
        return jsonify(error="Choose an ambition"), 400
    name = re.sub(r"\s+", " ", str(p.get("name", ""))).strip()[:30]
    msg = re.sub(r"\s+", " ", str(p.get("message", ""))).strip()[:100]
    if _bad.search(name) or _bad.search(msg):
        return jsonify(error="Links and markup aren't allowed on the wall"), 400
    district = str(p.get("district_id", ""))[:64]
    new_id = db.query("INSERT INTO aspirations (name,district_id,career_id,message,is_seed,created_at) VALUES (%s,%s,%s,%s,%s,%s)",
                      (name or None, district or None, career, msg or None, 0, db._now()), write=True)
    return jsonify(ok=True, id=new_id), 201


@app.get("/api/journey")
def journey():
    persona = next(p for p in PROFILES if p["id"] == JOURNEY["persona"])
    return jsonify(journey=JOURNEY, persona=persona)


@app.get("/api/analytics")
def analytics():
    ds = _districts()
    sims = db.query("SELECT COUNT(*) AS n FROM simulations", one=True)["n"]
    wall_n = db.query("SELECT COUNT(*) AS n FROM aspirations WHERE is_seed = 0", one=True)["n"]
    tot = lambda k: sum(d[k] or 0 for d in ds)
    verified = sum(1 for d in ds if d["source_type"] == "verified")
    return jsonify(
        districts=ds,
        totals={"learners": tot("learners"), "earning": tot("earning"), "mentors": tot("mentors"), "hubs": tot("hubs")},
        live={"simulations": sims, "wall_entries": wall_n},
        provenance={"verified_districts": verified, "sample_districts": len(ds) - verified, "note": SAMPLE_NOTE})


@app.errorhandler(Exception)
def on_error(e):
    code = getattr(e, "code", 500)
    if request.path.startswith("/api/"):
        if code == 500:
            app.logger.exception("api error")
        return jsonify(error=getattr(e, "description", "Server error")), code if isinstance(code, int) else 500
    return e if code != 500 else ("Server error", 500)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=os.environ.get("FLASK_DEBUG") == "1")
