"""Career recommendation engine.

Two layers:
1. A transparent scoring model (always on). It weighs skill overlap,
   interest overlap, practical feasibility (device + connectivity) and
   education fit, and explains every score in plain language.
2. An optional generative layer. When ANTHROPIC_API_KEY is set, Claude writes
   a short personalised mentor note for the top match. If the key is missing
   or the call fails, the engine falls back to a template note, so the live
   demo never breaks.
"""
import json
import os
import urllib.request

from .careers import CAREERS, EDU_LEVELS

W_SKILL, W_INTEREST, W_FEAS, W_EDU = 0.42, 0.30, 0.18, 0.10
BANDWIDTH_RANK = {"low": 0, "medium": 1, "high": 2}
CONNECTIVITY_RANK = {"low": 0, "medium": 1, "high": 2}


def _overlap(user, wanted):
    user, wanted = set(user), set(wanted)
    if not wanted:
        return 0.0, []
    hits = sorted(user & wanted)
    # saturate after 3 matches: nobody needs every listed skill to start
    return min(len(hits) / min(3, len(wanted)), 1.0), hits


def _feasibility(career, device, connectivity):
    score, notes = 1.0, []
    if device == "phone" and not career["phone_ok"]:
        score -= 0.55
        notes.append("needs a laptop for most client work")
    elif device == "phone":
        notes.append("can be started on a smartphone")
    gap = BANDWIDTH_RANK[career["bandwidth"]] - CONNECTIVITY_RANK.get(connectivity, 1)
    if gap > 0:
        score -= 0.25 * gap
        notes.append("needs steadier internet than you have now - plan hub sessions")
    elif career["bandwidth"] == "low":
        notes.append("works on low bandwidth")
    return max(score, 0.0), notes


def _edu_fit(career, education):
    have = EDU_LEVELS.index(education) if education in EDU_LEVELS else 1
    need = EDU_LEVELS.index(career["min_edu"])
    if have >= need:
        return 1.0, None
    return max(0.0, 1 - 0.4 * (need - have)), f"usually starts after {career['min_edu']} - bridge it with a short course"


def _roadmap(career, hours_per_week):
    # roadmap durations assume ~8 hrs/week; scale to the learner's real time
    factor = 8 / max(2, min(int(hours_per_week or 8), 30))
    week, phases = 1, []
    for name, weeks, detail in career["roadmap"]:
        w = max(1, round(weeks * factor))
        phases.append({"phase": name, "start_week": week, "weeks": w, "detail": detail})
        week += w
    return phases, week - 1


def recommend(profile, top_n=3, use_ai=True):
    skills = [s.lower() for s in profile.get("skills", [])]
    interests = [i.lower() for i in profile.get("interests", [])]
    device = profile.get("device", "phone")
    connectivity = profile.get("connectivity", "medium")
    education = profile.get("education", "intermediate")
    hours = profile.get("hours_per_week", 8)

    results = []
    for c in CAREERS:
        s_score, s_hits = _overlap(skills, c["skills"])
        i_score, i_hits = _overlap(interests, c["interests"])
        f_score, f_notes = _feasibility(c, device, connectivity)
        e_score, e_note = _edu_fit(c, education)
        total = W_SKILL * s_score + W_INTEREST * i_score + W_FEAS * f_score + W_EDU * e_score
        reasons = []
        if s_hits:
            reasons.append("Your skills in " + ", ".join(h.replace("-", " ") for h in s_hits) + " carry over directly")
        if i_hits:
            reasons.append("Matches your interest in " + ", ".join(h.replace("-", " ") for h in i_hits))
        reasons += [n[0].upper() + n[1:] for n in f_notes]
        if e_note:
            reasons.append(e_note[0].upper() + e_note[1:])
        roadmap, weeks = _roadmap(c, hours)
        results.append({
            "id": c["id"], "title": c["title"], "family": c["family"], "pitch": c["pitch"],
            "match": min(97, round(total * 100)),  # never claim a perfect fit
            "breakdown": {"skills": round(s_score * 100), "interests": round(i_score * 100),
                          "feasibility": round(f_score * 100), "education": round(e_score * 100)},
            "reasons": reasons, "roadmap": roadmap, "weeks_to_ready": weeks,
            "projects": c["projects"], "opportunities": c["opportunities"],
            "starting_rate_usd": c["starting_rate_usd"],
        })
    results.sort(key=lambda r: r["match"], reverse=True)
    top = results[:top_n]
    note, mode = _mentor_note(profile, top[0]) if use_ai else (_template_note(profile, top[0]), "scoring-model")
    return {"recommendations": top, "mentor_note": note, "engine": mode}


def _template_note(profile, best):
    name = (profile.get("name") or "").strip() or "You"
    first = best["roadmap"][0]
    return (f"{name}, your strongest path right now is {best['title']}. "
            f"Start with '{first['phase']}' this week - {first['detail'][0].lower() + first['detail'][1:]} "
            f"In about {best['weeks_to_ready']} weeks at your pace you can have a portfolio ready to show clients. "
            f"Your first project: {best['projects'][0].lower()}.")


def _mentor_note(profile, best):
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return _template_note(profile, best), "scoring-model"
    prompt = (
        "You are a warm, practical digital-careers mentor for young women in Balochistan, Pakistan. "
        "Write a 3-sentence personal note (max 70 words) to this learner about her top recommended path. "
        "Be concrete, encouraging, and realistic. No headings, no lists, no emojis.\n\n"
        f"Learner profile: {json.dumps({k: profile.get(k) for k in ['name','district','education','skills','interests','device','connectivity','hours_per_week','languages']})}\n"
        f"Top path: {best['title']} - {best['pitch']}\n"
        f"First roadmap phase: {best['roadmap'][0]['phase']}: {best['roadmap'][0]['detail']}\n"
        f"Weeks to portfolio-ready at her pace: {best['weeks_to_ready']}\n"
        f"First project idea: {best['projects'][0]}"
    )
    body = json.dumps({
        "model": os.environ.get("BB_AI_MODEL", "claude-haiku-5-5"),
        "max_tokens": 220,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages", data=body, method="POST",
        headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            data = json.loads(r.read())
        text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()
        if text:
            return text, "claude"
    except Exception:
        pass
    return _template_note(profile, best), "scoring-model"
