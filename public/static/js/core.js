/* Beyond Boundaries — shared core: data loading, navigation, hero, stage mode */
window.BB = (function () {
  const api = async (path, opts = {}) => {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" }, ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  };

  const once = {};
  const cached = (key, fn) => (once[key] ||= fn());
  const geo = () => cached("geo", () => fetch("/static/data/balochistan-districts.geojson").then(r => r.json()));
  const districts = () => cached("districts", () => api("/api/districts"));
  const options = () => cached("options", () => api("/api/options"));

  const fmt = n => (n == null ? "—" : Number(n).toLocaleString("en-US"));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const label = s => String(s).replace(/-/g, " ");
  const initials = n => (n || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem("bb:" + k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem("bb:" + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  const bus = new EventTarget();
  const on = (e, f) => bus.addEventListener(e, ev => f(ev.detail));
  const emit = (e, d) => bus.dispatchEvent(new CustomEvent(e, { detail: d }));

  // count-up animation for big figures
  function countUp(el, to, dur = 1200) {
    const from = 0, t0 = performance.now();
    const step = t => {
      const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- navigation, reveal, stage mode ---------- */
  function initChrome() {
    const top = document.getElementById("topbar");
    const links = [...document.querySelectorAll(".sections a")];
    const secs = links.map(a => document.querySelector(a.getAttribute("href")));
    addEventListener("scroll", () => top.classList.toggle("solid", scrollY > 40), { passive: true });
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));
    }), { rootMargin: "-45% 0px -50% 0px" });
    secs.forEach(s => io.observe(s));

    document.querySelectorAll(".chapter-head, .map-stage, .sim, .journey, .wall, .gap, .dash").forEach(el => el.classList.add("reveal"));
    const rv = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); rv.unobserve(e.target); } }), { threshold: .08 });
    document.querySelectorAll(".reveal").forEach(el => rv.observe(el));

    const order = ["top", ...secs.map(s => s.id)];
    const toggleStage = () => document.documentElement.classList.toggle("stage");
    document.getElementById("stageToggle").addEventListener("click", toggleStage);
    addEventListener("keydown", e => {
      if (e.target.closest("input, select, textarea")) return;
      if (e.key === "s" || e.key === "S") toggleStage();
      if (document.documentElement.classList.contains("stage") && ["ArrowRight", "ArrowLeft", "PageDown", "PageUp"].includes(e.key)) {
        e.preventDefault();
        const cur = order.findIndex(id => { const r = document.getElementById(id).getBoundingClientRect(); return r.top <= 120 && r.bottom > 120; });
        const nxt = Math.max(0, Math.min(order.length - 1, cur + (/Right|Down/.test(e.key) ? 1 : -1)));
        document.getElementById(order[nxt]).scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  /* ---------- hero: province network flowing outward ---------- */
  async function initHero() {
    const svg = d3.select("#heroGeo");
    const g = await geo();
    const draw = () => {
      svg.selectAll("*").remove();
      const hero = document.querySelector(".hero"), stats = document.getElementById("heroStats");
      const W = hero.clientWidth, H = hero.clientHeight;
      const S = stats.offsetTop - 24;            // keep the drawing above the stats row
      svg.attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio", "xMidYMid slice");
      const wide = W > 760;
      const box = wide ? [[W * .6, 150], [W * .8, S - 70]] : [[W * .1, 100], [W * .9, H * .5]];
      const proj = d3.geoMercator().fitExtent(box, g);
      const path = d3.geoPath(proj);
      const defs = svg.append("defs");
      const grad = defs.append("linearGradient").attr("id", "arcGrad").attr("x1", 0).attr("x2", 1);
      grad.append("stop").attr("offset", 0).attr("stop-color", "#5AA9FF");
      grad.append("stop").attr("offset", 1).attr("stop-color", "#8B5CF6");
      svg.append("g").selectAll("path").data(g.features).join("path").attr("class", "dist").attr("d", path);
      const pts = g.features.map(f => proj([f.properties.cx, f.properties.cy]));

      // The world beyond: each destination sits in its true map direction from Balochistan.
      // Karachi is close enough to plot at its real position; distant cities sit on a ring
      // around the province, along the real compass bearing (same Mercator projection).
      const cities = [];
      if (wide) {
        const [cx, cy] = path.centroid(g);
        const Rx = Math.max(160, Math.min(W - cx - 110, cx - W * .46));
        const Ry = Math.max(140, Math.min(cy - 70, S - cy + 10));
        const DEST = [["Karachi", 67.01, 24.86, true], ["Dubai", 55.27, 25.2], ["London", -0.13, 51.5], ["Singapore", 103.82, 1.35]];
        DEST.forEach(([name, lon, lat, near]) => {
          const [px, py] = proj([lon, lat]);
          if (near) { cities.push({ name, x: px, y: py, ux: 0, uy: 1 }); return; }
          const dx = px - cx, dy = py - cy, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
          cities.push({ name, x: cx + ux * Rx, y: cy + uy * Ry, ux, uy });
        });
      }
      const arcs = svg.append("g");
      const rnd = d3.randomLcg(7);
      if (cities.length) pts.forEach((p, i) => {
        if (i % 2) return;
        const c = cities[Math.floor(rnd() * cities.length)];
        const mx = (p[0] + c.x) / 2, my = (p[1] + c.y) / 2;
        const len = Math.hypot(c.x - p[0], c.y - p[1]) || 1;
        let nx = -(c.y - p[1]) / len, ny = (c.x - p[0]) / len;
        if (ny > 0) { nx = -nx; ny = -ny; }         // bow every arc upward, like a flight path
        const k = len * (.18 + rnd() * .12);
        arcs.append("path").attr("class", "arc").attr("stroke", "url(#arcGrad)")
          .attr("d", `M${p[0]},${p[1]} Q${mx + nx * k},${my + ny * k} ${c.x},${c.y}`)
          .style("opacity", .25 + rnd() * .45).style("animation-delay", `${-rnd() * 3}s`);
      });
      const nodes = svg.append("g");
      pts.forEach((p, i) => {
        nodes.append("circle").attr("class", "pulse").attr("cx", p[0]).attr("cy", p[1]).attr("r", 4).style("animation-delay", `${(i * .37) % 3.2}s`);
        nodes.append("circle").attr("class", "node").attr("cx", p[0]).attr("cy", p[1]).attr("r", 2.2);
      });
      const cg = svg.append("g");
      cities.forEach(c => {
        cg.append("circle").attr("class", "city-dot").attr("cx", c.x).attr("cy", c.y).attr("r", 3.2);
        const anchor = c.ux > .3 ? "start" : c.ux < -.3 ? "end" : "middle";
        cg.append("text").attr("class", "city").attr("text-anchor", anchor)
          .attr("x", c.x + c.ux * 12).attr("y", c.y + (c.uy > .5 ? 18 : c.uy < -.5 ? -10 : 4)).text(c.name);
      });
    };
    draw();
    let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(draw, 200); });

    try {
      const [{ districts: ds }, wall] = await Promise.all([districts(), api("/api/wall")]);
      const set = (k, v) => countUp(document.querySelector(`#heroStats [data-k=${k}]`), v);
      set("districts", ds.length);
      set("learners", d3.sum(ds, d => d.learners));
      set("earning", d3.sum(ds, d => d.earning));
      set("wall", wall.total);
    } catch (e) { console.warn(e); }

    api("/api/health").then(h => {
      document.getElementById("sysInfo").textContent = `Engine: ${h.ai === "claude" ? "Claude + scoring model" : "scoring model"} · Data store: ${h.database}`;
    }).catch(() => {});
  }

  document.addEventListener("DOMContentLoaded", () => { initChrome(); initHero(); });

  return { api, geo, districts, options, fmt, esc, label, initials, store, on, emit, countUp };
})();
