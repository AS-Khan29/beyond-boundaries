/* 06 — Personal digital dashboard */
(function () {
  const DEMO = { name: "Sabiha", district: "kech", education: "bachelors", skills: ["english", "urdu", "balochi", "writing", "research"], interests: ["writing", "reading", "education"], device: "phone", connectivity: "medium", hours_per_week: 8, demo: true };
  const MENTORS = {
    Communicate: { name: "Sabiha", role: "Content writer · Kech", note: "Verified earner; reviews proposals every Friday." },
    Build: { name: "Hani", role: "Web developer · Gwadar", note: "Builds storefronts for coastal businesses." },
    Create: { name: "Shazia", role: "Social media manager · Lasbela", note: "Runs accounts for Hub retailers." },
    Organise: { name: "Nazia", role: "Virtual assistant · Quetta", note: "Supports overseas consultants; mentors newcomers." },
    Teach: { name: "Palwasha", role: "Online maths tutor · Loralai", note: "Teaches students in the Gulf." },
  };
  let radar, districtName = {};

  function progressKey(name, career) { return `progress:${(name || "you").toLowerCase()}:${career}`; }

  function render(sim, isDemo) {
    const rec = sim.recommendations[sim.chosen || 0], p = sim.profile;
    const name = p.name || "You";
    const key = progressKey(name, rec.id);
    let done = BB.store.get(key);
    if (!Array.isArray(done)) done = isDemo ? rec.roadmap.map((_, i) => i < rec.roadmap.length) : rec.roadmap.map(() => false);
    const pct = () => Math.round(100 * done.filter(Boolean).length / done.length);
    let mentor = MENTORS[rec.family] || MENTORS.Organise;
    if (mentor.name.toLowerCase() === name.toLowerCase()) mentor = MENTORS.Organise;

    const el = document.getElementById("dash");
    el.innerHTML = `
      <section class="d-profile">
        <div class="avatar">${BB.initials(name)}</div>
        <div><h3>${BB.esc(name)}</h3><p>${BB.esc(districtName[p.district] || "Balochistan")} · ${BB.esc(BB.label(p.education))} · ${p.device === "phone" ? "smartphone" : "laptop"} · ${p.hours_per_week} hrs/week
          ${isDemo ? ' <span class="tag sample">demo profile</span>' : ' <span class="tag ai">your simulation</span>'}</p></div>
        <div class="ptrack"><span class="tag ai">current track</span><b>${BB.esc(rec.title)}</b><span style="font:400 .8rem var(--mono);color:var(--electric)">${rec.match}% match</span></div>
      </section>
      <section class="d-assess"><h4>Skill assessment</h4><canvas id="radar" height="280"></canvas></section>
      <section class="d-road"><h4>Learning roadmap <span class="progress-line" style="width:55%"><span class="t"><i id="roadPct" style="width:${pct()}%"></i></span><b id="roadPctN">${pct()}%</b></span></h4>
        <div id="roadList">${rec.roadmap.map((ph, i) => `
          <label class="check"><input type="checkbox" data-i="${i}" ${done[i] ? "checked" : ""}>
            <span>${BB.esc(ph.phase)}<small>${BB.esc(ph.detail)}</small></span><span class="wk">wk ${ph.start_week}–${ph.start_week + ph.weeks - 1}</span></label>`).join("")}</div></section>
      <section class="d-port"><h4>Portfolio</h4><ul class="plist" id="plist"></ul></section>
      <section class="d-mentor"><h4>Mentorship</h4>
        <div class="mentor-card"><div class="avatar">${BB.initials(mentor.name)}</div><div><b>${mentor.name}</b><span>${mentor.role}</span></div></div>
        <p style="margin:0 0 10px;font-size:.88rem;color:var(--sand-2)">${mentor.note}</p>
        <p class="note">Matched on career family and region. <span class="tag sample">sample mentor</span></p></section>
      <section class="d-opps"><h4>Opportunities</h4><ul class="plist" id="olist"></ul></section>`;

    const paintDeps = () => {
      const n = pct();
      document.getElementById("roadPct").style.width = n + "%";
      document.getElementById("roadPctN").textContent = n + "%";
      const built = Math.floor(n / 100 * rec.projects.length + (n >= 50 ? .5 : 0));
      document.getElementById("plist").innerHTML = rec.projects.map((x, i) => {
        const st = i < built ? ["done", "complete"] : i === built ? ["doing", "in progress"] : ["todo", "next"];
        return `<li><span>${BB.esc(x)}</span><span class="st ${st[0]}">${st[1]}</span></li>`;
      }).join("");
      document.getElementById("olist").innerHTML = rec.opportunities.map((x, i) => {
        const ready = n >= 75 - i * 10;
        return `<li><span>${BB.esc(x)}</span><span class="st ${ready ? "done" : "todo"}">${ready ? "ready to apply" : "unlocks at " + (75 - i * 10) + "%"}</span></li>`;
      }).join("");
      const data = [rec.breakdown.skills, rec.breakdown.interests, rec.breakdown.feasibility, rec.breakdown.education, n];
      if (radar) { radar.data.datasets[0].data = data; radar.update(); return; }
      radar = new Chart(document.getElementById("radar"), {
        type: "radar",
        data: { labels: ["Skills fit", "Interest fit", "Feasibility", "Education", "Readiness"],
          datasets: [{ data, backgroundColor: "rgba(139,92,246,.25)", borderColor: "#8B5CF6", pointBackgroundColor: "#5AA9FF", borderWidth: 1.5 }] },
        options: { plugins: { legend: { display: false } }, scales: { r: { min: 0, max: 100, ticks: { display: false, stepSize: 25 },
          grid: { color: "rgba(233,223,207,.1)" }, angleLines: { color: "rgba(233,223,207,.1)" }, pointLabels: { color: "#CFC5B3", font: { family: "Plex", size: 11 } } } } },
      });
    };
    if (radar) { radar.destroy(); radar = null; }
    paintDeps();
    document.getElementById("roadList").addEventListener("change", e => {
      done[+e.target.dataset.i] = e.target.checked; BB.store.set(key, done); paintDeps();
    });
  }

  async function init() {
    const { districts } = await BB.districts();
    districts.forEach(d => districtName[d.id] = d.name);
    const last = BB.store.get("lastSim");
    if (last && last.recommendations) render({ ...last, chosen: 0 }, false);
    else render({ ...(await BB.api("/api/simulate", { method: "POST", body: DEMO })), chosen: 0 }, true);
    BB.on("simulated", sim => { render(sim, false); });
  }
  document.addEventListener("DOMContentLoaded", () => init().catch(console.error));
})();
