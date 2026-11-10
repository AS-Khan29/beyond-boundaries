/* 01 — Interactive district map */
(function () {
  const METRICS = {
    gap:          { label: "Opportunity gap index", fmt: v => v, ramp: ["#1B2A6B", "#5A47B8", "#B9659E", "#F0A868"], unit: "/100" },
    connectivity: { label: "Connectivity index",    fmt: v => v, ramp: ["#111A46", "#24408F", "#3D7BFF", "#A9CCFF"], unit: "/100" },
    learners:     { label: "Girls in training",     fmt: BB.fmt, ramp: ["#111A46", "#2A3A99", "#6B5CF0", "#C6B8FF"], unit: "", log: true },
    earning:      { label: "Girls earning online",  fmt: BB.fmt, ramp: ["#111A46", "#1F4E9C", "#2FA6C9", "#9FF0E0"], unit: "", log: true },
    mentors:      { label: "Active mentors",        fmt: BB.fmt, ramp: ["#111A46", "#3B3591", "#8B5CF6", "#E0C9FF"], unit: "", log: true },
  };
  let metric = "gap", selected = null, byId = {}, geo, proj, path, svg, tip;

  function scaleFor(m, ds) {
    const M = METRICS[m], vals = ds.map(d => d[m]);
    const ext = d3.extent(vals);
    const norm = M.log ? d3.scaleLog().domain([Math.max(1, ext[0]), ext[1]]).clamp(true) : d3.scaleLinear().domain(ext);
    const interp = d3.interpolateRgbBasis(M.ramp);
    return { color: v => interp(norm(Math.max(1, v))), ext, interp };
  }

  function paint() {
    const ds = Object.values(byId), s = scaleFor(metric, ds);
    svg.selectAll(".d").attr("fill", f => { const d = byId[f.properties.id]; return d ? s.color(d[metric]) : "#222"; });
    const M = METRICS[metric];
    document.getElementById("mapLegend").innerHTML =
      `<span>${M.fmt(s.ext[0])}</span><span class="ramp" style="background:linear-gradient(90deg,${M.ramp.join(",")})"></span><span>${M.fmt(s.ext[1])}${M.unit}</span><span>· ${M.label}</span>`;
  }

  function select(id, scroll) {
    selected = id;
    svg.classed("has-sel", !!id);
    svg.selectAll(".d").classed("sel", f => f.properties.id === id);
    svg.selectAll(".d.sel").raise();
    svg.select(".labels").raise();
    drawLinks();
    renderPanel(byId[id]);
    if (scroll) document.getElementById("map").scrollIntoView({ behavior: "smooth" });
  }

  function drawLinks() {
    const g = svg.select(".links").html("");
    if (!selected) return;
    const f = geo.features.find(x => x.properties.id === selected);
    const q = geo.features.find(x => x.properties.id === "quetta");
    const a = proj([f.properties.cx, f.properties.cy]), b = proj([q.properties.cx, q.properties.cy]);
    if (selected !== "quetta") {
      const mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - 40;
      g.append("path").attr("class", "link").attr("d", `M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`);
    }
    const d = byId[selected], W = +svg.attr("data-w");
    const n = Math.max(1, Math.min(8, Math.round(d.earning / 12)));
    for (let i = 0; i < n; i++) {
      const tx = W - 4, ty = 30 + i * 26;
      g.append("path").attr("class", "out").style("animation-delay", `${-i * .3}s`)
        .attr("d", `M${a[0]},${a[1]} Q${(a[0] + tx) / 2},${Math.min(a[1], ty) - 60} ${tx},${ty}`);
    }
    g.append("circle").attr("cx", a[0]).attr("cy", a[1]).attr("r", 4).attr("fill", "#EDE4D3");
  }

  function bar(label, pct, value) {
    return `<div class="abar"><span>${label}</span><span class="t"><i data-w="${Math.round(Math.max(3, Math.min(100, pct)))}"></i></span><b>${value}</b></div>`;
  }

  function renderPanel(d) {
    const el = document.getElementById("districtPanel");
    if (!d) { el.innerHTML = `<p class="dp-empty">Select a district on the map.</p>`; return; }
    const tag = d.source_type === "verified" ? `<span class="tag verified">verified · ${d.year}</span>` : `<span class="tag sample">sample data</span>`;
    const lpm = d.learners_per_mentor;
    el.innerHTML = `
      <div class="dp-region">${BB.esc(d.region)} Balochistan ${tag}</div>
      <h3 class="dp-name">${BB.esc(d.name)}</h3>
      <dl class="dp-figs">
        <div><dt>In training</dt><dd>${BB.fmt(d.learners)}</dd></div>
        <div><dt>Earning online</dt><dd>${BB.fmt(d.earning)}<small>${d.conversion}%</small></dd></div>
        <div><dt>Mentors</dt><dd>${BB.fmt(d.mentors)}</dd></div>
        <div><dt>Gap index</dt><dd style="color:var(--brass)">${d.gap}<small>/100</small></dd></div>
      </dl>
      <div class="access"><h4>Access to opportunity</h4>
        ${bar("Connectivity", d.connectivity, d.connectivity)}
        ${bar("Training hubs", d.hubs / 5 * 100, d.hubs)}
        ${bar("Mentorship", lpm ? 30 / lpm * 100 : 0, lpm ? "1:" + lpm : "none")}
        ${bar("Conversion", d.conversion / 25 * 100, d.conversion + "%")}
      </div>
      <div class="dp-people"><h4>Girls from ${BB.esc(d.name)}</h4>
        ${d.profiles.length ? d.profiles.map(p => `
          <div class="person"><div class="avatar">${BB.initials(p.name)}</div>
            <div><p><strong>${BB.esc(p.name)}, ${p.age}</strong><span class="stage-pill">${BB.esc(p.stage)}</span></p>
            <p>${BB.esc(p.story)}</p></div></div>`).join("")
          : `<p class="dp-empty">No sample profile yet for this district — the first story here could be yours.</p>`}
        ${d.profiles.length ? `<p class="dp-empty" style="font-size:.74rem;margin-top:8px">Illustrative personas, not real individuals.</p>` : ""}
      </div>`;
    requestAnimationFrame(() => el.querySelectorAll(".abar i").forEach(i => i.style.width = i.dataset.w + "%"));
  }

  async function init() {
    svg = d3.select("#mapSvg"); tip = document.getElementById("mapTip");
    const [g, { districts }] = await Promise.all([BB.geo(), BB.districts()]);
    geo = g; districts.forEach(d => byId[d.id] = d);
    const W = 760, H = 660;
    svg.attr("viewBox", `0 0 ${W} ${H}`).attr("data-w", W);
    proj = d3.geoMercator().fitExtent([[10, 10], [W - 90, H - 10]], geo);
    path = d3.geoPath(proj);
    svg.append("g").selectAll("path").data(geo.features).join("path")
      .attr("class", "d").attr("d", path).attr("tabindex", 0)
      .attr("aria-label", f => f.properties.name)
      .on("click", (e, f) => select(f.properties.id))
      .on("keydown", (e, f) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(f.properties.id); } })
      .on("mousemove", (e, f) => {
        const d = byId[f.properties.id], box = svg.node().parentNode.getBoundingClientRect();
        tip.hidden = false; tip.style.left = (e.clientX - box.left) + "px"; tip.style.top = (e.clientY - box.top) + "px";
        tip.innerHTML = `<b>${BB.esc(d.name)}</b>${METRICS[metric].label}: <span>${METRICS[metric].fmt(d[metric])}</span>`;
      })
      .on("mouseleave", () => tip.hidden = true);
    svg.append("g").attr("class", "links");
    const lg = svg.append("g").attr("class", "labels");
    geo.features.forEach(f => {
      const d = byId[f.properties.id], [x, y] = proj([f.properties.cx, f.properties.cy]);
      if (d.hubs > 0) lg.append("rect").attr("class", "hub").attr("x", x - 2.5).attr("y", y - 2.5).attr("width", 5).attr("height", 5).attr("transform", `rotate(45 ${x} ${y})`);
      lg.append("text").attr("class", "lbl").attr("x", x).attr("y", y + 14).text(f.properties.name);
    });
    paint();
    select("kech");

    document.getElementById("metricSwitch").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      metric = b.dataset.m;
      document.querySelectorAll("#metricSwitch button").forEach(x => x.classList.toggle("on", x === b));
      paint();
    });
    BB.on("select-district", id => select(id, true));
  }
  document.addEventListener("DOMContentLoaded", () => init().catch(e => {
    console.error(e); document.getElementById("districtPanel").innerHTML = `<p class="dp-empty">Map data could not load.</p>`;
  }));
})();
