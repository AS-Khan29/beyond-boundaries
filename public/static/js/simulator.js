/* 02 — AI digital career simulator */
(function () {
  const LANGS = ["balochi", "brahui", "pashto", "urdu", "english"];
  const EDU = { middle: "Middle", matric: "Matric", intermediate: "Intermediate", bachelors: "Bachelor's", masters: "Master's" };
  const PRESETS = {
    gulbano: { name: "Gul Bano", district: "khuzdar", education: "intermediate", skills: ["urdu", "english", "typing", "attention-to-detail"], interests: ["technology", "ai", "organising"], device: "phone", connectivity: "medium", hours_per_week: 6 },
    hani: { name: "Hani", district: "gwadar", education: "bachelors", skills: ["balochi", "english", "coding", "html", "maths", "problem-solving"], interests: ["technology", "building", "design", "business"], device: "laptop", connectivity: "high", hours_per_week: 15 },
    zarghuna: { name: "Zarghuna", district: "pishin", education: "matric", skills: ["pashto", "urdu", "english", "writing"], interests: ["languages", "health", "culture"], device: "phone", connectivity: "low", hours_per_week: 8 },
  };
  const form = () => document.getElementById("simForm");
  const out = () => document.getElementById("simOut");
  let last = null;

  function chip(v, field) { return `<button type="button" data-v="${v}" data-field="${field}">${BB.label(v)}</button>`; }

  function readForm() {
    const f = form(), val = field => [...f.querySelectorAll(`[data-field="${field}"] button.on`)].map(b => b.dataset.v);
    return {
      name: f.name.value.trim(), district: f.district.value,
      education: val("education")[0] || "intermediate",
      skills: [...new Set(val("skills"))], interests: val("interests"),
      device: val("device")[0] || "phone", connectivity: val("connectivity")[0] || "medium",
      hours_per_week: +f.hours_per_week.value,
    };
  }

  function applyPreset(p) {
    const f = form();
    f.name.value = p.name; f.district.value = p.district;
    f.hours_per_week.value = p.hours_per_week; document.getElementById("hoursOut").textContent = p.hours_per_week;
    f.querySelectorAll("[data-field] button").forEach(b => {
      const fld = b.dataset.field || b.closest("[data-field]").dataset.field, v = b.dataset.v, pv = p[fld];
      b.classList.toggle("on", Array.isArray(pv) ? pv.includes(v) : pv === v);
    });
  }

  function ring(pct) {
    const r = 58, c = 2 * Math.PI * r;
    return `<div class="ring"><svg width="132" height="132" viewBox="0 0 132 132">
      <defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stop-color="#5AA9FF"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient></defs>
      <circle cx="66" cy="66" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="7"/>
      <circle class="ring-arc" cx="66" cy="66" r="${r}" fill="none" stroke="url(#rg)" stroke-width="7" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${c}" data-to="${c * (1 - pct / 100)}" style="transition:stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)"/>
      </svg><b>${pct}%<small>match</small></b></div>`;
  }

  function render(res, idx = 0) {
    const recs = res.recommendations, r = recs[idx], others = recs.filter((_, i) => i !== idx);
    const total = r.weeks_to_ready, wpct = 100 / total;
    const engineTag = res.engine === "claude" ? `<span class="tag ai">Claude · AI mentor</span>` : `<span class="tag ai">AI scoring model</span>`;
    out().innerHTML = `
      <div class="top-match">${ring(r.match)}
        <div><div class="tm-family">${BB.esc(r.family)} · from ${BB.esc(r.starting_rate_usd)} USD</div>
        <h3 class="tm-title">${BB.esc(r.title)}</h3><p class="tm-pitch">${BB.esc(r.pitch)}</p></div></div>
      <div class="breakdown">${Object.entries(r.breakdown).map(([k, v]) => `<div><span>${k}</span><b>${v}</b><div class="t"><i style="width:${v}%"></i></div></div>`).join("")}</div>
      ${idx === 0 ? `<blockquote class="mentor-note">${engineTag}${BB.esc(res.mentor_note)}</blockquote>` : ""}
      <ul class="reasons">${r.reasons.map(x => `<li>${BB.esc(x)}</li>`).join("")}</ul>
      <p class="sub">Learning roadmap <span>${total} weeks at ${res.profile.hours_per_week} hrs/week</span></p>
      <div class="gantt">${r.roadmap.map(p => `
        <div class="g"><span>${BB.esc(p.phase)}</span>
          <div class="lane" style="--w:${wpct}%"><div class="bar" style="left:${(p.start_week - 1) * wpct}%;width:${p.weeks * wpct}%">wk ${p.start_week}–${p.start_week + p.weeks - 1}</div></div>
          <div class="detail">${BB.esc(p.detail)}</div></div>`).join("")}</div>
      <div class="two-col">
        <div><p class="sub">Portfolio projects</p><ul>${r.projects.map(x => `<li>${BB.esc(x)}</li>`).join("")}</ul></div>
        <div><p class="sub">First opportunities</p><ul>${r.opportunities.map(x => `<li>${BB.esc(x)}</li>`).join("")}</ul></div>
      </div>
      <p class="sub">Other strong paths</p>
      <div class="alts">${others.map(o => `<button type="button" class="alt" data-id="${o.id}"><span>${BB.esc(o.title)}</span><b>${o.match}%</b></button>`).join("")}</div>
      <div class="sim-actions">
        <a class="btn primary small" href="#dashboard" id="toDash">Open my dashboard</a>
        <a class="btn ghost small" href="#wall" id="toWall">Put this dream on the wall</a>
      </div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const a = out().querySelector(".ring-arc"); a.style.strokeDashoffset = a.dataset.to;
    }));
    out().querySelectorAll(".alt").forEach(b => b.addEventListener("click", () => render(res, recs.findIndex(x => x.id === b.dataset.id))));
    out().querySelector("#toWall").addEventListener("click", () => BB.emit("prefill-wall", { career: r.id, name: res.profile.name, district: res.profile.district }));
    out().querySelector("#toDash").addEventListener("click", () => BB.emit("simulated", { ...res, chosen: idx }));
  }

  async function run(e) {
    e && e.preventDefault();
    const btn = document.getElementById("simGo"), body = readForm();
    if (!body.skills.length && !body.interests.length) {
      out().innerHTML = `<div class="sim-empty"><p>Pick at least one skill or interest so the engine has something to work with.</p></div>`; return;
    }
    btn.disabled = true; btn.textContent = "Thinking…"; out().classList.add("loading");
    try {
      last = await BB.api("/api/simulate", { method: "POST", body });
      render(last);
      BB.store.set("lastSim", last);
      BB.emit("simulated", { ...last, chosen: 0, silent: true });
      if (innerWidth < 1100) out().scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      out().innerHTML = `<div class="sim-empty"><p>${BB.esc(err.message)}</p></div>`;
    } finally { btn.disabled = false; btn.textContent = "Generate my path"; out().classList.remove("loading"); }
  }

  async function init() {
    const [opt, { districts }] = await Promise.all([BB.options(), BB.districts()]);
    const f = form();
    f.district.innerHTML = `<option value="">Choose…</option>` + districts.map(d => `<option value="${d.id}">${BB.esc(d.name)}</option>`).join("");
    document.getElementById("eduSeg").innerHTML = opt.education.map(v => `<button type="button" data-v="${v}" class="${v === "intermediate" ? "on" : ""}">${EDU[v]}</button>`).join("");
    f.querySelector('[data-group="lang"]').innerHTML = LANGS.map(v => chip(v, "skills")).join("");
    f.querySelector('[data-group="skill"]').innerHTML = opt.skills.filter(s => !LANGS.includes(s)).map(v => chip(v, "skills")).join("");
    f.querySelector('[data-field="interests"]').innerHTML = opt.interests.map(v => chip(v, "interests")).join("");

    f.addEventListener("click", e => {
      const b = e.target.closest("button[data-v]"); if (!b) return;
      const group = b.parentElement;
      if (group.classList.contains("seg")) group.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
      else b.classList.toggle("on");
    });
    document.getElementById("hoursIn").addEventListener("input", e => document.getElementById("hoursOut").textContent = e.target.value);
    f.addEventListener("submit", run);
    document.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => { applyPreset(PRESETS[b.dataset.preset]); run(); }));
  }
  document.addEventListener("DOMContentLoaded", () => init().catch(console.error));
})();
