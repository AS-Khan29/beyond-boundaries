/* 04 — Digital Independence Wall: a living network of aspirations */
(function () {
  const FAMILY_COLOR = { Create: "#8B5CF6", Communicate: "#5AA9FF", Organise: "#D9A75B", Build: "#3DD6D0", Teach: "#E8836B" };
  let careers = [], careerById = {}, districtName = {}, items = [], seen = new Set(), walls = [], maxId = 0;

  function makeWall(svgEl) {
    const svg = d3.select(svgEl);
    const linkG = svg.append("g"), nodeG = svg.append("g"), labelG = svg.append("g");
    let W = 0, H = 0, anchors = [], nodes = new Map(), sim;

    function layoutAnchors() {
      const r = svgEl.getBoundingClientRect(); W = r.width || 800; H = r.height || 600;
      svg.attr("viewBox", `0 0 ${W} ${H}`);
      const R = Math.min(W, H) * .36;
      anchors = careers.map((c, i) => {
        const a = (i / careers.length) * Math.PI * 2 - Math.PI / 2;
        return { id: "A:" + c.id, anchor: true, career: c, ang: a, fx: W / 2 + Math.cos(a) * R * (W > H ? 1.25 : 1), fy: H / 2 + Math.sin(a) * R };
      });
    }

    function update(list, fresh = new Set()) {
      if (!anchors.length) layoutAnchors();
      list.forEach(it => {
        if (nodes.has(it.id)) return;
        const a = anchors.find(x => x.career.id === it.career_id); if (!a) return;
        nodes.set(it.id, { ...it, x: fresh.has(it.id) ? W / 2 : a.fx + (Math.random() - .5) * 40, y: fresh.has(it.id) ? H + 20 : a.fy + (Math.random() - .5) * 40 });
      });
      const ns = [...nodes.values()];
      const links = ns.map(n => ({ source: n.id, target: "A:" + n.career_id, kind: "career" }));
      // cross-links: girls from the same district, across different careers
      const lastByDistrict = {};
      ns.sort((a, b) => a.id - b.id).forEach(n => {
        if (!n.district_id) return;
        const prev = lastByDistrict[n.district_id];
        if (prev && prev.career_id !== n.career_id) links.push({ source: n.id, target: prev.id, kind: "district" });
        lastByDistrict[n.district_id] = n;
      });
      const all = [...anchors, ...ns];
      const counts = d3.rollup(ns, v => v.length, d => d.career_id);

      linkG.selectAll("line").data(links, d => `${d.source.id || d.source}-${d.target.id || d.target}`).join("line")
        .attr("class", "wlink").style("stroke", d => d.kind === "district" ? "rgba(139,92,246,.09)" : null);
      nodeG.selectAll("circle").data(ns, d => d.id).join(
        enter => enter.append("circle").attr("class", d => "wnode" + (fresh.has(d.id) ? " new" : ""))
          .attr("r", d => d.is_seed ? 3 : 4.8)
          .attr("fill", d => FAMILY_COLOR[careerById[d.career_id]?.family] || "#5AA9FF")
          .attr("fill-opacity", d => d.is_seed ? .75 : 1)
          .call(s => s.append("title").text(d => `${d.name || "Someone"}${d.district_id ? " · " + (districtName[d.district_id] || "") : ""} — ${careerById[d.career_id]?.title || ""}${d.message ? ": " + d.message : ""}`)));
      const lab = labelG.selectAll("g").data(anchors, d => d.id).join(enter => {
        const g = enter.append("g");
        g.append("circle").attr("r", 7).attr("fill", "none").attr("stroke", d => FAMILY_COLOR[d.career.family]).attr("stroke-width", 1.2);
        g.append("circle").attr("r", 2.5).attr("fill", d => FAMILY_COLOR[d.career.family]);
        const off = 46, tx = d => Math.cos(d.ang) * off, ty = d => Math.sin(d.ang) * off;
        const ta = d => Math.abs(Math.cos(d.ang)) < .3 ? "middle" : Math.cos(d.ang) > 0 ? "start" : "end";
        g.append("text").attr("class", "anchor-lbl").attr("x", tx).attr("y", d => ty(d) + 4).style("text-anchor", ta).text(d => d.career.title.replace(/ \(.*\)/, ""));
        g.append("text").attr("class", "anchor-n").attr("x", tx).attr("y", d => ty(d) + 18).style("text-anchor", ta);
        return g;
      });
      lab.attr("transform", d => `translate(${d.fx},${d.fy})`);
      lab.select(".anchor-n").text(d => counts.get(d.career.id) || 0);

      if (sim) sim.stop();
      sim = d3.forceSimulation(all)
        .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.kind === "district" ? 90 : 18 + Math.random() * 26).strength(d => d.kind === "district" ? .02 : .5))
        .force("charge", d3.forceManyBody().strength(d => d.anchor ? -60 : -7))
        .force("collide", d3.forceCollide(d => d.anchor ? 14 : 5.5))
        .force("x", d3.forceX(W / 2).strength(.005)).force("y", d3.forceY(H / 2).strength(.005))
        .alpha(fresh.size ? .5 : 1).alphaDecay(.02)
        .on("tick", () => {
          linkG.selectAll("line").attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
          nodeG.selectAll("circle").attr("cx", d => d.x = Math.max(6, Math.min(W - 6, d.x))).attr("cy", d => d.y = Math.max(6, Math.min(H - 6, d.y)));
        });
    }
    function resize() { layoutAnchors(); nodes.clear(); linkG.html(""); nodeG.html(""); labelG.html(""); update(items); }
    return { update, resize };
  }

  function feed(el, list, n = 8) {
    el.innerHTML = list.slice(0, n).map(it => `<li><b>${BB.esc(it.name || "A girl")}</b>${it.district_id ? " from " + BB.esc(districtName[it.district_id] || "") : ""} → ${BB.esc(careerById[it.career_id]?.title || "")}
      ${it.message ? `<br><q>${BB.esc(it.message)}</q>` : ""}<span>${timeAgo(it.created_at)}</span></li>`).join("");
  }
  function timeAgo(iso) {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago"; return Math.floor(s / 86400) + " d ago";
  }
  function qr(el, size) {
    try {
      const q = qrcode(0, "M"); q.addData(location.origin + "/#wall"); q.make();
      el.innerHTML = q.createSvgTag({ cellSize: size, margin: 0 });
    } catch { el.textContent = location.host; }
  }

  async function refresh() {
    const data = await BB.api("/api/wall");
    items = data.items;
    const fresh = new Set(items.filter(i => !seen.has(i.id) && seen.size).map(i => i.id));
    items.forEach(i => seen.add(i.id));
    walls.forEach(w => w.update(items, fresh));
    document.getElementById("wallTotal").textContent = BB.fmt(data.total);
    document.getElementById("wallTotalBig").textContent = BB.fmt(data.total);
    feed(document.getElementById("wallFeed"), items);
    feed(document.getElementById("wallFeedBig"), items, 10);
  }

  async function init() {
    const [opt, { districts }] = await Promise.all([BB.options(), BB.districts()]);
    careers = opt.careers; careers.forEach(c => careerById[c.id] = c);
    districts.forEach(d => districtName[d.id] = d.name);
    document.getElementById("wallCareers").innerHTML = careers.map(c => `<button type="button" data-v="${c.id}">${BB.esc(c.title.replace(/ \(.*\)/, ""))}</button>`).join("");
    document.getElementById("wallDistrict").innerHTML = `<option value="">—</option>` + districts.map(d => `<option value="${d.id}">${BB.esc(d.name)}</option>`).join("");

    walls.push(makeWall(document.getElementById("wallSvg")));
    await refresh();
    qr(document.getElementById("qr"), 3);
    setInterval(() => { if (!document.hidden) refresh().catch(() => {}); }, 6000);

    const f = document.getElementById("wallForm"), msg = document.getElementById("wallMsg");
    document.getElementById("wallCareers").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      document.querySelectorAll("#wallCareers button").forEach(x => x.classList.toggle("on", x === b));
    });
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const career = document.querySelector("#wallCareers button.on")?.dataset.v;
      msg.className = "form-msg";
      if (!career) { msg.textContent = "Choose an ambition first."; msg.classList.add("err"); return; }
      try {
        await BB.api("/api/wall", { method: "POST", body: { career_id: career, name: f.name.value, district_id: f.district_id.value, message: f.message.value } });
        msg.textContent = "You're on the wall. Welcome to the network.";
        f.message.value = "";
        await refresh();
      } catch (err) { msg.textContent = err.message; msg.classList.add("err"); }
    });

    BB.on("prefill-wall", ({ career, name, district }) => {
      document.querySelectorAll("#wallCareers button").forEach(x => x.classList.toggle("on", x.dataset.v === career));
      if (name) f.name.value = name; if (district) f.district_id.value = district;
      f.message.focus({ preventScroll: true });
    });

    const ov = document.getElementById("wallOverlay");
    let big;
    document.getElementById("wallFull").addEventListener("click", async () => {
      ov.hidden = false;
      try { await ov.requestFullscreen?.(); } catch { /* fullscreen not allowed */ }
      if (!big) { big = makeWall(document.getElementById("wallBig")); walls.push(big); qr(document.getElementById("qrBig"), 6); }
      setTimeout(() => big.resize(), 60);
    });
    const close = () => { ov.hidden = true; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
    document.getElementById("wallClose").addEventListener("click", close);
    addEventListener("keydown", e => { if (e.key === "Escape" && !ov.hidden) close(); });
    document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && !ov.hidden) ov.hidden = true; });
  }
  document.addEventListener("DOMContentLoaded", () => init().catch(console.error));
})();
